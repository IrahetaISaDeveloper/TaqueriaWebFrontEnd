// hooks/useCashierDevice.js
import { useContext } from 'react';
import { CashierDeviceContext } from '../context/cashierDeviceContext';

// Identidad de esta caja: deviceId, si ya está emparejada y su código de
// emparejamiento.
export default function useCashierDevice() {
  const context = useContext(CashierDeviceContext);
  if (!context) {
    throw new Error('useCashierDevice debe usarse dentro de un <CashierDeviceProvider>');
  }
  return context;
}
