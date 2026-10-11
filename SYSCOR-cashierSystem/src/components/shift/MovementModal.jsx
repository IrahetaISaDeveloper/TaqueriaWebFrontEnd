// components/shift/MovementModal.jsx
//
// Entrada o salida de efectivo que no es una venta: un retiro a caja fuerte
// cuando la gaveta se llena, cambio en monedas que trae el gerente, etc.
// Quedan en el corte y cuentan para el efectivo esperado.
import { useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import FormModal, { FORM_INPUT, FORM_LABEL } from '@syscor/web-shared/src/components/FormModal';
import cashierApi, { apiMessage } from '../../services/cashierApi';

const REASONS = {
  out: ['Retiro a caja fuerte', 'Pago a proveedor', 'Compra menor'],
  in: ['Cambio en monedas', 'Reposición de fondo'],
};

export default function MovementModal({ onClose, onSaved }) {
  const [type, setType] = useState('out');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await cashierApi.post('/cashier/movements', { type, amount: Number(amount), reason });
      onSaved(data);
    } catch (err) {
      setError(apiMessage(err, 'No se pudo registrar el movimiento.'));
      setSaving(false);
    }
  };

  return (
    <FormModal
      icon="hand-coins"
      title="Movimiento de efectivo"
      subtitle="Entradas y salidas de la gaveta que no son ventas"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Registrar"
      submitting={saving}
      submitDisabled={!amount || Number(amount) <= 0 || !reason.trim()}
      maxWidth="max-w-md"
    >
      <div className="bg-white dark:bg-surface rounded-xl border border-line p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surfalt border border-line rounded-lg">
          {[
            { value: 'out', label: 'Salida', icon: 'arrow-up' },
            { value: 'in', label: 'Entrada', icon: 'arrow-down' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { setType(option.value); setReason(''); }}
              className={`px-3 py-2 rounded-md text-[13px] font-display font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                type === option.value ? 'bg-ac text-white' : 'text-inkalt hover:text-ac'
              }`}
            >
              <FAIcon icon={option.icon} size="sm" />
              {option.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="movement-amount" className={FORM_LABEL}>Monto</label>
          <input
            id="movement-amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            autoFocus
            className={`${FORM_INPUT} num no-spin text-xl text-right`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="movement-reason" className={FORM_LABEL}>Motivo</label>
          <input
            id="movement-reason"
            className={FORM_INPUT}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={120}
            placeholder="Escribe el motivo"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {REASONS[type].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className="px-2.5 py-1 border border-line rounded-full text-[12px] text-inkalt hover:border-ac hover:text-ac transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
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
