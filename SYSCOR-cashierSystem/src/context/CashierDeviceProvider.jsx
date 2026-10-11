// context/CashierDeviceProvider.jsx
//
// Identidad y conexión en tiempo real de esta caja. Mismo esquema que la
// pantalla de cocina:
//   1. Al abrir, genera (o recupera) su UUID persistente: pos_device_id.
//   2. Sin token, se conecta al namespace "/cashier" con ese deviceId y el
//      servidor le asigna un código de 6 dígitos que muestra el lobby.
//   3. Un admin escribe el código en el panel (Ajustes → Sistema de caja),
//      elige al cajero y el fondo inicial. El servidor le entrega a ESTE
//      socket su token; se guarda y el socket se reconecta autenticado.
//   4. Si la API responde 401, si el servidor la desvincula o si al
//      reconectar rechaza el token, se borra y vuelve al paso 2.
//
// Expone el mismo SocketContext que usa el panel, así useSocketEvent funciona
// igual con este socket.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { SocketContext } from '@syscor/web-shared/src/context/socketContext';
import { CashierDeviceContext } from './cashierDeviceContext';
import { onDeviceUnauthorized } from '../services/cashierApi';
import { getOrCreateDeviceId, readDeviceToken, saveDeviceToken, clearDeviceToken } from '../utils/deviceStorage';
import { DEVICE_EVENTS, DEVICE_UNAUTHORIZED } from '../constants/deviceEvents';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const CASHIER_SOCKET_URL = /^https?:\/\//i.test(RAW_API_URL)
  ? `${RAW_API_URL.replace(/\/api\/?$/, '')}/cashier`
  : '/cashier';

export default function CashierDeviceProvider({ children }) {
  const [deviceId] = useState(getOrCreateDeviceId);
  const [token, setToken] = useState(readDeviceToken);
  const [pairing, setPairing] = useState(null);
  const [pairingError, setPairingError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const socketRef = useRef(null);

  const dropToken = useCallback((message) => {
    clearDeviceToken();
    setToken(null);
    if (message) setNotice(message);
  }, []);

  useEffect(
    () => onDeviceUnauthorized((data) => dropToken(data?.message || 'Esta caja perdió su acceso.')),
    [dropToken]
  );

  useEffect(() => {
    const socket = io(CASHIER_SOCKET_URL, {
      auth: token ? { token } : { deviceId },
      withCredentials: false,
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') setTimeout(() => socket.connect(), 1000);
    });
    socket.io.on('reconnect', () => setReconnectCount((count) => count + 1));
    socket.on('connect_error', (error) => {
      setIsConnected(false);
      if (token && error.message === DEVICE_UNAUTHORIZED) {
        socket.disconnect();
        dropToken(error.data?.message || 'Esta caja perdió su acceso.');
      }
    });

    if (token) {
      socket.on(DEVICE_EVENTS.DEVICE_REVOKED, (info) => {
        socket.disconnect();
        dropToken(info?.message || 'Un administrador desvinculó esta caja.');
      });
    } else {
      socket.on(DEVICE_EVENTS.PAIRING_CODE, (data) => {
        setPairing(data);
        setPairingError(null);
      });
      socket.on(DEVICE_EVENTS.PAIRING_UNAVAILABLE, (data) => setPairingError(data?.message || null));
      socket.on(DEVICE_EVENTS.DEVICE_PAIRED, ({ token: nextToken } = {}) => {
        if (!nextToken) return;
        saveDeviceToken(nextToken);
        setPairing(null);
        setNotice(null);
        setToken(nextToken);
      });
    }

    return () => {
      socket.disconnect();
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socketRef.current = null;
    };
  }, [token, deviceId, dropToken]);

  const subscribe = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const socketValue = useMemo(
    () => ({ socket: socketRef, isConnected, reconnectCount, subscribe }),
    [isConnected, reconnectCount, subscribe]
  );

  const deviceValue = useMemo(
    () => ({
      deviceId,
      shortId: deviceId.slice(0, 8).toUpperCase(),
      isPaired: Boolean(token),
      pairing,
      pairingError,
      notice,
      isConnected,
    }),
    [deviceId, token, pairing, pairingError, notice, isConnected]
  );

  return (
    <CashierDeviceContext.Provider value={deviceValue}>
      <SocketContext.Provider value={socketValue}>{children}</SocketContext.Provider>
    </CashierDeviceContext.Provider>
  );
}
