// components/shift/CloseShiftModal.jsx
//
// Arqueo y cierre del turno. El cajero cuenta el efectivo de la gaveta por
// billete y moneda SIN ver cuánto debería haber (arqueo a ciegas: así nadie
// "ajusta" el conteo para que cuadre). La diferencia aparece en el corte Z
// que se imprime al cerrar.
import { useMemo, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import FormModal, { FORM_INPUT, FORM_LABEL } from '@syscor/web-shared/src/components/FormModal';
import cashierApi, { apiMessage } from '../../services/cashierApi';
import { money, round2 } from '../../utils/format';

// Dólares: billetes y monedas que circulan en El Salvador
const DENOMINATIONS = [
  { value: 100, label: '$100', kind: 'bill' },
  { value: 50, label: '$50', kind: 'bill' },
  { value: 20, label: '$20', kind: 'bill' },
  { value: 10, label: '$10', kind: 'bill' },
  { value: 5, label: '$5', kind: 'bill' },
  { value: 1, label: '$1', kind: 'bill' },
  { value: 1, label: '$1', kind: 'coin', key: 'coin1' },
  { value: 0.25, label: '25¢', kind: 'coin' },
  { value: 0.1, label: '10¢', kind: 'coin' },
  { value: 0.05, label: '5¢', kind: 'coin' },
  { value: 0.01, label: '1¢', kind: 'coin' },
];
const keyOf = (d) => d.key || `${d.kind}${d.value}`;

export default function CloseShiftModal({ session, onClose, onClosed }) {
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const counted = useMemo(
    () => round2(DENOMINATIONS.reduce((sum, d) => sum + (Number(counts[keyOf(d)]) || 0) * d.value, 0)),
    [counts]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await cashierApi.post('/cashier/session/close', { countedCash: counted, notes });
      onClosed(data.data);
    } catch (err) {
      setError(apiMessage(err, 'No se pudo cerrar el turno.'));
      setSaving(false);
    }
  };

  const renderGroup = (kind) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {DENOMINATIONS.filter((d) => d.kind === kind).map((d) => (
        <label key={keyOf(d)} className="flex items-center gap-2 border border-line rounded-lg px-2.5 py-1.5 bg-white dark:bg-surface">
          <span className="num text-[13px] text-inkalt w-11 shrink-0">{d.label}</span>
          <span className="text-muted text-xs">×</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            className="w-full bg-transparent num text-right text-[14px] text-ink focus:outline-none no-spin"
            value={counts[keyOf(d)] ?? ''}
            onChange={(e) => setCounts((prev) => ({ ...prev, [keyOf(d)]: e.target.value.replace(/\D/g, '') }))}
            placeholder="0"
            aria-label={`Cantidad de ${d.kind === 'bill' ? 'billetes' : 'monedas'} de ${d.label}`}
          />
        </label>
      ))}
    </div>
  );

  return (
    <FormModal
      icon="lock"
      title="Cerrar caja"
      badge={session.code}
      subtitle={`Arqueo del turno de ${session.cashier?.name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={`Cerrar con ${money(counted)}`}
      submitIcon="lock"
      submitting={saving}
      maxWidth="max-w-2xl"
      footerNote="Al cerrar, la caja deja de cobrar hasta que se abra otro turno"
    >
      <div className="bg-white dark:bg-surface rounded-xl border border-line p-4 shadow-2xs space-y-4">
        <p className="text-[13px] text-inkalt leading-relaxed flex items-start gap-2">
          <FAIcon icon="circle-info" size="sm" className="text-ac mt-0.5 shrink-0" />
          Cuenta todo el efectivo de la gaveta, incluido el fondo inicial. El sistema compara tu conteo con lo
          esperado y lo muestra en el corte Z.
        </p>
        <div>
          <p className="kick text-ink mb-2">BILLETES</p>
          {renderGroup('bill')}
        </div>
        <div>
          <p className="kick text-ink mb-2">MONEDAS</p>
          {renderGroup('coin')}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border border-ac bg-acsoft">
          <span className="kick text-inkalt">EFECTIVO CONTADO</span>
          <span className="num text-3xl font-semibold text-ink">{money(counted)}</span>
        </div>
        <div>
          <label htmlFor="close-notes" className={FORM_LABEL}>Notas (opcional)</label>
          <textarea
            id="close-notes"
            rows={2}
            className={`${FORM_INPUT} resize-none`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            placeholder="Algo que deba saber el administrador"
          />
        </div>
        {error && (
          <p className="text-ac text-xs font-medium flex items-center gap-1.5" role="alert">
            <FAIcon icon="circle-exclamation" size="xs" />
            {error}
          </p>
        )}
      </div>
    </FormModal>
  );
}
