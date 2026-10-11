// hooks/useCashierStatus.js
//
// Estado de esta caja ya emparejada: su turno abierto (si hay), con el
// resumen en vivo, y los datos fiscales del emisor para los comprobantes.
// Se consulta al abrir y al reconectar; después el servidor avisa por socket
// (cashier:session_changed) cuando el admin abre o cierra el turno o cuando
// se registra un movimiento de efectivo.
import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '@syscor/web-shared/src/hooks/useSocket';
import cashierApi, { apiMessage } from '../services/cashierApi';
import { DEVICE_EVENTS } from '../constants/deviceEvents';

export default function useCashierStatus() {
  const { reconnectCount } = useSocket();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    cashierApi
      .get('/cashier/status')
      .then(({ data }) => {
        if (ignore) return;
        setStatus(data);
        setError(null);
      })
      .catch((err) => {
        if (ignore) return;
        console.error('No se pudo consultar la caja:', err);
        setError(apiMessage(err, 'No se pudo consultar el estado de la caja.'));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reconnectCount, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  // El turno cambió (abierto, cerrado o con un movimiento nuevo). Si llega el
  // turno completo se usa tal cual; si no, se vuelve a consultar.
  useSocketEvent(DEVICE_EVENTS.SESSION_CHANGED, ({ session } = {}) => {
    if (session === undefined) {
      refetch();
      return;
    }
    setStatus((prev) => (prev ? { ...prev, session } : prev));
  });

  // Después de cobrar, el resumen del turno cambia: se refresca en silencio
  useSocketEvent(DEVICE_EVENTS.REFRESH, refetch);

  const setSession = useCallback((session) => setStatus((prev) => (prev ? { ...prev, session } : prev)), []);

  return {
    status,
    session: status?.session || null,
    issuer: status?.issuer || null,
    device: status?.device || null,
    loading,
    error,
    refetch,
    setSession,
  };
}
