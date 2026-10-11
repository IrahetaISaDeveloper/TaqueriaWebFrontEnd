// components/pos/ChargeQueue.jsx
//
// "Por cobrar": las mesas con cuenta abierta (primero las que el mesero
// mandó a caja) y los pedidos de la app que el cliente paga al recoger. A la
// izquierda la lista; a la derecha el detalle de la seleccionada y su cobro.
import { useMemo, useRef, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { money, sinceLabel, STATUS_LABELS, formatClock } from '../../utils/format';
import { buildTableCharge, buildPickupCharge } from '../../utils/counterCharge';

const keyOfTable = (tab) => `table:${tab.tableId}`;
const keyOfPickup = (p) => `pickup:${p.orderId}`;

// Estado de una comanda: píldora con fondo suave
const StatusChip = ({ status }) => (
  <span className={`kick px-2 py-0.5 rounded ${
    status === 'ready' ? 'bg-oksoft text-ok' : status === 'delivered' ? 'bg-acsoft text-ac' : 'bg-warnsoft text-warn'
  }`}>
    {STATUS_LABELS[status] || status}
  </span>
);

// Estado de la cuenta en la tarjeta: punto + versalitas
const StateDot = ({ tone, children }) => (
  <span className={`kick inline-flex items-center gap-1.5 ${tone}`}>
    <span className="w-1 h-1 rounded-full bg-current" />
    {children}
  </span>
);

// Tarjeta de la lista. Seleccionada: borde y fondo de acento, sin sombra ni
// desenfoque, para que se lea limpia.
const ListButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-4 py-3.5 rounded-lg border transition-colors cursor-pointer ${
      active ? 'border-ac bg-acsoft' : 'border-line bg-surface hover:border-linealt'
    }`}
  >
    {children}
  </button>
);

const EmptyBlock = ({ icon, text }) => (
  <p className="text-sm text-inkalt border border-dashed border-linealt rounded-lg px-4 py-4 flex items-center gap-2.5">
    <FAIcon icon={icon} className="text-ac" />
    {text}
  </p>
);

export default function ChargeQueue({ tables, pickups, loading, onCharge }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const detailRef = useRef(null);

  // En una columna (teléfono/tablet) el detalle queda debajo de la lista:
  // al elegir una cuenta se lleva a la vista.
  const select = (key) => {
    setSelectedKey(key);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const entries = useMemo(
    () => [
      ...tables.map((tab) => ({ key: keyOfTable(tab), kind: 'table', data: tab })),
      ...pickups.map((p) => ({ key: keyOfPickup(p), kind: 'pickup', data: p })),
    ],
    [tables, pickups]
  );
  // Si la seleccionada ya se cobró (o nunca hubo), se muestra la primera
  const selected = entries.find((e) => e.key === selectedKey) || entries[0] || null;

  if (loading && entries.length === 0) {
    return <p className="text-sm text-muted px-1 py-10 text-center">Cargando lo pendiente de cobro...</p>;
  }

  const startCharge = () => {
    if (!selected) return;
    onCharge(selected.kind === 'table' ? buildTableCharge(selected.data) : buildPickupCharge(selected.data));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* --- Lista --- */}
      <div className="lg:col-span-6 space-y-7">
        <section>
          <p className="kick text-inkalt mb-3">MESAS · <span className="num">{tables.length}</span></p>
          {tables.length === 0 ? (
            <EmptyBlock icon="armchair" text="Ninguna mesa tiene cuenta pendiente." />
          ) : (
            <div className="space-y-2.5">
              {tables.map((tab) => (
                <ListButton
                  key={keyOfTable(tab)}
                  active={selected?.key === keyOfTable(tab)}
                  onClick={() => select(keyOfTable(tab))}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-ink text-[15px]">
                        Mesa {tab.number}
                        {tab.customerName && <span className="font-sans font-normal text-muted text-[13px]"> · {tab.customerName}</span>}
                      </p>
                      <p className="text-[12.5px] text-inkalt mt-1">
                        {tab.orders.length} {tab.orders.length === 1 ? 'ronda' : 'rondas'} · abierta {sinceLabel(tab.occupiedAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="num text-[17px] font-semibold text-ink">{money(tab.total)}</p>
                      {tab.billRequestedAt ? (
                        <StateDot tone="text-ac">CUENTA PEDIDA</StateDot>
                      ) : tab.allServed ? (
                        <StateDot tone="text-ac">TODO SERVIDO</StateDot>
                      ) : (
                        <StateDot tone="text-warn">EN CURSO</StateDot>
                      )}
                    </div>
                  </div>
                </ListButton>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="kick text-inkalt mb-3">PARA RECOGER · <span className="num">{pickups.length}</span></p>
          {pickups.length === 0 ? (
            <EmptyBlock icon="shopping-bag" text="Los pedidos de la app para recoger aparecen aquí cuando cocina los marca listos." />
          ) : (
            <div className="space-y-2.5">
              {pickups.map((p) => (
                <ListButton key={keyOfPickup(p)} active={selected?.key === keyOfPickup(p)} onClick={() => select(keyOfPickup(p))}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-ink text-[15px]">
                        <span className="num">{p.code}</span>
                        {p.kitchenNumber != null && <span className="text-muted font-normal text-[13px]"> · orden {p.kitchenNumber}</span>}
                      </p>
                      <p className="text-[12.5px] text-inkalt mt-1 truncate">{p.customerName}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="num text-[17px] font-semibold text-ink">{money(p.amountDue)}</p>
                      <span className="kick px-2 py-0.5 rounded bg-oksoft text-ok">LISTO {sinceLabel(p.readyAt).toUpperCase()}</span>
                    </div>
                  </div>
                </ListButton>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* --- Detalle --- */}
      <div className="lg:col-span-6 scroll-mt-2" ref={detailRef}>
        {!selected ? (
          <div className="rounded-lg border border-line bg-surface p-10 text-center">
            <span className="mx-auto w-12 h-12 rounded-full border border-line bg-surfalt flex items-center justify-center text-muted">
              <FAIcon icon="check-circle" size="lg" />
            </span>
            <p className="text-ink font-semibold mt-3">Todo cobrado</p>
            <p className="text-sm text-muted mt-1">Las cuentas nuevas aparecen aquí solas.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-linealt bg-surface border-t-2 border-t-ac overflow-hidden lg:sticky lg:top-0">
            {/* En el teléfono la etiqueta "pedida" va arriba, para no apretar el título */}
            <div className="px-5 pt-5 pb-4 border-b border-line flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="kick text-ac">{selected.kind === 'table' ? 'CUENTA DE MESA' : 'PEDIDO PARA RECOGER'}</p>
                <h2 className="font-display font-bold text-2xl text-ink mt-2">
                  {selected.kind === 'table' ? `Mesa ${selected.data.number}` : selected.data.code}
                </h2>
                <p className="text-[14px] text-inkalt mt-1">
                  {selected.kind === 'table'
                    ? [selected.data.customerName, selected.data.peopleCount ? `${selected.data.peopleCount} personas` : null, selected.data.waiters.length ? `Mesero: ${selected.data.waiters.join(', ')}` : null].filter(Boolean).join(' · ')
                    : `${selected.data.customerName}${selected.data.scheduledFor ? ` · programado ${formatClock(selected.data.scheduledFor)}` : ''}`}
                </p>
              </div>
              {selected.kind === 'table' && selected.data.billRequestedAt && (
                <span className="kick text-ac bg-acsoft rounded px-2 py-1 shrink-0">
                  PEDIDA {sinceLabel(selected.data.billRequestedAt).toUpperCase()}
                </span>
              )}
            </div>

            {selected.kind === 'table' && (
              <div className="px-5 pt-4 flex flex-wrap gap-x-5 gap-y-2">
                {selected.data.orders.map((order) => (
                  <span key={order.id} className="inline-flex items-center gap-2.5 text-[13px]">
                    <span className="num font-semibold text-ink">{order.code}</span>
                    {order.round && <span className="text-inkalt">ronda {order.round}</span>}
                    <StatusChip status={order.waiting ? 'pending' : order.status} />
                  </span>
                ))}
              </div>
            )}

            <ul className="px-5 py-3 max-h-[42vh] overflow-y-auto">
              {selected.data.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="py-2.5 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex gap-3">
                    <span className="num text-[13px] text-inkalt pt-0.5 w-6 shrink-0">{item.quantity}×</span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-ink">{item.name}</p>
                      {item.notes && <p className="text-[12.5px] text-inkalt mt-0.5">↳ {item.notes}</p>}
                    </div>
                  </div>
                  <span className="num text-[14px] text-ink shrink-0">{money(item.total)}</span>
                </li>
              ))}
            </ul>

            <div className="px-5 py-5 border-t border-line space-y-1.5">
              {selected.kind === 'pickup' && selected.data.creditApplied > 0 && (
                <>
                  <div className="flex justify-between text-[13px] text-inkalt"><span>Total</span><span className="num">{money(selected.data.total)}</span></div>
                  <div className="flex justify-between text-[13px] text-muted"><span>Saldo a favor del cliente</span><span className="num">−{money(selected.data.creditApplied)}</span></div>
                </>
              )}
              <div className="flex items-baseline justify-between">
                <span className="kick text-inkalt">A COBRAR</span>
                <span className="num text-[38px] font-semibold text-ink leading-none">
                  {money(selected.kind === 'table' ? selected.data.total : selected.data.amountDue)}
                </span>
              </div>
            </div>

            <div className="px-5 pb-5">
              {selected.kind === 'table' && selected.data.blocked ? (
                <p className="text-[13px] text-warn border border-warn bg-warnsoft rounded-lg px-3 py-2.5 flex items-start gap-2">
                  <FAIcon icon="triangle-exclamation" size="sm" className="mt-0.5" />
                  Esta mesa tiene un segundo tiempo esperando a que el mesero lo marche. Debe marcharlo o cancelarlo antes de cobrar.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={startCharge}
                  className="w-full py-3 rounded-lg border border-ac text-ac hover:bg-ac hover:text-white font-display font-semibold text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <FAIcon icon="cash-register" />
                  Cobrar {money(selected.kind === 'table' ? selected.data.total : selected.data.amountDue)}
                </button>
              )}
              {selected.kind === 'table' && !selected.data.allServed && !selected.data.blocked && (
                <p className="text-[12px] text-muted mt-2">Hay comandas que aún no se sirven: al cobrar quedan marcadas como entregadas.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
