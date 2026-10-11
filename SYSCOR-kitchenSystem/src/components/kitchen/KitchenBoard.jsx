// components/kitchen/KitchenBoard.jsx
//
// Tablero de comandas (KDS): lo que ve la cocina con el sistema habilitado.
//
// Las comandas llegan y cambian por socket (useKitchenOrders); el tablero se
// arma de nuevo solo cuando cambia alguna comanda o pasa un minuto (para los
// pedidos programados que entran a la cola). El segundero de cada ticket no
// pasa por aquí: lo maneja el reloj único de cocina en cada <TicketTimer>.
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import LoadingSpinner from '@syscor/web-shared/src/components/LoadingSpinner';
import { useToast } from '@syscor/web-shared/src/components/ToastProvider';
import { orderCode } from '@syscor/web-shared/src/utils/orderCode';
import KitchenTopBar, { TopBarCounter } from './KitchenTopBar';
import OrderTicket from './OrderTicket';
import CategoryLegend from './CategoryLegend';
import DetailModeSwitch from './DetailModeSwitch';
import RecentReadyBar from './RecentReadyBar';
import ChefPanchitaPanel from '../voice/ChefPanchitaPanel';
import useKitchenOrders from '../../hooks/useKitchenOrders';
import useMenuCatalog from '../../hooks/useMenuCatalog';
import useDetailMode from '../../hooks/useDetailMode';
import useChefPanchita, { spokenPackage } from '../../hooks/useChefPanchita';
import useDeliveryPackages from '../../hooks/useDeliveryPackages';
import useKitchenDevice from '../../hooks/useKitchenDevice';
import { useClockMinute } from '../../hooks/useKitchenClock';
import { buildBoard, readyAt } from '../../utils/orderPhase';
import { BOARD_FILTERS, RECENT_READY_MS } from '../../constants/kitchenStatus';

// Cuadrícula responsiva: tantas columnas de ~280px como quepan (una sola en
// el teléfono, donde se ve como lista). Con auto-fill las columnas vacías se
// conservan, así pocos tickets no se estiran a lo ancho de toda la pantalla.
const GRID_STYLE = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' };

// Cómo se nombra una orden en los avisos: por su número de cocina si lo tiene
const orderLabel = (order) => (order.kitchenNumber != null ? `Orden ${order.kitchenNumber}` : orderCode(order));

// Píldora de filtro con su conteo; la activa va resaltada con el acento
const FilterPill = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`kick inline-flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
      active ? 'bg-acsoft text-ink ring-1 ring-acline' : 'text-inkalt hover:text-ink'
    }`}
  >
    {label}
    <span className={`num ${active ? 'text-ac' : 'text-muted'}`}>{count}</span>
  </button>
);

export default function KitchenBoard({ kitchen }) {
  const { ordersById, loading, error, busyIds, refetch, markReady, startOrder, undoReady } = useKitchenOrders();
  const { catalog, error: catalogError } = useMenuCatalog();
  const { mode: detailMode, detailed, setMode: setDetailMode } = useDetailMode();
  const { welcomePending, consumeWelcome } = useKitchenDevice();
  const { addToast } = useToast();
  const [filter, setFilter] = useState('all');

  // El minuto actual del reloj único: basta esa precisión para saber si un
  // pedido programado ya entró a la cola o si una lista ya es "vieja".
  const minute = useClockMinute();

  const { entries, recentReady } = useMemo(() => {
    const now = minute * 60000;
    const orders = Object.values(ordersById);
    return {
      entries: buildBoard(orders, now),
      recentReady: orders
        .filter((order) => order.status === 'ready' && now - readyAt(order) < RECENT_READY_MS)
        .sort((a, b) => readyAt(b) - readyAt(a)),
    };
  }, [ordersById, minute]);

  const counts = useMemo(() => {
    const cooking = entries.filter((entry) => entry.phase === 'cooking').length;
    return { all: entries.length, cooking, queued: entries.length - cooking };
  }, [entries]);

  const visible = useMemo(() => {
    if (filter === 'cooking') return entries.filter((entry) => entry.phase === 'cooking');
    if (filter === 'queued') return entries.filter((entry) => entry.phase !== 'cooking');
    return entries;
  }, [entries, filter]);

  // Callbacks estables: los tickets memorizados no se repintan por recibir
  // una función "nueva" en cada render del tablero.
  const handleReady = useCallback(async (order) => {
    const result = await markReady(order);
    if (result.success) addToast(`${orderLabel(order)} lista`, 'success', 2500);
    else addToast(result.message, 'error');
  }, [markReady, addToast]);

  const handleStart = useCallback(async (order) => {
    const result = await startOrder(order);
    if (!result.success) addToast(result.message, 'error');
  }, [startOrder, addToast]);

  const handleUndo = useCallback(async (order) => {
    const result = await undoReady(order);
    if (result.success) addToast(`${orderLabel(order)} regresó a cocina`, 'info', 2500);
    else addToast(result.message, 'error');
  }, [undoReady, addToast]);

  // Reparto: cuando Panchita arma un paquete lo anuncia en voz alta (y en
  // su panel) para que empaquen juntas esas órdenes. El anuncio va por una
  // ref porque Panchita, a su vez, consulta los paquetes para contestar
  // "¿quién se lleva la 12?".
  const announceRef = useRef(null);
  const { packageOf } = useDeliveryPackages({
    onAssigned: (pkg) => announceRef.current?.(spokenPackage(pkg)),
  });

  const panchita = useChefPanchita({
    entries,
    recentReady,
    catalog,
    kitchen,
    actions: { markReady, startOrder, undoReady },
    setDetailMode,
    packageOf,
  });

  const { announce } = panchita;
  useEffect(() => {
    announceRef.current = announce;
  }, [announce]);

  // Inicio de turno: un admin acaba de habilitar esta pantalla. Panchita da
  // la bienvenida una sola vez (recargar la página no la repite).
  // Se programa un instante después y se cancela en la limpieza: si React
  // monta-desmonta-monta en desarrollo (StrictMode), el desmontaje simulado
  // cancela la primera y se dice una sola vez, completa.
  const { welcome } = panchita;
  useEffect(() => {
    if (!welcomePending) return undefined;
    const timer = setTimeout(() => {
      welcome();
      consumeWelcome();
    }, 300);
    return () => clearTimeout(timer);
  }, [welcomePending, welcome, consumeWelcome]);

  return (
    <div className="h-dvh flex flex-col bg-bg kds-enter">
      <KitchenTopBar>
        <TopBarCounter value={counts.cooking} label="EN COCINA" />
        <TopBarCounter value={counts.queued} label="PENDIENTES" />
        <TopBarCounter value={recentReady.length} label="LISTAS" />
      </KitchenTopBar>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Filtros (botones) y leyenda de colores (solo informa) separados
              por aire: las píldoras de estación llevan borde y los filtros no. */}
          <div className="shrink-0 px-4 sm:px-7 py-3 flex flex-nowrap items-center gap-x-3 sm:gap-x-8">
            <nav className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar" aria-label="Filtrar comandas">
              {BOARD_FILTERS.map((option) => (
                <FilterPill
                  key={option.key}
                  label={option.label}
                  count={counts[option.key]}
                  active={filter === option.key}
                  onClick={() => setFilter(option.key)}
                />
              ))}
            </nav>
            <div className="hidden lg:block flex-1 min-w-0">
              <CategoryLegend />
            </div>
            <div className="ml-auto shrink-0">
              <DetailModeSwitch mode={detailMode} onChange={setDetailMode} />
            </div>
          </div>

          <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-7 pb-6 pt-1">
            <div className="lg:hidden mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
              <CategoryLegend nowrap />
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-ac bg-acsoft text-ac text-sm px-4 py-3 flex flex-wrap items-center gap-3" role="alert">
                <FAIcon icon="triangle-exclamation" size="sm" />
                <span className="flex-1 min-w-0">{error}</span>
                <button
                  type="button"
                  onClick={refetch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ac text-[13px] font-medium hover:bg-ac hover:text-surface transition-colors cursor-pointer"
                >
                  <FAIcon icon="rotate-right" size="sm" />
                  Reintentar
                </button>
              </div>
            )}

            {catalogError && detailed && (
              <p className="mb-4 text-[12.5px] text-warn flex items-center gap-2">
                <FAIcon icon="circle-info" size="sm" />
                {catalogError}
              </p>
            )}

            {loading ? (
              <div className="py-24 flex justify-center">
                <LoadingSpinner size="lg" color="gray" text="Cargando comandas..." />
              </div>
            ) : visible.length === 0 ? (
              <div className="py-24 flex flex-col items-center text-center">
                <span className="w-14 h-14 rounded-full border border-line text-ac flex items-center justify-center mb-4">
                  <FAIcon icon="check-circle" size="2xl" />
                </span>
                <p className="font-display text-lg text-ink">
                  {entries.length === 0 ? 'Sin comandas pendientes' : 'Nada en este filtro'}
                </p>
                <p className="text-sm text-muted mt-1">
                  {entries.length === 0
                    ? 'Las nuevas comandas aparecerán aquí al instante.'
                    : 'Cambia el filtro para ver el resto de las comandas.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 items-start pb-20 xl:pb-4" style={GRID_STYLE}>
                {visible.map((entry) => (
                  <OrderTicket
                    key={entry.order._id}
                    order={entry.order}
                    phase={entry.phase}
                    since={entry.since}
                    catalog={catalog}
                    detailed={detailed}
                    warningMinutes={kitchen.warningMinutes}
                    maxMinutes={kitchen.maxMinutes}
                    busy={busyIds.has(entry.order._id)}
                    onReady={handleReady}
                    onStart={handleStart}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        <ChefPanchitaPanel panchita={panchita} />
      </div>

      <RecentReadyBar orders={recentReady} busyIds={busyIds} onUndo={handleUndo} packageOf={packageOf} />
    </div>
  );
}
