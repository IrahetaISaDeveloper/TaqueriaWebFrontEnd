// Qué columnas exporta el reporte de cada apartado.
//
// Vive aparte de las pantallas para que el reporte no dependa de cómo se
// vean las tablas en la interfaz: una pantalla puede mostrar 4 columnas y
// exportar 8, y cambiar el diseño no rompe el documento que recibe el
// contador o el gerente.
//
// Cada columna es { header, value(row), align?, width? }. El "header" se usa
// tal cual en el PDF y, normalizado, como etiqueta XML / clave JSON (ver
// utils/reportExport.js).
import { UNIT_LABELS } from './units';
import { EMPLOYEE_TYPE_LABELS } from './employeeTypes';
import { getPrimaryPhone } from '../utils/customerPhones';

const money = (n) => (n === null || n === undefined || n === '' ? '' : `$${Number(n).toFixed(2)}`);
const yesNo = (v) => (v ? 'Sí' : 'No');
const date = (d) => (d ? new Date(d).toLocaleDateString('es-SV') : '');

// Resume una receta/lista de ingredientes en una sola celda legible
// ("Tortilla 2 unidad, Carne 150 g"). Los tres apartados de menú que tienen
// ingredientes lo muestran igual, así que se comparte.
const ingredientList = (items = [], nameKey = 'name') =>
  items
    .map((i) => {
      const name = nameKey === 'ingredientId' ? i.ingredientId?.name || 'Insumo' : i[nameKey];
      const qty = i.quantity ? ` ${i.quantity} ${UNIT_LABELS[i.unit] || i.unit || ''}`.trimEnd() : '';
      return `${name}${qty}`;
    })
    .join(', ');

// --- Menú ---

// useDrinks normaliza el documento del backend (name -> title, quantity ->
// stock), por eso estas columnas no coinciden 1 a 1 con el modelo de Mongo.
export const drinksReportColumns = [
  { header: 'Nombre', value: (d) => d.title, width: 110 },
  { header: 'Categoría', value: (d) => (d.category === 'casa' ? 'De casa' : 'De tercero') },
  { header: 'Subcategoría', value: (d) => d.subcategory },
  { header: 'Precio', value: (d) => money(d.price), align: 'right' },
  { header: 'Existencias', value: (d) => (d.stock === null ? 'No aplica' : d.stock), align: 'right' },
  { header: 'Estado', value: (d) => d.status },
  { header: 'Receta', value: (d) => ingredientList(d.recipe), width: 150 },
];

export const drinkSetsReportColumns = [
  { header: 'Nombre', value: (s) => s.name, width: 130 },
  { header: 'Bebidas', value: (s) => (s.drinkIds || []).map((d) => d?.name || d).join(', '), width: 220 },
  { header: 'Cantidad de bebidas', value: (s) => (s.drinkIds || []).length, align: 'right' },
  { header: 'Estado', value: (s) => s.status },
  { header: 'Creado', value: (s) => date(s.createdAt) },
];

export const dishesReportColumns = [
  { header: 'Nombre', value: (d) => d.name, width: 110 },
  { header: 'Categoría', value: (d) => d.category },
  { header: 'Subcategoría', value: (d) => d.subcategory },
  { header: 'Precio', value: (d) => money(d.price), align: 'right' },
  { header: 'Existencias', value: (d) => d.quantity, align: 'right' },
  { header: 'Estado', value: (d) => d.status },
  { header: 'Ingredientes', value: (d) => ingredientList(d.recipe), width: 150 },
];

export const combosReportColumns = [
  { header: 'Nombre', value: (c) => c.name, width: 110 },
  { header: 'Categoría', value: (c) => c.category },
  { header: 'Precio', value: (c) => money(c.price), align: 'right' },
  { header: 'Platillos', value: (c) => (c.saucers || []).map((s) => s.saucerId?.name || '').filter(Boolean).join(', '), width: 140 },
  { header: 'Es selectivo', value: (c) => yesNo(c.selective) },
  { header: 'Opciones a elegir', value: (c) => (c.selective ? c.selectiveMaxPicks : ''), align: 'right' },
  { header: 'Estado', value: (c) => c.status },
];

export const extrasReportColumns = [
  { header: 'Nombre', value: (e) => e.name, width: 120 },
  { header: 'Categoría', value: (e) => e.category },
  { header: 'Precio', value: (e) => money(e.price), align: 'right' },
  { header: 'Compuesto', value: (e) => yesNo(e.isCompound) },
  { header: 'Ingredientes', value: (e) => ingredientList(e.ingredients, 'ingredientId'), width: 170 },
  { header: 'Estado', value: (e) => e.status },
];

// --- Operaciones ---

// El inventario mezcla dos cosas en una misma colección (productos que se
// consumen y activos fijos), y cada una tiene campos que a la otra no le
// aplican. Por eso son dos configuraciones distintas.
export const inventoryProductsReportColumns = [
  { header: 'Insumo', value: (i) => i.name, width: 120 },
  { header: 'Existencias', value: (i) => i.quantity, align: 'right' },
  { header: 'Unidad', value: (i) => UNIT_LABELS[i.unit] || i.unit },
  { header: 'Alerta de stock bajo', value: (i) => i.lowStockAlert ?? '', align: 'right' },
  { header: 'Precio', value: (i) => money(i.price), align: 'right' },
  { header: 'Ubicación', value: (i) => i.ubication },
  { header: 'Estado', value: (i) => i.status },
  { header: 'Pendiente de completar', value: (i) => yesNo(i.pending) },
];

export const inventoryAssetsReportColumns = [
  { header: 'Activo', value: (i) => i.name, width: 120 },
  { header: 'Cantidad', value: (i) => i.quantity, align: 'right' },
  { header: 'Tipo', value: (i) => i.type },
  { header: 'Condición', value: (i) => i.condition },
  { header: 'Precio', value: (i) => money(i.price), align: 'right' },
  { header: 'Ubicación', value: (i) => i.ubication },
  { header: 'Fecha de adquisición', value: (i) => date(i.acquisitionDate) },
  { header: 'Estado', value: (i) => i.status },
];

export const tablesReportColumns = [
  { header: 'Mesa', value: (t) => t.number, align: 'right' },
  { header: 'Estado', value: (t) => t.status },
  { header: 'Registrada', value: (t) => date(t.createdAt) },
  { header: 'Última actualización', value: (t) => date(t.updatedAt) },
];

const ORDER_STATUS_LABELS = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  atrasado: 'Atrasado',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ordersReportColumns = [
  { header: 'Fecha', value: (o) => (o.createdAt ? new Date(o.createdAt).toLocaleString('es-SV') : '') },
  { header: 'Tipo', value: (o) => (o.orderType === 'online' ? 'En línea' : 'Local') },
  { header: 'Mesa', value: (o) => o.table?.number ?? '' , align: 'right' },
  {
    header: 'Cliente',
    value: (o) =>
      o.customer?.personalInfo
        ? `${o.customer.personalInfo.name || ''} ${o.customer.personalInfo.lastname || ''}`.trim()
        : o.customerName || '',
    width: 110,
  },
  {
    header: 'Mesero',
    value: (o) => (o.waiter ? `${o.waiter.name || ''} ${o.waiter.lastname || ''}`.trim() : ''),
    width: 100,
  },
  { header: 'Productos', value: (o) => (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', '), width: 160 },
  { header: 'Total', value: (o) => money(o.total), align: 'right' },
  { header: 'Estado', value: (o) => ORDER_STATUS_LABELS[o.status] || o.status },
  { header: 'Pago', value: (o) => (o.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente') },
];

export const invoicesReportColumns = [
  { header: 'Fecha', value: (i) => (i.issuedAt ? new Date(i.issuedAt).toLocaleString('es-SV') : '') },
  { header: 'Tipo', value: (i) => (i.orderType === 'online' ? 'En línea' : 'Local') },
  { header: 'Mesa', value: (i) => i.tableNumber ?? '', align: 'right' },
  { header: 'Cliente', value: (i) => i.customerName || '', width: 110 },
  { header: 'Mesero', value: (i) => i.waiterName || '', width: 100 },
  { header: 'Productos', value: (i) => (i.items || []).map((x) => `${x.quantity}x ${x.name}`).join(', '), width: 160 },
  { header: 'Método de pago', value: (i) => i.paymentMethod || '' },
  { header: 'Total', value: (i) => money(i.total), align: 'right' },
];

// --- Administración ---

// El salario se deja fuera a propósito: quien necesite esa información tiene
// el reporte de Planilla, que va detrás del permiso "payroll". Este reporte
// lo puede sacar cualquiera con acceso a la pantalla de Empleados.
export const employeesReportColumns = [
  {
    header: 'Nombre',
    value: (e) => `${e.personalInfo?.name || ''} ${e.personalInfo?.lastname || ''}`.trim(),
    width: 120,
  },
  { header: 'Puesto', value: (e) => EMPLOYEE_TYPE_LABELS[e.personalInfo?.type] || 'Otro' },
  { header: 'Correo', value: (e) => e.loginInfo?.email, width: 140 },
  { header: 'Teléfono', value: (e) => e.personalInfo?.phone },
  { header: 'DUI / NIT', value: (e) => e.personalInfo?.duiNit },
  { header: 'Estado', value: (e) => e.workInfo?.status },
  {
    header: 'Horario',
    value: (e) =>
      e.workInfo?.scheduleStart && e.workInfo?.scheduleEnd
        ? `${e.workInfo.scheduleStart} - ${e.workInfo.scheduleEnd}`
        : '',
  },
  { header: 'Días de trabajo', value: (e) => (e.workInfo?.workDays || []).join(', '), width: 120 },
];

export const clientsReportColumns = [
  {
    header: 'Nombre',
    value: (c) => `${c.personalInfo?.name || ''} ${c.personalInfo?.lastname || ''}`.trim(),
    width: 130,
  },
  { header: 'Correo', value: (c) => c.loginInfo?.email, width: 150 },
  { header: 'Teléfono', value: (c) => getPrimaryPhone(c) },
  { header: 'Cuenta verificada', value: (c) => yesNo(c.loginInfo?.isVerified) },
  { header: 'Estado', value: (c) => ((c.status || 'active') === 'active' ? 'Activo' : 'Desactivado') },
  { header: 'Direcciones', value: (c) => (c.personalInfo?.addresses || []).map((a) => a.details).join(' | '), width: 160 },
  { header: 'Registrado', value: (c) => date(c.createdAt) },
];

// --- Planilla (complementa al PDF dedicado que ya existe) ---
export const payrollReportColumns = [
  { header: 'Empleado', value: (r) => r.name, width: 130 },
  { header: 'Puesto', value: (r) => r.typeLabel },
  { header: 'Salario base', value: (r) => money(r.grossSalary), align: 'right' },
  { header: 'AFP', value: (r) => money(r.afp), align: 'right' },
  { header: 'ISSS', value: (r) => money(r.isss), align: 'right' },
  { header: 'Renta', value: (r) => money(r.isr), align: 'right' },
  { header: 'Neto a pagar', value: (r) => money(r.netSalary), align: 'right' },
];

// Planilla de bonos: aparte de la general porque el bono no lleva
// descuentos de ley (es un pago discrecional, no salario cotizable).
export const bonusPayrollReportColumns = [
  { header: 'Empleado', value: (r) => r.name, width: 130 },
  { header: 'Puesto', value: (r) => r.typeLabel },
  { header: 'Bono asignado', value: (r) => money(r.bonus), align: 'right' },
];

// --- Contabilidad (facturas de compra) ---
export const purchaseInvoicesReportColumns = [
  { header: 'Fecha', value: (p) => date(p.issuedAt) },
  { header: 'Proveedor', value: (p) => p.supplierName, width: 130 },
  { header: 'NIT / NRC', value: (p) => p.supplierTaxId || '' },
  { header: 'N.º factura', value: (p) => p.invoiceNumber },
  { header: 'Categoría', value: (p) => p.category },
  { header: 'Subtotal', value: (p) => money(p.subtotal), align: 'right' },
  { header: 'IVA', value: (p) => money(p.tax), align: 'right' },
  { header: 'Total', value: (p) => money(p.total), align: 'right' },
  { header: 'Procesada para IVA', value: (p) => yesNo(p.processedForTax) },
];

// --- Recetario ---
// Las recetas se arman desde tres colecciones distintas (bebidas, platillos y
// extras compuestos), así que el reporte recibe filas ya unificadas por la
// pantalla, con el tipo indicado.
export const recipesReportColumns = [
  { header: 'Producto', value: (r) => r.title || r.name, width: 130 },
  { header: 'Tipo', value: (r) => r.__type },
  { header: 'Categoría', value: (r) => r.subcategory || r.category || '' },
  {
    header: 'Ingredientes',
    value: (r) => ingredientList(r.recipe),
    width: 240,
  },
  { header: 'Cantidad de ingredientes', value: (r) => (r.recipe || []).length, align: 'right' },
];

export default {
  drinksReportColumns,
  drinkSetsReportColumns,
  dishesReportColumns,
  combosReportColumns,
  extrasReportColumns,
  inventoryProductsReportColumns,
  inventoryAssetsReportColumns,
  tablesReportColumns,
  ordersReportColumns,
  invoicesReportColumns,
  employeesReportColumns,
  clientsReportColumns,
  payrollReportColumns,
  bonusPayrollReportColumns,
  purchaseInvoicesReportColumns,
  recipesReportColumns,
};
