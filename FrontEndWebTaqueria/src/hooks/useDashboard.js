import { useMemo } from 'react';
import useOrders from './useOrders';
import { useEmployees } from './useEmployees';
import useTables from './useTables';
import { useInventory } from './useInventory';
import useClients from './useClients';
import useInvoices from './useInvoices';
import { useAuth } from './auth/useAuth';
import { hasPermission } from '../constants/permissions';
import { translateEmployeeType } from '../constants/employeeTypes';

// Etiquetas en español para el estado del pedido (ajustar si el enum del back cambia)
const ORDER_STATUS_LABELS = {
  pending: 'PENDIENTE',
  preparing: 'PREPARANDO',
  atrasado: 'ATRASADO',
  ready: 'LISTO',
  delivered: 'COMPLETADO',
  cancelled: 'CANCELADO',
};

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// Decide si un empleado está trabajando "ahora mismo", según los días y el
// horario que le configuró el admin. Si todavía no le configuraron un
// horario (caso normal mientras esa parte no se usa aún), caemos de
// respaldo al estado general de su ficha (activo/inactivo).
const isEmployeeWorkingNow = (emp) => {
  const work = emp.workInfo || {};
  const days = work.workDays || [];
  const hasSchedule = days.length > 0 && work.scheduleStart && work.scheduleEnd;

  if (!hasSchedule) {
    return work.status === 'active';
  }

  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  if (!days.includes(todayName)) return false;

  const isWeekend = todayName === 'sabado' || todayName === 'domingo';
  const useWeekend = isWeekend && work.weekendScheduleEnabled && work.weekendScheduleStart && work.weekendScheduleEnd;
  const start = useWeekend ? work.weekendScheduleStart : work.scheduleStart;
  const end = useWeekend ? work.weekendScheduleEnd : work.scheduleEnd;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Turno que cruza la medianoche (ej. 22:00 a 06:00)
  if (endMinutes < startMinutes) {
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
};

// Hook exclusivo para el Dashboard: combina orders, invoices, employees,
// tables, inventory y clients en los datos que necesitan las pestañas
// "Actividad" y "Análisis".
export default function useDashboard() {
  const { user } = useAuth();
  // El backend restringe employees/inventory/clients a admin: para un
  // empleado sin ese permiso ni intentamos pedirlos (evita 401 en cascada).
  const canSeeEmployees = hasPermission(user, 'employees');
  const canSeeInventory = hasPermission(user, 'inventory');
  const canSeeClients = hasPermission(user, 'clients');

  const { orders, loading: loadingOrders } = useOrders();
  const { employees, loading: loadingEmployees, error: employeesError } = useEmployees(canSeeEmployees);
  const { tables, loading: loadingTables, error: tablesError } = useTables();
  const { insumos, loading: loadingInventory, error: inventoryError } = useInventory(canSeeInventory);
  const { clients, isLoading: loadingClients, error: clientsError } = useClients(canSeeClients);
  const { analytics, loading: loadingInvoices, error: invoicesError } = useInvoices();

  const isLoading =
    loadingOrders || loadingEmployees || loadingTables || loadingInventory || loadingClients || loadingInvoices;

  // Memoizado: sin esto, el array se recrea (nueva referencia) en cada render
  // y el useEffect de Dashboard.jsx que depende de "errors" entra en loop
  // (React error #185, "Maximum update depth exceeded").
  const errors = useMemo(
    () => [employeesError, tablesError, inventoryError, clientsError, invoicesError].filter(Boolean),
    [employeesError, tablesError, inventoryError, clientsError, invoicesError]
  );

  // --- Actividad reciente: últimos pedidos, sin importar el día ---
  const activityData = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 8)
      .map((order) => {
        const cliente = order.customer?.personalInfo
          ? `${order.customer.personalInfo.name || ''} ${order.customer.personalInfo.lastname || ''}`.trim()
          : order.customerName || 'Cliente';

        return {
          id: `#${(order._id || '').toString().slice(-4).toUpperCase() || '----'}`,
          orderType: order.orderType,
          tipo: order.orderType === 'online' ? 'En línea' : 'En local',
          mesa: order.table?.number ? `Mesa ${order.table.number}` : cliente,
          cliente,
          monto: `$${(Number(order.total) || 0).toFixed(2)}`,
          estado: ORDER_STATUS_LABELS[order.status] || (order.status || 'pendiente').toUpperCase(),
          hora: order.createdAt
            ? new Date(order.createdAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false })
            : '--:--',
          raw: order,
        };
      });
  }, [orders]);

  // --- Pedidos pendientes (todavía no facturados): reemplaza "Staff en Turno" ---
  const pendingOrdersCount = analytics?.pendingOrdersCount ?? 0;

  // --- Equipo: quién está trabajando en este momento, según su horario ---
  const staffData = useMemo(() => {
    return employees.map((emp) => ({
      id: emp._id,
      name: `${emp.personalInfo?.name || ''} ${emp.personalInfo?.lastname || ''}`.trim() || 'Sin nombre',
      image: emp.personalInfo?.image || null,
      type: emp.personalInfo?.type || 'other',
      // "role" es lo que se muestra en pantalla (ya traducido); "type" es el
      // valor crudo del enum, que sigue usándose para filtrar y agrupar.
      role: translateEmployeeType(emp.personalInfo?.type),
      shift: emp.workInfo?.shift || 'Turno',
      time: emp.workInfo?.scheduleStart && emp.workInfo?.scheduleEnd
        ? `${emp.workInfo.scheduleStart} - ${emp.workInfo.scheduleEnd}`
        : (emp.workInfo?.schedule || '—'),
      workingNow: isEmployeeWorkingNow(emp),
    }));
  }, [employees]);

  const staffWorkingNowCount = staffData.filter((s) => s.workingNow).length;

  // --- Mesas: "ocupada" es el único estado real de mesa en uso ---
  const mesasOcupadas = useMemo(() => tables.filter((t) => t.status === 'ocupada').length, [tables]);
  const totalMesas = tables.length;

  // --- Inventario: el umbral es propio de cada insumo (obligatorio para
  // productos completos), porque solo tiene sentido según su unidad de medida
  // (kg, litros, unidades...). Los insumos pendientes no cuentan aquí.
  const insumosBajoStock = useMemo(
    () => insumos.filter((i) => {
      if (i.pending || i.lowStockAlert === undefined || i.lowStockAlert === null) return false;
      return Number(i.quantity ?? i.stock) <= Number(i.lowStockAlert);
    }),
    [insumos]
  );

  const primerAlertaStock = insumosBajoStock[0]
    ? `${insumosBajoStock[0].name || 'Insumo'} (${insumosBajoStock[0].quantity ?? insumosBajoStock[0].stock} unidades)`
    : 'Sin alertas de stock';

  // --- Clientes: registrados hoy (mismo criterio que la tarjeta y el modal) ---
  const clientesHoyList = useMemo(() => {
    const now = new Date();
    return clients.filter((c) => {
      const fecha = c.createdAt;
      if (!fecha) return false;
      const created = new Date(fecha);
      return created.getFullYear() === now.getFullYear()
        && created.getMonth() === now.getMonth()
        && created.getDate() === now.getDate();
    });
  }, [clients]);
  const clientesNuevos = clientesHoyList.length;

  // --- Datos para la gráfica "hoy vs ayer" (Órdenes Hoy) ---
  const todayVsYesterday = [
    { name: 'Ayer', pedidos: analytics?.yesterday?.invoicedCount ?? 0 },
    { name: 'Hoy', pedidos: analytics?.today?.invoicedCount ?? 0 },
  ];

  return {
    isLoading,
    errors,
    stats: {
      // Solo pedidos ya facturados cuentan como "Órdenes Hoy"
      ordersTodayCount: analytics?.today?.invoicedCount ?? 0,
      ordersYesterdayCount: analytics?.yesterday?.invoicedCount ?? 0,
      ventasNetas: analytics?.today?.netSales ?? 0,
      pendingOrdersCount,
      staffWorkingNowCount,
      totalEmployees: employees.length,
      mesasOcupadas,
      totalMesas,
      insumosBajoStockCount: insumosBajoStock.length,
      primerAlertaStock,
      clientesNuevos,
      totalClientes: clients.length,
      avgTicket: analytics?.avgTicket ?? 0,
      monthTotal: analytics?.monthTotal ?? 0,
    },
    todayVsYesterday,
    activityData,
    staffData,
    analytics,
    clientesHoyList,
    employees,
    insumos,
  };
}
