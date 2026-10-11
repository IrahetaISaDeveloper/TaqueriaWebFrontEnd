// Eventos del namespace "/cashier" (cajas). Espejo de CASHIER_SOCKET_EVENTS
// en backEnd/src/config/cashierSocket.js.
export const DEVICE_EVENTS = {
  // El servidor asignó el código que muestra el lobby
  PAIRING_CODE: 'cashier:pairing_code',
  // Demasiadas cajas esperando código a la vez
  PAIRING_UNAVAILABLE: 'cashier:pairing_unavailable',
  // Un admin escribió el código: aquí viene el token de esta caja
  DEVICE_PAIRED: 'cashier:device_paired',
  // Un admin la desvinculó o apagó el sistema (kill switch)
  DEVICE_REVOKED: 'cashier:device_revoked',
  // Se abrió o se cerró el turno de esta caja
  SESSION_CHANGED: 'cashier:session_changed',
  // Cambió algo de lo que hay por cobrar o entregar: volver a consultar
  REFRESH: 'cashier:refresh',
};

// Mensaje de error del handshake cuando el token ya no sirve
export const DEVICE_UNAUTHORIZED = 'DEVICE_UNAUTHORIZED';
