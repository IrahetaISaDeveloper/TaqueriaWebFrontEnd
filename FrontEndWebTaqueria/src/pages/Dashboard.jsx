// src/pages/Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, YAxis, PieChart, Pie, Cell, Legend } from 'recharts';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import Card from '../components/commons/Card';
import StockRiskPanel from '../components/dashboard/StockRiskPanel';
import OrderDetailModal from '../components/dashboard/OrderDetailModal';
import EmployeeDetailModal from '../components/dashboard/EmployeeDetailModal';
import TablesUseModal from '../components/dashboard/TablesUseModal';
import StockAlertModal from '../components/dashboard/StockAlertModal';
import NewClientsModal from '../components/dashboard/NewClientsModal';
import InventoryModal from '../components/inventory/InventoryModal';
import FAIcon from '../components/commons/FAIcon';
import Select from '../components/commons/Select';
import { usePagination } from '../hooks/usePagination';
import useDashboard from '../hooks/useDashboard';
import { useEmployees } from '../hooks/useEmployees';
import useTables from '../hooks/useTables';
import { useInventory } from '../hooks/useInventory';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import { useAuth } from '../hooks/auth/useAuth';
import { EMPLOYEE_TYPE_LABELS } from '../constants/employeeTypes';

const ORDER_TYPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'online', label: 'Pedido en línea' },
  { id: 'local', label: 'Pedido en local' },
];

const CHART_COLORS = ['#a33527', '#3a577d'];

// Rejilla de la tabla de actividad: se declara una vez porque encabezado y
// filas tienen que compartir exactamente las mismas columnas.
const ACTIVITY_GRID = 'grid-cols-[72px_84px_minmax(160px,1fr)_96px_132px_60px_36px]';

// Color de cada estado de pedido. El estado se lee por su color, así que
// conviene que sean los del sistema y no una escala aparte.
const STATUS_TONE = {
  COMPLETADO: 'text-ok',
  LISTO: 'text-info',
  PREPARANDO: 'text-warn',
  ATRASADO: 'text-ac',
  PENDIENTE: 'text-muted',
  CANCELADO: 'text-muted',
};

// Avatar del equipo: la foto cuando existe y se puede cargar, y si no las
// iniciales dentro del mismo círculo. El respaldo no es decorativo — varios
// empleados tienen guardado un nombre de archivo suelto en vez de una URL,
// y sin esto la lista se llena de imágenes rotas.
const StaffAvatar = ({ name, image }) => {
  const [failed, setFailed] = useState(false);
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const usable = image && /^https?:\/\//.test(image) && !failed;

  if (usable) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setFailed(true)}
        className="w-9 h-9 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <span className="num w-9 h-9 rounded-full border border-linealt flex items-center justify-center text-[11px] text-inkalt shrink-0">
      {initials || '?'}
    </span>
  );
};

function DashboardContent() {
  const { user } = useAuth();
  const { isLoading, errors, stats, todayVsYesterday, activityData, staffData, analytics, clientesHoyList, employees, insumos } = useDashboard();
  const { addToast } = useToast();
  // Mismos permisos que useDashboard: sin ellos, ni pedimos employees/inventory
  // (admin-only en el backend). "employees"/"insumos" ya vienen de useDashboard,
  // así que aquí solo se piden las funciones de mutación, sin volver a hacer fetch.
  const { updateEmployee, sendPasswordResetInvitation } = useEmployees(false);
  const { tables, updateTable, bulkUpdateStatus } = useTables();
  const { saveInsumo } = useInventory(false);

  const [activeTab, setActiveTab] = useState('actividad');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [staffTypeFilter, setStaffTypeFilter] = useState('all');
  // Independiente del puesto: "en turno ahora" según el horario configurado.
  const [staffAvailabilityFilter, setStaffAvailabilityFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [tablesModalOpen, setTablesModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [clientsModalOpen, setClientsModalOpen] = useState(false);
  const [completingInsumo, setCompletingInsumo] = useState(null);

  useEffect(() => {
    if (errors.length > 0) {
      addToast('Algunos datos no se pudieron cargar. Verifica la conexión.', 'warning');
    }
  }, [errors, addToast]);

  // El umbral es propio de cada insumo (obligatorio en insumos completos); los
  // pendientes o incompletos no cuentan aquí porque todavía no tienen uno.
  const insumosBajoStock = insumos.filter((i) => {
    if (i.pending || i.lowStockAlert === undefined || i.lowStockAlert === null) return false;
    return Number(i.quantity ?? i.stock) <= Number(i.lowStockAlert);
  });
  const insumosPendientes = insumos.filter((i) => i.pending && (i.itemType || 'producto') === 'producto');

  // Un insumo "incompleto" (pendiente, o creado antes sin ubicación/precio)
  // no se puede actualizar con un simple +cantidad: el backend exige el
  // formulario completo. En ese caso abrimos el editor completo en vez de
  // intentar un guardado que va a fallar.
  const isInsumoIncomplete = (insumo) => insumo.pending || !insumo.ubication || insumo.price === undefined || insumo.price === null;

  const handleAddStock = async (insumo, newQuantity) => {
    if (isInsumoIncomplete(insumo)) {
      setCompletingInsumo(insumo);
      return { success: false, message: 'Este insumo todavía no tiene toda su información. Complétala para poder actualizar su stock.' };
    }
    const formData = new FormData();
    formData.append('name', insumo.name);
    formData.append('itemType', insumo.itemType || 'producto');
    formData.append('price', insumo.price ?? 0);
    formData.append('ubication', insumo.ubication || '');
    formData.append('type', insumo.type || '');
    formData.append('quantity', newQuantity);
    formData.append('status', insumo.status || 'disponible');
    if (insumo.unit) formData.append('unit', insumo.unit);
    formData.append('lowStockAlert', insumo.lowStockAlert ?? 0);
    return saveInsumo(formData, insumo._id);
  };

  const filteredActivity = useMemo(() => {
    if (orderTypeFilter === 'all') return activityData;
    return activityData.filter((item) => item.orderType === orderTypeFilter);
  }, [activityData, orderTypeFilter]);

  const filteredStaff = useMemo(() => {
    return staffData
      .filter((s) => staffTypeFilter === 'all' || s.type === staffTypeFilter)
      .filter((s) => {
        if (staffAvailabilityFilter === 'available') return s.workingNow;
        if (staffAvailabilityFilter === 'unavailable') return !s.workingNow;
        return true;
      });
  }, [staffData, staffTypeFilter, staffAvailabilityFilter]);

  const { page, totalPages, paginatedItems, next, prev } = usePagination(filteredStaff, 4);

  const staffTypeOptions = useMemo(() => {
    const present = new Set(staffData.map((s) => s.type));
    return ['all', ...Array.from(present)];
  }, [staffData]);

  const salesTrendData = (analytics?.last14Days || []).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit' }),
  }));

  const orderTypePieData = analytics
    ? [
        { name: 'En local', value: analytics.byOrderType?.local?.total || 0 },
        { name: 'En línea', value: analytics.byOrderType?.online?.total || 0 },
      ]
    : [];

  return (
    <div className="p-6 sm:p-8">
      {/* Encabezado */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1 sm:mb-2">Actividad y Análisis</h1>
          <p className="text-sm sm:text-base text-inkalt">
            {activeTab === 'actividad' ? 'Seguimiento de pedidos en tiempo real' : 'Reportes y tendencias de todo el sistema'}
          </p>
        </div>

        {/* Selector de apartado: píldoras con borde, como el resto de los
            filtros del sistema. */}
        <div className="flex gap-1.5 w-fit">
          {[
            { id: 'actividad', label: 'Actividad', icon: 'bolt' },
            { id: 'analisis', label: 'Análisis', icon: 'chart-pie' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                activeTab === t.id
                  ? 'border-ac text-ac font-medium'
                  : 'border-line text-inkalt hover:border-linealt'
              }`}
            >
              <FAIcon icon={t.icon} size="xs" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 sm:mb-6 bg-warnsoft/80 backdrop-blur-sm border border-warn text-warn text-xs sm:text-sm rounded-none p-3">
          Algunos datos no se pudieron cargar correctamente. Verifica la conexión con el servidor.
        </div>
      )}

      {activeTab === 'actividad' ? (
        <>
          {/* --- La cifra que manda: ventas netas del día ---
              El rediseño es editorial: una sola cifra domina la pantalla y el
              resto de indicadores la acompañan en columnas separadas por una
              regla fina, sin tarjetas. */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 lg:gap-10 items-end pb-6 border-b border-line">
            <div>
              <p className="kick text-ac mb-3">Ventas netas · facturas de hoy</p>
              <div className="flex items-baseline gap-2.5 mb-3">
                <span className="num text-5xl sm:text-6xl leading-[0.9] tracking-tight text-ink">
                  {isLoading ? '—' : `$${Math.trunc(stats.ventasNetas).toLocaleString('en-US')}`}
                </span>
                {!isLoading && (
                  <span className="num text-xl text-muted">
                    .{stats.ventasNetas.toFixed(2).split('.')[1]}
                  </span>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-inkalt max-w-[420px]">
                {isLoading ? (
                  'Cargando la actividad del día…'
                ) : (
                  <>
                    Corresponde a las <span className="num">{stats.ordersTodayCount}</span> órdenes ya
                    facturadas hoy. Ayer a esta hora iban <span className="num">{stats.ordersYesterdayCount}</span>.
                  </>
                )}
              </p>
            </div>

            {/* Indicadores secundarios: regla fina arriba, sin caja */}
            <div className="grid grid-cols-2 gap-6 sm:gap-x-8 pb-1">
              <div className="border-t border-linealt pt-2.5">
                <p className="kick text-muted mb-2">Órdenes hoy (facturadas)</p>
                <div className="flex items-end justify-between gap-3">
                  <span className="num text-2xl text-ink">{isLoading ? '—' : stats.ordersTodayCount}</span>
                  {/* Comparativa de ayer contra hoy: dos barras bastan, no
                      hace falta un gráfico entero para dos valores. */}
                  {!isLoading && (
                    <div className="flex items-end gap-1.5 h-[26px]">
                      {todayVsYesterday.map((d, i) => {
                        const max = Math.max(...todayVsYesterday.map((x) => x.pedidos), 1);
                        return (
                          <div key={d.name} className="flex flex-col items-center gap-0.5">
                            <span
                              className={`w-3.5 ${i === todayVsYesterday.length - 1 ? 'bg-ac' : 'bg-linealt'}`}
                              style={{ height: `${Math.max(4, (d.pedidos / max) * 23)}px` }}
                            />
                            <span className="kick text-muted">{d.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-ac pt-2.5">
                <p className="kick text-ac mb-2">Pedidos pendientes</p>
                <span className="num text-2xl text-ink">{isLoading ? '—' : stats.pendingOrdersCount}</span>
                <p className="text-[11.5px] text-muted mt-1.5">Sin facturar todavía</p>
              </div>

              <div className="border-t border-linealt pt-2.5">
                <p className="kick text-muted mb-2">Mesas en uso</p>
                <span className="num text-2xl text-ink">
                  {isLoading ? '—' : stats.mesasOcupadas}
                  {!isLoading && <span className="text-sm text-muted">/{stats.totalMesas}</span>}
                </span>
                <div className="h-1 bg-page mt-2.5 overflow-hidden">
                  <span
                    className="block h-full bg-ac"
                    style={{ width: isLoading || !stats.totalMesas ? '0%' : `${(stats.mesasOcupadas / stats.totalMesas) * 100}%` }}
                  />
                </div>
              </div>

              <div className="border-t border-linealt pt-2.5">
                <p className="kick text-muted mb-2">Clientes nuevos</p>
                <span className="num text-2xl text-ink">{isLoading ? '—' : stats.clientesNuevos}</span>
                <p className="text-[11.5px] text-muted mt-1.5">Registrados hoy</p>
              </div>
            </div>
          </div>

          {/* --- Cuerpo: pedidos a la izquierda, equipo a la derecha --- */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,26%)] xl:grid-cols-[minmax(0,1fr)_minmax(400px,24%)]">
            <div className="py-6 lg:pr-8 lg:border-r border-line">
              <div className="max-w-[880px]">
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-[17px] font-display text-ink mb-1">Actividad reciente</h3>
                  <p className="text-xs text-muted">Últimos pedidos registrados</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {ORDER_TYPE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderTypeFilter(f.id)}
                      className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${
                        orderTypeFilter === f.id
                          ? 'border-ac text-ac font-medium'
                          : 'border-line text-inkalt hover:border-linealt'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla editorial: encabezados en versalitas y filas separadas
                  por una regla fina, sin contenedor con borde. */}
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className={`grid ${ACTIVITY_GRID} gap-3 px-1 pb-2`}>
                    <span className="kick text-muted">Pedido</span>
                    <span className="kick text-muted">Tipo</span>
                    <span className="kick text-muted">Mesa / cliente</span>
                    <span className="kick text-muted text-right">Monto</span>
                    <span className="kick text-muted">Estado</span>
                    <span className="kick text-muted text-right">Hora</span>
                    <span className="kick text-muted text-right">Ver</span>
                  </div>

                  {isLoading ? (
                    <p className="text-sm text-muted py-6 text-center border-t border-line">Cargando pedidos…</p>
                  ) : filteredActivity.length === 0 ? (
                    <p className="text-sm text-muted py-6 text-center border-t border-line">No hay pedidos para este filtro</p>
                  ) : (
                    filteredActivity.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedOrder(item.raw)}
                        className={`row w-full text-left grid ${ACTIVITY_GRID} gap-3 items-center px-1 py-3 border-t border-line transition-colors ${
                          idx === filteredActivity.length - 1 ? 'border-b' : ''
                        }`}
                      >
                        <span className="num text-xs text-muted">{item.id}</span>
                        <span className={`text-[11.5px] ${item.orderType === 'online' ? 'text-info' : 'text-inkalt'}`}>
                          {item.tipo}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] text-ink truncate">{item.mesa}</p>
                          <p className="text-[11.5px] text-muted truncate">{item.cliente}</p>
                        </div>
                        <span className="num text-[13px] text-ink text-right">{item.monto}</span>
                        <span className={`kick ${STATUS_TONE[item.estado] || 'text-muted'}`}>● {item.estado}</span>
                        <span className="num text-[11.5px] text-muted text-right">{item.hora}</span>
                        <span className="text-right text-muted">
                          <FAIcon icon="eye" size="sm" />
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <p className="text-[11.5px] text-muted mt-3.5">
                Se muestran los {filteredActivity.length} pedidos más recientes, sin importar el día.
              </p>

              {/* Indicadores operativos */}
              <div className="mt-6 pt-5 border-t border-line">
                <h3 className="text-[15px] font-display text-ink mb-3.5">Indicadores operativos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setTablesModalOpen(true)}
                    className="text-left block p-3.5 border border-line bg-surface hover:border-linealt transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="kick text-muted">Mesas en uso</p>
                      <FAIcon icon="chair" size="sm" className="text-muted" />
                    </div>
                    <span className="num text-[22px] text-ink">
                      {isLoading ? '—' : `${stats.mesasOcupadas}/${stats.totalMesas}`}
                    </span>
                    <p className="text-[11.5px] text-muted mt-2">
                      {isLoading ? 'Cargando…' : `${stats.mesasOcupadas} de ${stats.totalMesas} mesas ocupadas`}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockModalOpen(true)}
                    className="text-left block p-3.5 border border-warn bg-warnsoft transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="kick text-warn">Alerta de stock</p>
                      <FAIcon icon="triangle-exclamation" size="sm" className="text-warn" />
                    </div>
                    <span className="num text-[22px] text-ink">{isLoading ? '—' : stats.insumosBajoStockCount}</span>
                    <p className="text-[11.5px] text-inkalt mt-2">{isLoading ? 'Cargando…' : stats.primerAlertaStock}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClientsModalOpen(true)}
                    className="text-left block p-3.5 border border-line bg-surface hover:border-linealt transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="kick text-muted">Clientes nuevos</p>
                      <FAIcon icon="user-plus" size="sm" className="text-ok" />
                    </div>
                    <span className="num text-[22px] text-ink">{isLoading ? '—' : stats.clientesNuevos}</span>
                    <p className="text-[11.5px] text-muted mt-2">Registrados hoy</p>
                  </button>
                </div>
              </div>
              </div>
            </div>

            {/* --- Estado del equipo --- */}
            <div className="py-6 lg:pl-8">
              <h3 className="text-[17px] font-display text-ink mb-4">Estado del equipo</h3>
              <div className="flex gap-2 mb-3.5">
                {/* Disponibilidad: independiente del puesto, según si su
                    horario configurado lo tiene trabajando ahora mismo. */}
                <Select
                  size="sm"
                  value={staffAvailabilityFilter}
                  onChange={(e) => setStaffAvailabilityFilter(e.target.value)}
                  className="flex-1"
                >
                  <option value="all">Cualquiera</option>
                  <option value="available">Disponibles</option>
                  <option value="unavailable">Fuera de turno</option>
                </Select>
                <Select
                  size="sm"
                  value={staffTypeFilter}
                  onChange={(e) => setStaffTypeFilter(e.target.value)}
                  className="flex-1"
                >
                  {staffTypeOptions.map((t) => (
                    <option key={t} value={t}>{t === 'all' ? 'Todos' : (EMPLOYEE_TYPE_LABELS[t] || t)}</option>
                  ))}
                </Select>
              </div>
              <p className="text-[13px] text-muted mb-4">
                {isLoading ? 'Cargando personal…' : `${stats.staffWorkingNowCount} de ${stats.totalEmployees} en turno ahora`}
              </p>

              <div className="flex flex-col min-h-[220px]">
                {isLoading ? (
                  <p className="text-sm text-muted">Cargando personal…</p>
                ) : paginatedItems.length === 0 ? (
                  <p className="text-sm text-muted">No hay personal para este filtro</p>
                ) : (
                  paginatedItems.map((staff, idx) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => setSelectedEmployee(employees.find((e) => e._id === staff.id) || null)}
                      className={`flex items-center gap-3 py-3.5 text-left ${
                        idx < paginatedItems.length - 1 ? 'border-b border-line' : ''
                      }`}
                    >
                      <StaffAvatar name={staff.name} image={staff.image} />
                      <div className="min-w-0">
                        <p className={`text-[14px] truncate ${staff.workingNow ? 'text-ink' : 'text-inkalt'}`}>
                          {staff.name}
                        </p>
                        <p className="kick text-muted mt-1">{staff.role}</p>
                      </div>
                      <div className="ml-auto text-right shrink-0">
                        <p className={`kick ${staff.workingNow ? 'text-ok' : 'text-muted'}`}>
                          {staff.workingNow ? 'En turno' : 'Fuera de turno'}
                        </p>
                        <p className="num text-[11.5px] text-muted mt-1">{staff.time}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3.5 mt-4 pt-3.5 border-t border-line">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={page === 1}
                    className="w-[26px] h-[26px] flex items-center justify-center border border-line text-muted disabled:opacity-40"
                  >
                    <FAIcon icon="chevron-left" size="xs" />
                  </button>
                  <span className="num text-[11px] text-muted">{page}/{totalPages}</span>
                  <button
                    type="button"
                    onClick={next}
                    disabled={page === totalPages}
                    className="w-[26px] h-[26px] flex items-center justify-center border border-linealt text-inkalt disabled:opacity-40"
                  >
                    <FAIcon icon="chevron-right" size="xs" />
                  </button>
                </div>
              )}

              {/* Lo que reclama atención ahora mismo. Solo aparece si de
                  verdad hay algo pendiente: un panel que siempre dice "todo
                  bien" deja de leerse a las dos semanas. */}
              {!isLoading && (stats.pendingOrdersCount > 0 || stats.insumosBajoStockCount > 0) && (
                <div className="mt-5 p-3.5 border border-acline bg-acsoft">
                  <p className="kick text-ac mb-2">Requiere atención</p>
                  <p className="text-[12.5px] leading-relaxed text-ink">
                    {[
                      stats.pendingOrdersCount > 0 && `${stats.pendingOrdersCount} pedidos sin facturar`,
                      stats.insumosBajoStockCount > 0 && `${stats.insumosBajoStockCount} insumos por debajo de su umbral`,
                    ].filter(Boolean).join(' y ')}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStockModalOpen(true)}
                    className="inline-block mt-2.5 text-xs font-medium text-ac"
                  >
                    Ver alertas →
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* KPIs de negocio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
            <Card accent className="p-4 sm:p-6">
              <FAIcon icon="sack-dollar" size="2xl" className="text-ac mb-3" />
              <p className="text-inkalt text-sm mb-2">Ventas del Mes</p>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-ink">
                {isLoading ? '—' : `$${stats.monthTotal.toFixed(2)}`}
              </h3>
            </Card>
            <Card accent className="p-4 sm:p-6">
              <FAIcon icon="receipt" size="2xl" className="text-warn mb-3" />
              <p className="text-inkalt text-sm mb-2">Ticket Promedio</p>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-ink">
                {isLoading ? '—' : `$${stats.avgTicket.toFixed(2)}`}
              </h3>
            </Card>
            <Card accent className="p-4 sm:p-6">
              <FAIcon icon="globe" size="2xl" className="text-info mb-3" />
              <p className="text-inkalt text-sm mb-2">Ventas en línea</p>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-ink">
                {isLoading ? '—' : `$${(analytics?.byOrderType?.online?.total || 0).toFixed(2)}`}
              </h3>
              <p className="text-xs text-muted mt-2">Últimos 14 días</p>
            </Card>
            <Card accent className="p-4 sm:p-6">
              <FAIcon icon="store" size="2xl" className="text-info mb-3" />
              <p className="text-inkalt text-sm mb-2">Ventas en local</p>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-ink">
                {isLoading ? '—' : `$${(analytics?.byOrderType?.local?.total || 0).toFixed(2)}`}
              </h3>
              <p className="text-xs text-muted mt-2">Últimos 14 días</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 sm:mb-8">
            <Card className="lg:col-span-2 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-display font-bold text-ink mb-1">Ventas de los últimos 14 días</h3>
              <p className="text-xs sm:text-sm text-inkalt mb-4">Basado en pedidos ya facturados</p>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                    <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-display font-bold text-ink mb-1">Ventas por tipo</h3>
              <p className="text-xs sm:text-sm text-inkalt mb-4">Últimos 14 días</p>
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={orderTypePieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={4}>
                      {orderTypePieData.map((entry, idx) => (
                        <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8 sm:mb-12">
            <Card className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-display font-bold text-ink mb-1">Productos más vendidos</h3>
              <p className="text-xs sm:text-sm text-inkalt mb-4">Últimos 14 días, por cantidad</p>
              <div className="space-y-3">
                {(analytics?.topItems || []).length === 0 ? (
                  <p className="text-sm text-muted">Todavía no hay suficientes ventas para mostrar un top</p>
                ) : (
                  analytics.topItems.map((item, idx) => {
                    const max = analytics.topItems[0]?.quantity || 1;
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                          <span className="font-display font-semibold text-ink">{idx + 1}. {item.name}</span>
                          <span className="text-muted">{item.quantity} vendidos · ${item.total.toFixed(2)}</span>
                        </div>
                        <div className="h-2 w-full bg-surfalt rounded-full overflow-hidden">
                          <div className="h-full bg-ac rounded-full" style={{ width: `${(item.quantity / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <StockRiskPanel />
          </div>
        </>
      )}

      <OrderDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />

      <EmployeeDetailModal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
        onSave={updateEmployee}
        onSendPasswordReset={sendPasswordResetInvitation}
        addToast={addToast}
      />

      <TablesUseModal
        isOpen={tablesModalOpen}
        onClose={() => setTablesModalOpen(false)}
        tables={tables}
        onUpdate={updateTable}
        onBulkUpdate={bulkUpdateStatus}
        addToast={addToast}
      />

      <StockAlertModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        insumos={insumosBajoStock}
        pendingInsumos={insumosPendientes}
        isIncomplete={isInsumoIncomplete}
        onAddStock={handleAddStock}
        onCompleteInsumo={(insumo) => setCompletingInsumo(insumo)}
        addToast={addToast}
      />

      <NewClientsModal
        isOpen={clientsModalOpen}
        onClose={() => setClientsModalOpen(false)}
        clients={clientesHoyList}
      />

      <InventoryModal
        isOpen={!!completingInsumo}
        onClose={() => setCompletingInsumo(null)}
        insumoData={completingInsumo}
        itemType="producto"
        onSave={saveInsumo}
      />
    </div>
  );
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
        <Sidebar activeMenu="activity" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <DashboardContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
