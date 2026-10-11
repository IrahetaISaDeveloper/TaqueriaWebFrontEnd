// components/kitchen/RecentReadyBar.jsx
//
// "Listas recientes": las comandas que se marcaron como listas en los
// últimos minutos. Sirve de comprobante (sobre todo si se marcaron por voz)
// y para regresar a cocina una que se marcó por error. En las de domicilio
// muestra con qué repartidor sale y con cuáles va en el mismo paquete.
import { memo } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { orderCode } from '@syscor/web-shared/src/utils/orderCode';
import { useClockMinute } from '../../hooks/useKitchenClock';
import { readyAt } from '../../utils/orderPhase';

const agoLabel = (minutes) => (minutes < 1 ? 'ahora' : `hace ${minutes} min`);

function RecentReadyBar({ orders, busyIds, onUndo, packageOf }) {
  // Una vez por minuto basta para "hace N min"
  const minute = useClockMinute();

  if (orders.length === 0) return null;

  return (
    <section className="shrink-0 border-t border-line bg-surface px-4 sm:px-7 py-3 pr-24 xl:pr-7" aria-label="Listas recientes">
      <div className="flex items-center gap-3 overflow-x-auto">
        <p className="kick text-inkalt shrink-0 inline-flex items-center gap-1.5 mr-1">
          <FAIcon icon="check-circle" size="sm" className="text-ac" />
          LISTAS RECIENTES
        </p>
        {orders.map((order) => {
          const minutes = Math.max(0, Math.floor((minute * 60000 - readyAt(order)) / 60000));
          const busy = busyIds.has(order._id);
          const pkg = packageOf?.(orderCode(order));
          const partners = pkg ? pkg.numbers.filter((n) => n !== order.kitchenNumber) : [];
          return (
            <div key={order._id} className="shrink-0 inline-flex items-center gap-2.5 border border-line rounded-md bg-surface pl-3 pr-1 py-1">
              {order.kitchenNumber != null && <span className="num text-[15px] font-semibold text-ink">{order.kitchenNumber}</span>}
              <span className="num text-[13px] text-inkalt">{orderCode(order)}</span>
              <span className="text-[11px] text-muted">{agoLabel(minutes)}</span>
              {pkg && (
                <span
                  className="inline-flex items-center gap-1 rounded bg-acsoft px-1.5 py-0.5 text-[11.5px] font-medium text-ac"
                  title={`Paquete ${pkg.packageCode}`}
                >
                  <FAIcon icon="motorcycle" size="xs" />
                  {pkg.driverName}
                  {partners.length > 0 && <span className="text-inkalt font-normal">· con {partners.join(', ')}</span>}
                </span>
              )}
              <button
                type="button"
                onClick={() => onUndo(order)}
                disabled={busy}
                title="Regresar a cocina"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12.5px] text-ac hover:bg-acsoft transition-colors disabled:opacity-60 cursor-pointer"
              >
                <FAIcon icon="rotate-left" size="xs" />
                Regresar
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default memo(RecentReadyBar);
