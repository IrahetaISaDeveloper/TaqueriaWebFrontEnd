// hooks/useCashierAdmin.js
//
// Sistema de caja (POS) desde el panel: emparejar la caja con el código que
// muestra y abrir el turno (cajero + fondo inicial), abrir/cerrar turnos,
// desvincular cajas, apagar el sistema y consultar los cortes.
//
// Igual que con cocina, la caja no tiene login: el servidor le entrega su
// token en tiempo real cuando el admin escribe aquí su código.
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket, useSocketEvent } from '@syscor/web-shared/src/hooks/useSocket';
import { SOCKET_EVENTS } from '@syscor/web-shared/src/constants/socketEvents';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const http = { withCredentials: true };

const errorMessage = (err, fallback) => err.response?.data?.message || fallback;

const EMPTY = { cashier: { enabled: false }, devices: [], openSessions: [], recentSessions: [], cashiers: [] };

export default function useCashierAdmin({ enabled = true } = {}) {
  const { reconnectCount } = useSocket();
  const [overview, setOverview] = useState(EMPTY);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    axios
      .get(`${BASE_URL}/cashier/admin/overview`, http)
      .then((response) => {
        if (!ignore) setOverview({ ...EMPTY, ...response.data });
      })
      .catch((err) => console.error('No se pudo cargar el sistema de caja:', err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [enabled, reconnectCount, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  // Turnos, cobros y cajas cambian solos: el panel se actualiza en vivo
  useSocketEvent(SOCKET_EVENTS.CASHIER_DEVICES_CHANGED, refetch);
  useSocketEvent(SOCKET_EVENTS.CASHIER_STATUS_CHANGED, refetch);

  const run = useCallback(async (request, fallback) => {
    setBusy(true);
    try {
      const response = await request();
      refetch();
      return { success: true, message: response.data?.message, data: response.data?.data };
    } catch (err) {
      return { success: false, message: errorMessage(err, fallback) };
    } finally {
      setBusy(false);
    }
  }, [refetch]);

  const pairDevice = useCallback(
    ({ code, cashierId, openingFloat }) =>
      run(() => axios.post(`${BASE_URL}/cashier/devices/pair`, { code, cashierId, openingFloat }, http), 'No se pudo habilitar la caja.'),
    [run]
  );

  const openShift = useCallback(
    ({ deviceId, cashierId, openingFloat }) =>
      run(() => axios.post(`${BASE_URL}/cashier/sessions`, { deviceId, cashierId, openingFloat }, http), 'No se pudo abrir el turno.'),
    [run]
  );

  const closeShift = useCallback(
    (sessionId, { countedCash, notes } = {}) =>
      run(() => axios.post(`${BASE_URL}/cashier/sessions/${sessionId}/close`, { countedCash, notes }, http), 'No se pudo cerrar el turno.'),
    [run]
  );

  const unpairDevice = useCallback(
    (deviceId) => run(() => axios.delete(`${BASE_URL}/cashier/devices/${deviceId}`, http), 'No se pudo desvincular la caja.'),
    [run]
  );

  const disableCashier = useCallback(
    () => run(() => axios.post(`${BASE_URL}/cashier/disable`, {}, http), 'No se pudo deshabilitar el sistema de caja.'),
    [run]
  );

  // Corte de un turno con sus comprobantes (para verlo e imprimirlo)
  const fetchReport = useCallback(async (sessionId) => {
    try {
      const response = await axios.get(`${BASE_URL}/cashier/sessions/${sessionId}`, http);
      return { success: true, ...response.data };
    } catch (err) {
      return { success: false, message: errorMessage(err, 'No se pudo cargar el corte.') };
    }
  }, []);

  return {
    ...overview,
    loading,
    busy,
    refetch,
    pairDevice,
    openShift,
    closeShift,
    unpairDevice,
    disableCashier,
    fetchReport,
  };
}
