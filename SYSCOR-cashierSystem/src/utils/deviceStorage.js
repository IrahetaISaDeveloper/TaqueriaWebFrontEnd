// Identidad de esta caja, guardada en el navegador (mismo esquema que cocina).
//
//   - pos_device_id: UUID que se genera UNA vez y se queda para siempre. Es
//     cómo el servidor reconoce a esta pantalla al emparejarla.
//   - pos_device_token: token de dispositivo que entrega el servidor cuando un
//     admin empareja la caja. Sin él no se pide nada al servidor.
//
// localStorage puede fallar (modo privado, almacenamiento bloqueado): en ese
// caso la identidad dura lo que dure la pestaña, pero la caja funciona.

const DEVICE_ID_KEY = 'pos_device_id';
const TOKEN_KEY = 'pos_device_token';

let memoryDeviceId = null;
let memoryToken = null;

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: queda solo en memoria
  }
};

// crypto.randomUUID solo existe en contextos seguros (https o localhost). Una
// tablet que abra la caja por IP de la red local no lo tiene: ahí se arma
// un UUID v4 a mano con getRandomValues, igual de aleatorio.
const randomUUID = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getOrCreateDeviceId = () => {
  const stored = read(DEVICE_ID_KEY) || memoryDeviceId;
  if (stored && UUID_RE.test(stored)) return stored;
  const created = randomUUID();
  memoryDeviceId = created;
  write(DEVICE_ID_KEY, created);
  return created;
};

export const readDeviceToken = () => read(TOKEN_KEY) || memoryToken;

export const saveDeviceToken = (token) => {
  memoryToken = token;
  write(TOKEN_KEY, token);
};

export const clearDeviceToken = () => {
  memoryToken = null;
  write(TOKEN_KEY, null);
};
