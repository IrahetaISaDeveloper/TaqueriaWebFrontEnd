// components/cashier/AdminCloseShiftModal.jsx
//
// El administrador cierra un turno desde el panel (ej. el cajero se fue sin
// cerrar). Puede escribir el efectivo que contó él mismo, o dejarlo vacío:
// en ese caso el corte queda "sin arqueo".
import { useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import FormModal, { FORM_INPUT, FORM_LABEL } from '@syscor/web-shared/src/components/FormModal';

export default function AdminCloseShiftModal({ session, busy, onClose, onSubmit }) {
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  if (!session) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await onSubmit(session.id, {
      countedCash: countedCash === '' ? null : Number(countedCash),
      notes,
    });
    if (!result.success) setError(result.message);
  };

  return (
    <FormModal
      icon="lock"
      title="Cerrar turno de caja"
      badge={session.code}
      subtitle={`Turno de ${session.cashier?.name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Cerrar turno"
      submitIcon="lock"
      submitting={busy}
      maxWidth="max-w-md"
    >
      <div className="bg-white dark:bg-surface rounded-xl border border-line p-4 shadow-2xs space-y-4">
        <p className="text-[13px] text-inkalt leading-relaxed">
          La caja deja de cobrar en este momento y vuelve a la pantalla de caja cerrada. Lo ideal es que el cajero
          haga el arqueo desde la caja; usa esto si no puede hacerlo.
        </p>
        <div>
          <label htmlFor="admin-counted" className={FORM_LABEL}>Efectivo contado (opcional)</label>
          <input
            id="admin-counted"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            placeholder="Vacío = cerrar sin arqueo"
            className={`${FORM_INPUT} num`}
          />
        </div>
        <div>
          <label htmlFor="admin-close-notes" className={FORM_LABEL}>Notas</label>
          <textarea
            id="admin-close-notes"
            rows={2}
            maxLength={300}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${FORM_INPUT} resize-none`}
            placeholder="Motivo del cierre"
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
