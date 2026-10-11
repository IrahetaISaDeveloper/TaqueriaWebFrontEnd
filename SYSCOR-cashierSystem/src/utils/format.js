// Formatos de la caja: dinero, horas y fechas en hora de El Salvador.

export const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const formatClock = (date) =>
  new Date(date).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });

export const formatDateTime = (date) =>
  new Date(date).toLocaleString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

// "hace 12 min", "hace 1 h 05 min"
export const sinceLabel = (date, now = Date.now()) => {
  if (!date) return '';
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 24 * 60) return `hace ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
  // Más de un día (una mesa que nunca se liberó): días y horas basta
  const hours = Math.floor(minutes / 60);
  return `hace ${Math.floor(hours / 24)} d ${hours % 24} h`;
};

export const STATUS_LABELS = {
  pending: 'Recibido',
  preparing: 'En cocina',
  atrasado: 'Atrasado',
  ready: 'Listo',
  delivered: 'Servido',
  cancelled: 'Cancelado',
};

export const DOCUMENT_LABELS = {
  fcf: 'Factura',
  ccf: 'Crédito Fiscal',
};

export const SOURCE_LABELS = {
  table: 'Mesa',
  pickup: 'Para recoger',
  counter: 'Mostrador',
};
