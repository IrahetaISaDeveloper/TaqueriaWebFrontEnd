// components/cashier/OpenShiftModal.jsx
//
// Abrir un turno de caja. Dos usos:
//   - Caja nueva (sin `device`): se escribe el código que muestra la caja en
//     su lobby; al confirmar se empareja, se habilita el sistema si estaba
//     apagado y se abre el turno.
//   - Caja ya emparejada (`device`): solo se elige cajero y fondo inicial.
import { useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import {
  ModalShell,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FORM_LABEL,
  FORM_INPUT,
  MODAL_BTN_PRIMARY,
  MODAL_BTN_SECONDARY,
} from '@syscor/web-shared/src/components/FormModal';

const CODE_LENGTH = 6;
const MAX_FLOAT = 2000;

export default function OpenShiftModal({ isOpen, device, cashiers, busy, enablesSystem, onClose, onSubmit }) {
  const [code, setCode] = useState('');
  const [cashierId, setCashierId] = useState('');
  const [openingFloat, setOpeningFloat] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const needsCode = !device;

  const close = () => {
    setCode('');
    setCashierId('');
    setOpeningFloat('');
    setError(null);
    onClose();
  };

  const floatNum = Number(openingFloat);
  const valid =
    (!needsCode || code.length === CODE_LENGTH) &&
    cashierId &&
    openingFloat !== '' &&
    Number.isFinite(floatNum) &&
    floatNum >= 0 &&
    floatNum <= MAX_FLOAT;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    const result = await onSubmit({ code, cashierId, openingFloat: floatNum, deviceId: device?.deviceId });
    if (result.success) close();
    else setError(result.message);
  };

  return (
    <ModalShell maxWidth="max-w-md">
      <ModalHeader
        icon="cash-register"
        title={needsCode ? (enablesSystem ? 'Habilitar sistema de caja' : 'Emparejar otra caja') : 'Abrir turno'}
        subtitle={needsCode ? 'Escribe el código que muestra la caja y abre su turno' : `${device.label} · ${device.shortId}`}
        onClose={busy ? undefined : close}
      />
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="bg-white dark:bg-surface rounded-xl border border-line p-4 shadow-2xs space-y-4">
            {needsCode && (
              <div>
                <label htmlFor="cashier-pairing-code" className={FORM_LABEL}>Código de la caja</label>
                <input
                  id="cashier-pairing-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={CODE_LENGTH + 1}
                  value={code.length > 3 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH));
                    setError(null);
                  }}
                  placeholder="000 000"
                  disabled={busy}
                  className="w-full mt-1 px-3 py-3 rounded-lg bg-white dark:bg-surface border border-line focus:border-ac focus:outline-none num text-3xl tracking-[0.2em] text-center text-ink placeholder:text-muted/50"
                />
              </div>
            )}

            <div>
              <label htmlFor="shift-cashier" className={FORM_LABEL}>Cajero del turno</label>
              {cashiers.length === 0 ? (
                <p className="mt-1 text-[12.5px] text-warn border border-warn bg-warnsoft px-3 py-2">
                  No hay empleados activos con el puesto <strong>Cajero</strong>. Créalo en Empleados o Invitaciones.
                </p>
              ) : (
                <select
                  id="shift-cashier"
                  value={cashierId}
                  onChange={(e) => {
                    setCashierId(e.target.value);
                    setError(null);
                  }}
                  disabled={busy}
                  className={FORM_INPUT}
                >
                  <option value="">Elige al cajero</option>
                  {cashiers.map((cashier) => (
                    <option key={cashier.id} value={cashier.id}>{cashier.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="shift-float" className={FORM_LABEL}>Fondo inicial en efectivo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 mt-0.5 text-muted num text-sm">$</span>
                <input
                  id="shift-float"
                  type="number"
                  min="0"
                  max={MAX_FLOAT}
                  step="0.01"
                  inputMode="decimal"
                  value={openingFloat}
                  onChange={(e) => {
                    setOpeningFloat(e.target.value);
                    setError(null);
                  }}
                  placeholder="50.00"
                  disabled={busy}
                  className={`${FORM_INPUT} pl-7 num`}
                />
              </div>
              <p className="text-[11.5px] text-muted mt-1">El cambio con el que arranca la gaveta. Cuéntalo antes de entregarlo.</p>
            </div>

            {error && (
              <p className="text-ac text-xs font-medium flex items-center gap-1.5" role="alert">
                <FAIcon icon="circle-exclamation" size="xs" />
                {error}
              </p>
            )}

            <p className="text-[12px] text-muted leading-relaxed">
              Todo lo que se cobre en este turno queda a nombre del cajero elegido. Mientras el turno esté abierto, los
              meseros mandan las cuentas a caja en vez de cobrarlas.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={close} disabled={busy} className={MODAL_BTN_SECONDARY}>
            Cancelar
          </button>
          <button type="submit" disabled={busy || !valid} className={MODAL_BTN_PRIMARY}>
            {busy ? 'Abriendo...' : needsCode ? 'Habilitar y abrir turno' : 'Abrir turno'}
          </button>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
