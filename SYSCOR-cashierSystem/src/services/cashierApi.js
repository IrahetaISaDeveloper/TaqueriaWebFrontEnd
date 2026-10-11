// Cliente HTTP de la caja.
//
// Toda petición lleva el token de la caja en "Authorization: Bearer" (no hay
// cookie de sesión: la caja no tiene usuario). Si el servidor responde 401,
// el token ya no sirve: se borra y la caja vuelve sola al lobby. Un 403 es
// "esto no le toca a una caja" y también la devuelve al lobby.
import axios from 'axios';
import { readDeviceToken, clearDeviceToken } from '../utils/deviceStorage';

// La URL de la API siempre termina en /api (ver el mismo arreglo en cocina)
const normalizeApiUrl = (raw) => {
  const url = String(raw || '').trim().replace(/\/+$/, '');
  if (!url) return '/api';
  return /\/api$/i.test(url) ? url : `${url}/api`;
};

const cashierApi = axios.create({
  baseURL: normalizeApiUrl(import.meta.env.VITE_API_URL),
  // Sin cookies: una sesión de admin abierta en este navegador no debe viajar
  withCredentials: false,
});

cashierApi.interceptors.request.use((config) => {
  const token = readDeviceToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unauthorizedListeners = new Set();

export const onDeviceUnauthorized = (listener) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};

cashierApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if (status === 401 || (status === 403 && code === 'DEVICE_FORBIDDEN')) {
      clearDeviceToken();
      unauthorizedListeners.forEach((listener) => listener(error.response?.data));
    }
    return Promise.reject(error);
  }
);

// Mensaje legible de un error de la API
export const apiMessage = (error, fallback) =>
  error?.response?.data?.message || (error?.response ? fallback : 'Sin conexión con el servidor.');

export default cashierApi;
