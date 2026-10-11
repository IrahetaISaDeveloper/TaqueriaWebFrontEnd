// hooks/usePending.js
//
// Lo que la caja tiene por hacer: mesas por cobrar, pedidos para recoger por
// cobrar y pedidos ya pagados por entregar. El servidor avisa con
// cashier:refresh cada vez que cambia un pedido o una mesa, y la caja vuelve
// a consultar (los montos siempre los calcula el servidor). Por si un aviso
// se pierde, también se revisa cada minuto.
import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '@syscor/web-shared/src/hooks/useSocket';
import cashierApi, { apiMessage } from '../services/cashierApi';
import { DEVICE_EVENTS } from '../constants/deviceEvents';

const EMPTY = { tables: [], pickups: [], toDeliver: [] };
const SAFETY_REFRESH_MS = 60 * 1000;

export default function usePending({ enabled = true } = {}) {
  const { reconnectCount } = useSocket();
  const [pending, setPending] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    cashierApi
      .get('/cashier/pending')
      .then(({ data }) => {
        if (ignore) return;
        setPending({ ...EMPTY, ...data });
        setError(null);
      })
      .catch((err) => {
        if (!ignore) setError(apiMessage(err, 'No se pudo cargar lo pendiente de cobro.'));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [enabled, reconnectCount, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  useSocketEvent(DEVICE_EVENTS.REFRESH, refetch);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(refetch, SAFETY_REFRESH_MS);
    return () => clearInterval(timer);
  }, [enabled, refetch]);

  return { ...pending, loading, error, refetch };
}
