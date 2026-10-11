// components/pos/ShiftReceipts.jsx
//
// "Cobros del turno": los comprobantes emitidos en este turno, del más
// reciente al más antiguo, para consultarlos o reimprimirlos.
import { useEffect, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { useSocketEvent } from '@syscor/web-shared/src/hooks/useSocket';
import cashierApi, { apiMessage } from '../../services/cashierApi';
import { DEVICE_EVENTS } from '../../constants/deviceEvents';
import { money, formatClock, DOCUMENT_LABELS, SOURCE_LABELS } from '../../utils/format';

export default function ShiftReceipts({ onOpen }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    cashierApi
      .get('/cashier/receipts')
      .then(({ data }) => {
        if (!ignore) {
          setReceipts(data.receipts || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) setError(apiMessage(err, 'No se pudieron cargar los cobros.'));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useSocketEvent(DEVICE_EVENTS.REFRESH, () => setReloadKey((k) => k + 1));

  if (loading) return <p className="text-sm text-muted py-10 text-center">Cargando los cobros del turno...</p>;
  if (error) return <p className="text-sm text-warn border border-warn bg-warnsoft rounded-lg px-4 py-3">{error}</p>;
  if (receipts.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-10 text-center">
        <span className="mx-auto w-12 h-12 rounded-full border border-line bg-surfalt flex items-center justify-center text-muted">
          <FAIcon icon="receipt" size="lg" />
        </span>
        <p className="text-ink font-semibold mt-3">Todavía no hay cobros en este turno</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="kick text-muted border-b border-line">
            <th className="py-3 px-4">HORA</th>
            <th className="py-3 px-4">DOCUMENTO</th>
            <th className="py-3 px-4">NÚMERO DE CONTROL</th>
            <th className="py-3 px-4">ORIGEN</th>
            <th className="py-3 px-4">PAGO</th>
            <th className="py-3 px-4 text-right">COBRADO</th>
            <th className="py-3 px-4 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-[13px]">
          {receipts.map((receipt) => (
            <tr key={receipt.id} className="hover:bg-surfalt/50 transition-colors">
              <td className="py-3 px-4 num text-ink">{formatClock(receipt.issuedAt)}</td>
              <td className="py-3 px-4">
                <span className={`kick px-2 py-0.5 rounded ${receipt.documentType === 'ccf' ? 'bg-infosoft text-info' : 'bg-acsoft text-ac'}`}>
                  {DOCUMENT_LABELS[receipt.documentType]}
                </span>
              </td>
              <td className="py-3 px-4 num text-[12px] text-muted">{receipt.controlNumber}</td>
              <td className="py-3 px-4 text-inkalt">
                {receipt.source.kind === 'table' ? `Mesa ${receipt.source.tableNumber}` : SOURCE_LABELS[receipt.source.kind]}
                {receipt.source.orderCodes?.length > 0 && <span className="num text-muted text-[12px]"> · {receipt.source.orderCodes.join(', ')}</span>}
              </td>
              <td className="py-3 px-4 text-inkalt">
                <span className="inline-flex items-center gap-1.5">
                  <FAIcon icon={receipt.payment.method === 'cash' ? 'money-bill' : 'credit-card'} size="sm" className="text-muted" />
                  {receipt.payment.method === 'cash' ? 'Efectivo' : `${receipt.payment.cardBrand} ${receipt.payment.cardLast4}`}
                </span>
              </td>
              <td className="py-3 px-4 text-right num font-semibold text-ink">{money(receipt.amountDue)}</td>
              <td className="py-3 px-4 text-right">
                <button
                  type="button"
                  onClick={() => onOpen(receipt)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-line text-muted hover:border-ac hover:text-ac transition-colors cursor-pointer"
                  title="Ver y reimprimir"
                  aria-label={`Ver comprobante ${receipt.controlNumber}`}
                >
                  <FAIcon icon="printer" size="sm" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
