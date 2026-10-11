// components/cashier/ShiftReportModal.jsx
//
// Corte de un turno de caja visto desde el panel: el resumen (ventas, formas
// de pago, efectivo esperado contra contado) y los comprobantes que se
// emitieron. Se imprime con el mismo formato que la caja (corte X si el
// turno sigue abierto, Z si ya cerró).
import { useEffect, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import {
  ModalShell,
  ModalHeader,
  ModalBody,
  ModalFooter,
  MODAL_BTN_PRIMARY,
  MODAL_BTN_SECONDARY,
} from '@syscor/web-shared/src/components/FormModal';
import { buildShiftReportHtml, buildReceiptHtml, printHtml } from '@syscor/web-shared/src/utils/cashierDocuments';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const Stat = ({ label, value, hint, tone }) => (
  <div className="border border-line bg-white dark:bg-surface px-3.5 py-3">
    <p className="kick text-muted">{label}</p>
    <p className={`num text-xl mt-1 ${tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : tone === 'ac' ? 'text-ac' : 'text-ink'}`}>{value}</p>
    {hint && <p className="text-[11.5px] text-muted mt-0.5">{hint}</p>}
  </div>
);

export default function ShiftReportModal({ sessionId, fetchReport, onClose }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return undefined;
    let ignore = false;
    fetchReport(sessionId).then((result) => {
      if (ignore) return;
      if (result.success) setReport(result);
      else setError(result.message);
    });
    return () => {
      ignore = true;
    };
  }, [sessionId, fetchReport]);

  if (!sessionId) return null;

  const session = report?.session;
  const s = session?.summary || {};
  const isClosed = session?.status === 'closed';
  const diff = session?.difference;

  return (
    <ModalShell maxWidth="max-w-3xl">
      <ModalHeader
        icon="receipt"
        title={session ? `Corte ${isClosed ? 'Z' : 'X'} · ${session.code}` : 'Corte de caja'}
        subtitle={session ? `${session.cashier?.name} · ${formatDateTime(session.openedAt)}${isClosed ? ` → ${formatDateTime(session.closedAt)}` : ' · turno abierto'}` : undefined}
        onClose={onClose}
      />
      <ModalBody>
        {error ? (
          <p className="text-sm text-ac">{error}</p>
        ) : !session ? (
          <p className="text-sm text-muted py-8 text-center">Cargando el corte...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Stat label="VENTAS" value={money(s.sales)} hint={`${s.receipts ?? 0} comprobantes`} />
              <Stat label="EFECTIVO" value={money(s.byMethod?.cash?.amount)} hint={`${s.byMethod?.cash?.count ?? 0} cobros`} />
              <Stat label="TARJETA" value={money(s.byMethod?.card?.amount)} hint={`${s.byMethod?.card?.count ?? 0} cobros`} />
              <Stat label="PROPINAS" value={money(s.tips)} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Stat label="FONDO INICIAL" value={money(s.openingFloat)} />
              <Stat label="ESPERADO" value={money(s.expectedCash)} hint={`Entradas ${money(s.movementsIn)} · salidas ${money(s.movementsOut)}`} />
              <Stat label="CONTADO" value={isClosed && session.countedCash !== null ? money(session.countedCash) : '—'} />
              <Stat
                label="DIFERENCIA"
                value={!isClosed ? 'Abierto' : diff === null ? 'Sin arqueo' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${money(Math.abs(diff))}`}
                hint={isClosed && diff !== null ? (diff === 0 ? 'Cuadrada' : diff > 0 ? 'Sobrante' : 'Faltante') : undefined}
                tone={!isClosed || diff === null ? undefined : diff === 0 ? 'ok' : diff > 0 ? 'warn' : 'ac'}
              />
            </div>

            {session.closingNotes && (
              <p className="text-[13px] text-inkalt border border-line bg-white dark:bg-surface px-3.5 py-2.5">
                <span className="kick text-muted mr-2">NOTAS</span>{session.closingNotes}
              </p>
            )}

            <div className="border border-line bg-white dark:bg-surface">
              <p className="kick text-ink px-4 py-2.5 border-b border-line">COMPROBANTES · <span className="num">{report.receipts.length}</span></p>
              {report.receipts.length === 0 ? (
                <p className="text-sm text-muted px-4 py-4">No se cobró nada en este turno.</p>
              ) : (
                <ul className="divide-y divide-line max-h-64 overflow-y-auto">
                  {report.receipts.map((receipt) => (
                    <li key={receipt.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[13px]">
                      <div className="min-w-0">
                        <p className="text-ink">
                          {receipt.documentType === 'ccf' ? 'Crédito Fiscal' : 'Factura'}
                          <span className="text-muted"> · {receipt.source.kind === 'table' ? `Mesa ${receipt.source.tableNumber}` : receipt.source.kind === 'pickup' ? 'Para recoger' : 'Mostrador'}</span>
                        </p>
                        <p className="num text-[11.5px] text-muted truncate">{receipt.controlNumber}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="num text-ink">{money(receipt.amountDue)}</span>
                        <button
                          type="button"
                          onClick={async () => printHtml(await buildReceiptHtml(receipt, report.issuer, { copy: true }))}
                          className="w-7 h-7 inline-flex items-center justify-center border border-line text-muted hover:border-ac hover:text-ac cursor-pointer"
                          title="Imprimir copia"
                          aria-label={`Imprimir copia de ${receipt.controlNumber}`}
                        >
                          <FAIcon icon="printer" size="xs" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter note="Cobros simulados · comprobantes de prueba">
        <button type="button" onClick={onClose} className={MODAL_BTN_SECONDARY}>Cerrar</button>
        <button
          type="button"
          disabled={!session}
          onClick={() => printHtml(buildShiftReportHtml(session, report.issuer, isClosed ? 'Z' : 'X'))}
          className={MODAL_BTN_PRIMARY}
        >
          <FAIcon icon="printer" size="xs" />
          Imprimir corte
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
