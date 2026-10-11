// hooks/useDeliveryPackages.js
//
// Paquetes de reparto que Chef Panchita va armando: qué órdenes a domicilio
// salen juntas y con qué repartidor. La cocina lo necesita para empacar
// juntas las bolsas de un mismo paquete y entregárselas a la persona
// correcta. Solo llega lo mínimo (números, códigos y nombre corto del
// repartidor); nada de direcciones ni datos del cliente.
//
// Se guardan en memoria los de la última hora: es lo que puede seguir en el
// mostrador. Por cada paquete nuevo se llama onAssigned (Panchita lo anuncia).
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSocketEvent } from '@syscor/web-shared/src/hooks/useSocket';
import { SOCKET_EVENTS } from '@syscor/web-shared/src/constants/socketEvents';

const KEEP_MS = 60 * 60 * 1000;

export default function useDeliveryPackages({ onAssigned } = {}) {
  // código de orden → { packageCode, driverName, numbers, codes, at }
  const [byOrderCode, setByOrderCode] = useState({});
  const onAssignedRef = useRef(onAssigned);

  useEffect(() => {
    onAssignedRef.current = onAssigned;
  });

  useSocketEvent(SOCKET_EVENTS.DELIVERY_PACKAGE_ASSIGNED, ({ deliveryPackage: pkg } = {}) => {
    if (!pkg?.orderCodes?.length) return;
    const now = Date.now();
    const numbers = pkg.packageKitchenNumbers?.length ? pkg.packageKitchenNumbers : pkg.kitchenNumbers;
    const codes = pkg.packageOrderCodes?.length ? pkg.packageOrderCodes : pkg.orderCodes;
    const info = { packageCode: pkg.code, driverName: pkg.driverName, numbers, codes, at: now };

    setByOrderCode((prev) => {
      const next = {};
      Object.entries(prev).forEach(([code, value]) => {
        if (now - value.at < KEEP_MS) next[code] = value;
      });
      // Todas las órdenes del paquete quedan apuntando a la versión más nueva
      codes.forEach((code) => { next[code] = info; });
      return next;
    });

    onAssignedRef.current?.(pkg);
  });

  const packageOf = useCallback((orderCodeValue) => byOrderCode[orderCodeValue] || null, [byOrderCode]);

  return { byOrderCode, packageOf };
}
