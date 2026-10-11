// hooks/useCashierMenu.js
//
// Productos con precio para la venta de mostrador. Se consulta al entrar a
// "Mostrador" y cada vez que se pide recargar (el menú cambia poco durante
// un turno). Los precios son solo para mostrar: al cobrar, el servidor los
// vuelve a calcular con el menú real.
import { useState, useEffect, useCallback, useMemo } from 'react';
import cashierApi, { apiMessage } from '../services/cashierApi';

const EMPTY = { saucers: [], combos: [], drinks: [], promotions: [], extras: [] };

export const MENU_SECTIONS = [
  { id: 'saucers', label: 'Platillos', icon: 'utensils' },
  { id: 'combos', label: 'Combos', icon: 'stack' },
  { id: 'drinks', label: 'Bebidas', icon: 'wine-glass' },
  { id: 'promotions', label: 'Promociones', icon: 'tag' },
];

export default function useCashierMenu({ enabled = true } = {}) {
  const [menu, setMenu] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    cashierApi
      .get('/cashier/menu')
      .then(({ data }) => {
        if (ignore) return;
        setMenu({ ...EMPTY, ...data });
        setError(null);
      })
      .catch((err) => {
        if (!ignore) setError(apiMessage(err, 'No se pudo cargar el menú.'));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [enabled, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  const extrasById = useMemo(() => new Map(menu.extras.map((extra) => [String(extra.id), extra])), [menu.extras]);

  return { menu, extrasById, loading, error, refetch };
}
