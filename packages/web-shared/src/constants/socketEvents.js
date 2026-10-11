// Nombres de los eventos de tiempo real. Debe coincidir EXACTO con
// backEnd/src/config/socket.js (SOCKET_EVENTS), igual que pasa con el
// catálogo de permisos: son dos archivos espejo, uno por proyecto. Vive en
// el paquete compartido porque el panel y la pantalla de cocina escuchan
// los mismos eventos.
export const SOCKET_EVENTS = {
  // Comandas
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_DELETED: 'order:deleted',
  // Mesas
  TABLE_CREATED: 'table:created',
  TABLE_UPDATED: 'table:updated',
  TABLE_DELETED: 'table:deleted',
  TABLES_BULK_UPDATED: 'table:bulk_updated',
  // Mensaje del cliente para el repartidor (desde Panchita en la app)
  ORDER_DRIVER_MESSAGE: 'order:driver_message',
  // Campana de notificaciones
  NOTIFICATION_CREATED: 'notification:created',
  // Fotos del DUI tomadas con el teléfono (ver useDuiScan). Faltaba aquí: sin
  // él, la pantalla de invitación nunca se enteraba de que llegaron las fotos.
  DUI_CAPTURE_UPLOADED: 'dui:capture_uploaded',
  // Sistema de Cocina (KDS): el admin lo habilitó/deshabilitó o cambió sus
  // tiempos de alerta. Lo escuchan Ajustes del panel y la pantalla de cocina.
  KITCHEN_STATUS_CHANGED: 'kitchen:status_changed',
  // Se emparejó o se desvinculó una pantalla de cocina (lo escucha Ajustes)
  KITCHEN_DEVICES_CHANGED: 'kitchen:devices_changed',
  // Chef Panchita armó (o completó) un paquete de reparto y se lo asignó a un
  // repartidor. La pantalla de cocina lo anuncia para empacar juntas esas órdenes.
  DELIVERY_PACKAGE_ASSIGNED: 'delivery:package_assigned',
  // Sistema de Caja (POS): se habilitó/deshabilitó, o se abrió o cerró un
  // turno (lo escuchan Ajustes y la app de meseros)
  CASHIER_STATUS_CHANGED: 'cashier:status_changed',
  // Se emparejó/desvinculó una caja, o cambió algún turno (lo escucha Ajustes)
  CASHIER_DEVICES_CHANGED: 'cashier:devices_changed',
};

export default SOCKET_EVENTS;
