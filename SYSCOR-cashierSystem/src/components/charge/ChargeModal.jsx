// components/charge/ChargeModal.jsx
//
// Cobrar: el mismo modal para una mesa, un pedido para recoger o una venta de
// mostrador. Se elige el documento (Factura o Crédito Fiscal, con los datos
// del cliente), la propina (solo en mesas) y cómo paga (efectivo con vuelto,
// o tarjeta en un POS simulado). El servidor recalcula todo al cobrar: aquí
// los montos son la vista previa.
import { useEffect, useMemo, useRef, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import {
  ModalShell,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FORM_INPUT,
  FORM_LABEL,
  MODAL_BTN_PRIMARY,
  MODAL_BTN_SECONDARY,
} from '@syscor/web-shared/src/components/FormModal';
import cashierApi, { apiMessage } from '../../services/cashierApi';
import { money, round2 } from '../../utils/format';
import { spokenMoney } from '../../utils/voice/spoken';

const CARD_BRANDS = ['Visa', 'Mastercard', 'American Express', 'Otra'];
const TIP_RATE = 0.1;

// Botones de efectivo rápido: exacto y los billetes que tienen sentido
const quickCashOptions = (due) => {
  const options = new Set([round2(due)]);
  [1, 5, 10, 20].forEach((step) => {
    const next = Math.ceil(due / step) * step;
    if (next > due) options.add(next);
  });
  [50, 100].forEach((bill) => {
    if (bill > due) options.add(bill);
  });
  return [...options].sort((a, b) => a - b).slice(0, 6);
};

const Segmented = ({ options, value, onChange }) => (
  <div className="grid gap-1.5 p-1 bg-surfalt border border-line rounded-lg" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`px-3 py-2 rounded-md text-[13px] font-display font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
          value === option.value ? 'bg-ac text-white shadow-2xs' : 'text-inkalt hover:text-ac'
        }`}
      >
        {option.icon && <FAIcon icon={option.icon} size="sm" />}
        {option.label}
      </button>
    ))}
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white dark:bg-surface rounded-xl border border-line p-4 shadow-2xs space-y-3">
    <p className="kick text-ink">{title}</p>
    {children}
  </div>
);

const Field = ({ id, label, children, className = '' }) => (
  <div className={className}>
    <label htmlFor={id} className={FORM_LABEL}>{label}</label>
    {children}
  </div>
);

const SummaryRow = ({ label, value, strong = false, muted = false }) => (
  <div className={`flex items-baseline justify-between gap-3 ${strong ? 'text-ink' : muted ? 'text-muted' : 'text-inkalt'}`}>
    <span className={strong ? 'font-display font-semibold' : 'text-[13px]'}>{label}</span>
    <span className={`num ${strong ? 'text-2xl font-semibold' : 'text-[13px]'}`}>{value}</span>
  </div>
);

/**
 * @param {object} charge  { kind, title, subtitle, items, total, creditApplied, request }
 *   request: lo propio de cada cobro (source, tableId, orderId o sale)
 * @param {Function} onCharged  recibe { receipt, issuer }
 * @param {object}   voiceRef   Chef Panchita lo usa para llenar el cobro por voz:
 *   aquí se deja { amountDue, handle(command) => { text, tone } }
 */
export default function ChargeModal({ charge, onClose, onCharged, voiceRef }) {
  const isTable = charge.kind === 'table';
  const [documentType, setDocumentType] = useState('fcf');
  const [customer, setCustomer] = useState({ name: '', nit: '', nrc: '', activity: '', address: '', email: '' });
  const [tipMode, setTipMode] = useState('none');
  const [tipCustom, setTipCustom] = useState('');
  const [method, setMethod] = useState('cash');
  const [received, setReceived] = useState('');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('');
  const [releaseTable, setReleaseTable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef(null);

  const toPay = round2(Math.max(charge.total - (charge.creditApplied || 0), 0));
  const tip = !isTable || tipMode === 'none'
    ? 0
    : tipMode === 'suggested'
      ? round2(toPay * TIP_RATE)
      : round2(Math.max(Number(tipCustom) || 0, 0));
  const amountDue = round2(toPay + tip);
  const receivedNum = Number(received) || 0;
  const change = round2(receivedNum - amountDue);
  const quickCash = useMemo(() => quickCashOptions(amountDue), [amountDue]);

  const setField = (field) => (event) => setCustomer((prev) => ({ ...prev, [field]: event.target.value }));

  const canSubmit =
    !submitting &&
    (method === 'card' ? cardLast4.length === 4 : receivedNum >= amountDue && receivedNum > 0) &&
    (documentType === 'fcf' || (customer.name && customer.nit && customer.nrc && customer.activity && customer.address));

  // --- Chef Panchita llena el cobro por voz ---
  // Se reasigna en cada render para que siempre vea el estado actual.
  useEffect(() => {
    if (!voiceRef) return undefined;
    voiceRef.current = {
      amountDue,
      handle: (command) => {
        switch (command.intent) {
          case 'chargeCash':
            setMethod('cash');
            return { text: `Efectivo. Son ${spokenMoney(amountDue)}. ¿Con cuánto paga?` };
          case 'chargeReceived': {
            if (command.amount == null) return { text: '¿Con cuánto paga?', tone: 'warn' };
            setMethod('cash');
            setReceived(command.amount.toFixed(2));
            if (command.amount < amountDue) return { text: `Con ${spokenMoney(command.amount)} no alcanza: faltan ${spokenMoney(round2(amountDue - command.amount))}.`, tone: 'warn' };
            return { text: `Recibe ${spokenMoney(command.amount)}: el vuelto es ${spokenMoney(round2(command.amount - amountDue))}. Di «confirma» para cobrar.`, tone: 'ok' };
          }
          case 'chargeCard':
            setMethod('card');
            if (command.last4) {
              setCardLast4(command.last4);
              return { text: `Tarjeta terminada en ${command.last4.split('').join(' ')}. Di «confirma» para cobrar ${spokenMoney(amountDue)}.`, tone: 'ok' };
            }
            return { text: 'Con tarjeta. ¿En qué números termina?' };
          case 'chargeCcf':
            setDocumentType('ccf');
            return { text: 'Crédito Fiscal. Escribe nombre, NIT, NRC, giro y dirección del cliente.' };
          case 'chargeFcf':
            setDocumentType('fcf');
            return { text: 'Factura de consumidor final.' };
          case 'chargeNoTip':
            if (!isTable) return { text: 'La propina solo aplica a las mesas.' };
            setTipMode('none');
            return { text: 'Sin propina.' };
          case 'chargeTip': {
            if (!isTable) return { text: 'La propina solo aplica a las mesas.', tone: 'warn' };
            if (command.percent || command.amount === 10 || command.amount == null) {
              setTipMode('suggested');
              return { text: `Propina del 10 por ciento: ${spokenMoney(round2(toPay * TIP_RATE))}.` };
            }
            setTipMode('custom');
            setTipCustom(String(command.amount));
            return { text: `Propina de ${spokenMoney(command.amount)}.` };
          }
          case 'chargeCancel':
            onClose();
            return { text: 'Cancelé el cobro.' };
          case 'chargeConfirm':
            if (!canSubmit) {
              if (method === 'cash' && receivedNum < amountDue) return { text: 'Falta decirme con cuánto paga.', tone: 'warn' };
              if (method === 'card' && cardLast4.length !== 4) return { text: 'Faltan los últimos 4 dígitos de la tarjeta.', tone: 'warn' };
              return { text: 'Faltan datos del cliente para el Crédito Fiscal.', tone: 'warn' };
            }
            formRef.current?.requestSubmit();
            return { text: `Cobrando ${spokenMoney(amountDue)}…`, tone: 'ok' };
          default:
            return { text: 'No entendí qué cambiar en el cobro.', tone: 'warn' };
        }
      },
    };
    return () => {
      voiceRef.current = null;
    };
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await cashierApi.post('/cashier/charges', {
        ...charge.request,
        releaseTable: isTable ? releaseTable : undefined,
        tip,
        document: { type: documentType, customer },
        payment: method === 'cash'
          ? { method, received: receivedNum }
          : { method, cardBrand, cardLast4 },
      });
      onCharged(data.data);
    } catch (err) {
      setError(apiMessage(err, 'No se pudo registrar el cobro.'));
      setSubmitting(false);
    }
  };

  return (
    <ModalShell maxWidth="max-w-4xl">
      <ModalHeader
        icon="cash-register"
        title={charge.title}
        badge={money(amountDue)}
        subtitle={charge.subtitle}
        onClose={submitting ? undefined : onClose}
      />
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ModalBody>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* --- Izquierda: qué se cobra y documento --- */}
            <div className="space-y-4">
              <Section title={`DETALLE · ${charge.items.length} ${charge.items.length === 1 ? 'LÍNEA' : 'LÍNEAS'}`}>
                <ul className="divide-y divide-line max-h-48 overflow-y-auto -mx-1 px-1">
                  {charge.items.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="py-1.5 flex items-start justify-between gap-3 text-[13px]">
                      <span className="min-w-0">
                        <span className="num text-muted mr-1.5">{item.quantity}×</span>
                        <span className="text-ink">{item.name}</span>
                        {item.notes && <span className="block text-[11.5px] text-muted truncate">{item.notes}</span>}
                      </span>
                      <span className="num text-inkalt shrink-0">{money(item.total)}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="DOCUMENTO">
                <Segmented
                  value={documentType}
                  onChange={setDocumentType}
                  options={[
                    { value: 'fcf', label: 'Factura', icon: 'receipt' },
                    { value: 'ccf', label: 'Crédito Fiscal', icon: 'buildings' },
                  ]}
                />
                {documentType === 'fcf' ? (
                  <Field id="fcf-name" label="Nombre del cliente (opcional)">
                    <input id="fcf-name" className={FORM_INPUT} value={customer.name} onChange={setField('name')} placeholder="Consumidor final" maxLength={120} />
                  </Field>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field id="ccf-name" label="Nombre o razón social *" className="sm:col-span-2">
                      <input id="ccf-name" className={FORM_INPUT} value={customer.name} onChange={setField('name')} placeholder="Distribuidora ABC, S.A. de C.V." maxLength={120} />
                    </Field>
                    <Field id="ccf-nit" label="NIT *">
                      <input id="ccf-nit" className={`${FORM_INPUT} num`} value={customer.nit} onChange={setField('nit')} placeholder="0614-010203-101-2" maxLength={20} />
                    </Field>
                    <Field id="ccf-nrc" label="NRC *">
                      <input id="ccf-nrc" className={`${FORM_INPUT} num`} value={customer.nrc} onChange={setField('nrc')} placeholder="123456-7" maxLength={12} />
                    </Field>
                    <Field id="ccf-activity" label="Giro *" className="sm:col-span-2">
                      <input id="ccf-activity" className={FORM_INPUT} value={customer.activity} onChange={setField('activity')} placeholder="Venta al por mayor" maxLength={120} />
                    </Field>
                    <Field id="ccf-address" label="Dirección *" className="sm:col-span-2">
                      <input id="ccf-address" className={FORM_INPUT} value={customer.address} onChange={setField('address')} placeholder="Calle, colonia, municipio" maxLength={200} />
                    </Field>
                    <Field id="ccf-email" label="Correo (opcional)" className="sm:col-span-2">
                      <input id="ccf-email" type="email" className={FORM_INPUT} value={customer.email} onChange={setField('email')} placeholder="facturas@empresa.com" maxLength={120} />
                    </Field>
                  </div>
                )}
              </Section>

              {isTable && (
                <Section title="PROPINA (VOLUNTARIA)">
                  <Segmented
                    value={tipMode}
                    onChange={setTipMode}
                    options={[
                      { value: 'none', label: 'Sin propina' },
                      { value: 'suggested', label: `10% · ${money(round2(toPay * TIP_RATE))}` },
                      { value: 'custom', label: 'Otra' },
                    ]}
                  />
                  {tipMode === 'custom' && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className={`${FORM_INPUT} num no-spin`}
                      value={tipCustom}
                      onChange={(e) => setTipCustom(e.target.value)}
                      placeholder="0.00"
                      aria-label="Monto de la propina"
                    />
                  )}
                  <p className="text-[11.5px] text-muted">La propina no lleva IVA ni forma parte de la venta.</p>
                </Section>
              )}
            </div>

            {/* --- Derecha: pago --- */}
            <div className="space-y-4">
              <Section title="PAGO">
                <Segmented
                  value={method}
                  onChange={setMethod}
                  options={[
                    { value: 'cash', label: 'Efectivo', icon: 'money-bill' },
                    { value: 'card', label: 'Tarjeta', icon: 'credit-card' },
                  ]}
                />

                {method === 'cash' ? (
                  <>
                    <Field id="cash-received" label="Efectivo recibido">
                      <input
                        id="cash-received"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        autoFocus
                        className={`${FORM_INPUT} num no-spin text-2xl text-right py-3`}
                        value={received}
                        onChange={(e) => setReceived(e.target.value)}
                        placeholder={amountDue.toFixed(2)}
                      />
                    </Field>
                    <div className="grid grid-cols-3 gap-1.5">
                      {quickCash.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReceived(value.toFixed(2))}
                          className={`py-2 border rounded-md num text-[13px] transition-colors cursor-pointer ${
                            receivedNum === value ? 'border-ac text-ac bg-acsoft' : 'border-line text-inkalt hover:border-ac hover:text-ac'
                          }`}
                        >
                          {value === amountDue ? 'Exacto' : money(value)}
                        </button>
                      ))}
                    </div>
                    <div className={`flex items-center justify-between px-4 py-3 border ${receivedNum >= amountDue && receivedNum > 0 ? 'border-ok bg-oksoft' : 'border-line bg-surfalt'}`}>
                      <span className="kick text-inkalt">{receivedNum >= amountDue || !received ? 'VUELTO' : 'FALTA'}</span>
                      <span className={`num text-3xl font-semibold ${receivedNum >= amountDue ? 'text-ok' : 'text-warn'}`}>
                        {received ? money(Math.abs(change)) : '—'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="card-brand" label="Tarjeta">
                      <select id="card-brand" className={FORM_INPUT} value={cardBrand} onChange={(e) => setCardBrand(e.target.value)}>
                        {CARD_BRANDS.map((brand) => <option key={brand}>{brand}</option>)}
                      </select>
                    </Field>
                    <Field id="card-last4" label="Últimos 4 dígitos">
                      <input
                        id="card-last4"
                        inputMode="numeric"
                        autoFocus
                        maxLength={4}
                        className={`${FORM_INPUT} num tracking-[0.3em] text-center`}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="0000"
                      />
                    </Field>
                    <p className="col-span-2 text-[11.5px] text-muted flex items-start gap-1.5">
                      <FAIcon icon="circle-info" size="xs" className="mt-0.5 text-ac" />
                      POS simulado: el cobro se aprueba solo y genera un número de autorización. No se carga ninguna tarjeta real.
                    </p>
                  </div>
                )}
              </Section>

              <Section title="RESUMEN">
                <div className="space-y-1.5">
                  <SummaryRow label="Total (IVA incluido)" value={money(charge.total)} />
                  {charge.creditApplied > 0 && <SummaryRow label="Saldo a favor del cliente" value={`−${money(charge.creditApplied)}`} muted />}
                  {tip > 0 && <SummaryRow label="Propina" value={money(tip)} muted />}
                  <div className="pt-2 mt-1 border-t border-line">
                    <SummaryRow label="A pagar" value={money(amountDue)} strong />
                  </div>
                </div>
                {isTable && (
                  <label className="flex items-center gap-2.5 text-[13px] text-inkalt cursor-pointer pt-1">
                    <input type="checkbox" className="w-4 h-4 accent-[var(--color-ac)]" checked={releaseTable} onChange={(e) => setReleaseTable(e.target.checked)} />
                    Liberar la mesa al cobrar
                  </label>
                )}
              </Section>

              {error && (
                <p className="text-ac text-[13px] font-medium flex items-start gap-2 border border-acline bg-acsoft px-3 py-2.5" role="alert">
                  <FAIcon icon="circle-exclamation" size="sm" className="mt-0.5" />
                  {error}
                </p>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter note="Cobro simulado · el comprobante es de prueba">
          <button type="button" onClick={onClose} disabled={submitting} className={MODAL_BTN_SECONDARY}>
            Cancelar
          </button>
          <button type="submit" disabled={!canSubmit} className={`${MODAL_BTN_PRIMARY} !text-sm !px-5`}>
            <FAIcon icon={submitting ? 'spinner' : 'check'} size="xs" className={submitting ? 'animate-spin' : ''} />
            {submitting ? 'Cobrando...' : `Cobrar ${money(amountDue)}`}
          </button>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
