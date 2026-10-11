// components/pos/ToDeliverList.jsx
//
// "Por entregar": pedidos ya pagados que el cliente recoge en la caja (ventas
// de mostrador y pedidos de la app para recoger). Se entregan cuando cocina
// los marca listos; al entregarlos se genera su factura de venta.
import { useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { money, sinceLabel, STATUS_LABELS } from '../../utils/format';

export default function ToDeliverList({ orders, loading, onDeliver }) {
  const [busyId, setBusyId] = useState(null);

  if (loading && orders.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">Cargando...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-10 text-center">
        <span className="mx-auto w-12 h-12 rounded-full border border-line bg-surfalt flex items-center justify-center text-muted">
          <FAIcon icon="shopping-bag" size="lg" />
        </span>
        <p className="text-ink font-semibold mt-3">Nada por entregar</p>
        <p className="text-sm text-muted mt-1">Las ventas de mostrador y los pedidos pagados para recoger aparecen aquí.</p>
      </div>
    );
  }

  const ready = orders.filter((o) => o.status === 'ready');
  const cooking = orders.filter((o) => o.status !== 'ready');

  const handleDeliver = async (order) => {
    setBusyId(order.orderId);
    try {
      await onDeliver(order);
    } finally {
      setBusyId(null);
    }
  };

  const card = (order) => {
    const isReady = order.status === 'ready';
    return (
      <div key={order.orderId} className={`rounded-lg overflow-hidden border bg-surface flex flex-col ${isReady ? 'border-ok border-t-2' : 'border-line'}`}>
        <div className="px-4 py-3 border-b border-line flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display font-semibold text-ink">
              {order.kitchenNumber != null && <span className="num text-2xl mr-2">{order.kitchenNumber}</span>}
              <span className="num text-[13px] text-inkalt">{order.code}</span>
            </p>
            <p className="text-[13px] text-muted truncate mt-0.5">
              {order.customerName} · {order.source === 'counter' ? 'mostrador' : 'app'}
            </p>
          </div>
          <span className={`kick px-2 py-0.5 rounded shrink-0 ${isReady ? 'bg-oksoft text-ok' : 'bg-warnsoft text-warn'}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
        <ul className="px-4 py-2 text-[13px] text-inkalt flex-1">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="py-0.5">
              <span className="num text-muted mr-1.5">{item.quantity}×</span>
              {item.name}
            </li>
          ))}
        </ul>
        <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-3">
          <span className="text-[12px] text-muted">{money(order.total)} · {sinceLabel(order.createdAt)}</span>
          <button
            type="button"
            onClick={() => handleDeliver(order)}
            disabled={!isReady || busyId === order.orderId}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-ok text-white text-[13px] font-display font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
            title={isReady ? 'Entregar al cliente' : 'Cocina todavía no lo marca como listo'}
          >
            <FAIcon icon="hand-coins" size="sm" />
            {busyId === order.orderId ? 'Entregando...' : 'Entregar'}
          </button>
        </div>
      </div>
    );
  };

  const grid = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' };

  return (
    <div className="space-y-7">
      <section>
        <p className="kick text-inkalt mb-3">LISTOS PARA ENTREGAR · <span className="num">{ready.length}</span></p>
        {ready.length === 0 ? (
          <p className="text-sm text-inkalt border border-dashed border-linealt rounded-lg px-4 py-3">Ninguno listo todavía.</p>
        ) : (
          <div className="grid gap-3" style={grid}>{ready.map(card)}</div>
        )}
      </section>
      {cooking.length > 0 && (
        <section>
          <p className="kick text-inkalt mb-3">EN COCINA · <span className="num">{cooking.length}</span></p>
          <div className="grid gap-3" style={grid}>{cooking.map(card)}</div>
        </section>
      )}
    </div>
  );
}
