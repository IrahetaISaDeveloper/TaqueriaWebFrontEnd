// components/pos/PosScreen.jsx
//
// Punto de venta con el turno abierto: contadores arriba, cuatro pestañas
// (Por cobrar, Mostrador, Por entregar, Cobros del turno) y las acciones del
// turno (movimiento de efectivo, corte X y cerrar caja). Chef Panchita
// acompaña por voz: consulta, cobra, arma la venta y avisa lo que queda listo.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { useToast } from '@syscor/web-shared/src/components/ToastProvider';
import CashierTopBar, { TopBarCounter, TopBarAction } from '../layout/CashierTopBar';
import ChargeQueue from './ChargeQueue';
import CounterSale from './CounterSale';
import ToDeliverList from './ToDeliverList';
import ShiftReceipts from './ShiftReceipts';
import ChargeModal from '../charge/ChargeModal';
import DocumentPreviewModal from '../receipt/DocumentPreviewModal';
import MovementModal from '../shift/MovementModal';
import CloseShiftModal from '../shift/CloseShiftModal';
import usePending from '../../hooks/usePending';
import useCashierMenu, { MENU_SECTIONS } from '../../hooks/useCashierMenu';
import useCashierPanchita from '../../hooks/useCashierPanchita';
import CashierPanchitaPanel from '../voice/CashierPanchitaPanel';
import { simpleLine, cartTotal } from '../../utils/counterCharge';
import { spokenMoney, spokenPickup } from '../../utils/voice/spoken';
import cashierApi, { apiMessage } from '../../services/cashierApi';
import { buildReceiptHtml, buildShiftReportHtml } from '@syscor/web-shared/src/utils/cashierDocuments';
import { money, DOCUMENT_LABELS } from '../../utils/format';

const EMPTY_CART = { lines: [], customerName: '', fulfillment: 'pickup' };

// Pestaña de la barra: versalitas compactas; la activa con fondo de acento
const TabButton = ({ active, onClick, icon, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={`kick inline-flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
      active ? 'bg-acsoft text-ac' : 'text-inkalt hover:text-ac'
    }`}
  >
    <FAIcon icon={icon} size="sm" />
    {label}
    {count !== undefined && <span className="num">{count}</span>}
  </button>
);

export default function PosScreen({ session, issuer, onSessionUpdated, onShiftClosed }) {
  const { addToast } = useToast();
  const pending = usePending();
  const [tab, setTab] = useState('charges');
  const [cart, setCart] = useState(EMPTY_CART);
  const [charge, setCharge] = useState(null);
  const [preview, setPreview] = useState(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [shiftMenuOpen, setShiftMenuOpen] = useState(false);

  const menuState = useCashierMenu();
  // La canasta también vive en una ref: Panchita agrega varios productos
  // seguidos y necesita el total al instante, sin esperar al render.
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  const changeCart = useCallback((update) => {
    const next = update(cartRef.current);
    cartRef.current = next;
    setCart(next);
  }, []);
  // El modal de cobro deja aquí cómo llenarlo por voz (ver ChargeModal)
  const chargeVoiceRef = useRef(null);

  const toCharge = pending.tables.length + pending.pickups.length;
  const readyToDeliver = pending.toDeliver.filter((o) => o.status === 'ready').length;
  const summary = session.summary || {};

  const handleCharged = useCallback(({ receipt, issuer: receiptIssuer }) => {
    const wasCounter = charge?.kind === 'counter';
    setCharge(null);
    if (wasCounter) setCart(EMPTY_CART);
    pending.refetch();
    addToast(
      receipt.payment.method === 'cash' && receipt.payment.change > 0
        ? `Cobro registrado · vuelto ${money(receipt.payment.change)}`
        : `Cobro registrado · ${money(receipt.amountDue)}`,
      'success'
    );
    setPreview({ kind: 'receipt', receipt, issuer: receiptIssuer || issuer, autoPrint: true });
  }, [charge, pending, addToast, issuer]);

  const handleDeliver = useCallback(async (order) => {
    try {
      await cashierApi.post(`/cashier/orders/${order.orderId}/deliver`);
      addToast(`${order.code} entregado`, 'success');
      pending.refetch();
      return true;
    } catch (err) {
      addToast(apiMessage(err, 'No se pudo entregar el pedido.'), 'error');
      return false;
    }
  }, [addToast, pending]);

  // --- Chef Panchita ---
  const menuProducts = useMemo(() => MENU_SECTIONS.flatMap((section) => menuState.menu[section.id] || []), [menuState.menu]);
  const panchita = useCashierPanchita({
    context: {
      pending,
      summary,
      menuProducts,
      cart,
      getChargeInfo: () => (charge ? { amountDue: chargeVoiceRef.current?.amountDue ?? charge.total } : null),
      setTab,
      openCharge: setCharge,
      deliver: handleDeliver,
      addToCart: (product, quantity) => changeCart((prev) => {
        const same = prev.lines.find((l) => l.product.id === product.id && !l.comment && l.selectedExtras.length === 0);
        if (same) return { ...prev, lines: prev.lines.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + quantity) } : l)) };
        return { ...prev, lines: [...prev.lines, simpleLine(product, quantity)] };
      }),
      removeFromCart: (productId) => changeCart((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.product.id !== productId) })),
      clearCart: () => changeCart((prev) => ({ ...prev, lines: [] })),
      updateCart: (patch) => changeCart((prev) => ({ ...prev, ...patch })),
      nextCartTotal: () => cartTotal(cartRef.current),
      chargeVoice: (command) => chargeVoiceRef.current?.handle(command) || { text: 'No hay un cobro abierto.', tone: 'warn' },
      openCutX: () => setPreview({ kind: 'x' }),
      openMovement: () => setMovementOpen(true),
      openCloseShift: () => setCloseOpen(true),
    },
  });

  // Avisos de Panchita: lo que quedó listo para cobrar o entregar y las
  // cuentas que los meseros mandan a caja. La primera carga no se anuncia
  // (eso ya estaba ahí); solo lo nuevo.
  const { announce } = panchita;
  const knownRef = useRef(null);
  useEffect(() => {
    if (pending.loading) return;
    const now = {
      pickups: new Set(pending.pickups.map((p) => String(p.orderId))),
      bills: new Set(pending.tables.filter((t) => t.billRequestedAt).map((t) => `${t.tableId}:${t.billRequestedAt}`)),
      ready: new Set(pending.toDeliver.filter((o) => o.status === 'ready').map((o) => String(o.orderId))),
    };
    const known = knownRef.current;
    knownRef.current = now;
    if (!known) return;
    pending.pickups
      .filter((p) => !known.pickups.has(String(p.orderId)))
      .forEach((p) => announce(`Listo para cobrar: ${spokenPickup(p)}, ${spokenMoney(p.amountDue)}.`));
    pending.tables
      .filter((t) => t.billRequestedAt && !known.bills.has(`${t.tableId}:${t.billRequestedAt}`))
      .forEach((t) => announce(`La mesa ${t.number} pidió la cuenta: ${spokenMoney(t.total)}.`));
    pending.toDeliver
      .filter((o) => o.status === 'ready' && !known.ready.has(String(o.orderId)))
      .forEach((o) => announce(`Para entregar: ${o.kitchenNumber != null ? `la orden ${o.kitchenNumber}` : o.code} de ${o.customerName}.`));
  }, [pending.loading, pending.pickups, pending.tables, pending.toDeliver, announce]);

  // El HTML de la vista previa se arma una vez por documento (memo)
  const buildPreviewHtml = useMemo(() => {
    if (!preview) return null;
    if (preview.kind === 'receipt') return ({ copy }) => buildReceiptHtml(preview.receipt, preview.issuer, { copy });
    return () => buildShiftReportHtml(session, issuer, 'X');
  }, [preview, session, issuer]);

  return (
    <div className="h-dvh flex flex-col bg-bg pos-enter">
      <CashierTopBar
        session={session}
        actions={(
          <div className="hidden lg:flex items-center gap-5">
            <TopBarAction icon="arrows-left-right" label="Movimiento" onClick={() => setMovementOpen(true)} />
            <TopBarAction icon="receipt" label="Corte X" onClick={() => setPreview({ kind: 'x' })} />
            <TopBarAction icon="lock" label="Cerrar caja" outlined onClick={() => setCloseOpen(true)} />
          </div>
        )}
      >
        <TopBarCounter value={toCharge} label="POR COBRAR" />
        <TopBarCounter value={readyToDeliver} label="LISTOS PARA ENTREGAR" />
        <TopBarCounter value={money(summary.sales)} label={`VENTAS · ${summary.receipts ?? 0} ${summary.receipts === 1 ? 'COBRO' : 'COBROS'}`} />
      </CashierTopBar>

      <div className="shrink-0 px-4 sm:px-7 pt-3 sm:pt-4 pb-3 sm:pb-4 flex flex-wrap items-center gap-x-2 gap-y-2.5">
        <nav className="order-1 flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label="Secciones de la caja">
          <TabButton active={tab === 'charges'} onClick={() => setTab('charges')} icon="cash-register" label="Por cobrar" count={toCharge} />
          <TabButton active={tab === 'deliver'} onClick={() => setTab('deliver')} icon="package" label="Por entregar" count={pending.toDeliver.length} />
          <TabButton active={tab === 'receipts'} onClick={() => setTab('receipts')} icon="clock-counter-clockwise" label="Cobros del turno" count={summary.receipts ?? 0} />
          {pending.error && (
            <span className="text-[12.5px] text-warn inline-flex items-center gap-1.5 ml-2 whitespace-nowrap">
              <FAIcon icon="triangle-exclamation" size="xs" />
              {pending.error}
            </span>
          )}
        </nav>

        {/* Teléfono y tablet: las acciones del turno en un menú */}
        <div className="order-2 lg:hidden relative shrink-0">
          <button
            type="button"
            onClick={() => setShiftMenuOpen((open) => !open)}
            aria-label="Acciones del turno"
            aria-expanded={shiftMenuOpen}
            className="w-10 h-10 rounded-lg border border-line bg-surface text-inkalt hover:text-ac hover:border-ac flex items-center justify-center cursor-pointer"
          >
            <FAIcon icon="dots-three-vertical" />
          </button>
          {shiftMenuOpen && (
            <>
              <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 cursor-default" onClick={() => setShiftMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-40 w-52 rounded-lg border border-line bg-surface py-1.5 shadow-lg">
                {[
                  { icon: 'arrows-left-right', label: 'Movimiento de efectivo', onClick: () => setMovementOpen(true) },
                  { icon: 'receipt', label: 'Corte X', onClick: () => setPreview({ kind: 'x' }) },
                  { icon: 'lock', label: 'Cerrar caja', onClick: () => setCloseOpen(true), danger: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setShiftMenuOpen(false); item.onClick(); }}
                    className={`w-full px-4 py-2.5 text-left text-[14px] inline-flex items-center gap-2.5 hover:bg-surfalt cursor-pointer ${item.danger ? 'text-ac' : 'text-ink'}`}
                  >
                    <FAIcon icon={item.icon} size="sm" />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Venta de mostrador: botón aparte, es la acción principal de la caja */}
        <button
          type="button"
          onClick={() => setTab(tab === 'counter' ? 'charges' : 'counter')}
          className={`order-3 lg:order-2 w-full lg:w-auto lg:ml-auto justify-center inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg border font-display font-semibold text-[14px] transition-colors cursor-pointer active:scale-[0.98] ${
            tab === 'counter'
              ? 'border-ac bg-acsoft text-ac'
              : 'border-ac bg-ac text-white hover:bg-ac/90'
          }`}
        >
          <FAIcon icon={tab === 'counter' ? 'arrow-left' : 'storefront'} size="sm" />
          {tab === 'counter' ? 'Volver a cobros' : 'Venta de mostrador'}
          {cart.lines.length > 0 && (
            <span className={`num text-[12px] px-1.5 rounded ${tab === 'counter' ? 'bg-ac text-white' : 'bg-white/25'}`}>
              {cart.lines.reduce((sum, line) => sum + line.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-7 pb-8">
        {tab === 'charges' && (
          <ChargeQueue tables={pending.tables} pickups={pending.pickups} loading={pending.loading} onCharge={setCharge} />
        )}
        {tab === 'counter' && <CounterSale cart={cart} setCart={changeCart} onCharge={setCharge} menuState={menuState} />}
        {tab === 'deliver' && <ToDeliverList orders={pending.toDeliver} loading={pending.loading} onDeliver={handleDeliver} />}
        {tab === 'receipts' && (
          <ShiftReceipts onOpen={(receipt) => setPreview({ kind: 'receipt', receipt, issuer, autoPrint: false })} />
        )}
      </main>

      {charge && <ChargeModal charge={charge} onClose={() => setCharge(null)} onCharged={handleCharged} voiceRef={chargeVoiceRef} />}

      {/* En el teléfono, con la barra "Ver venta" abajo, el botón sube */}
      <CashierPanchitaPanel panchita={panchita} raised={tab === 'counter' && cart.lines.length > 0} compact={Boolean(charge)} />

      {preview && buildPreviewHtml && (
        <DocumentPreviewModal
          icon={preview.kind === 'receipt' ? 'receipt' : 'list-checks'}
          title={preview.kind === 'receipt' ? DOCUMENT_LABELS[preview.receipt.documentType] : 'Corte X'}
          subtitle={preview.kind === 'receipt' ? preview.receipt.controlNumber : `Parcial del turno ${session.code}`}
          badge={preview.kind === 'receipt' ? money(preview.receipt.amountDue) : money(summary.sales)}
          buildHtml={buildPreviewHtml}
          allowCopy={preview.kind === 'receipt'}
          autoPrint={Boolean(preview.autoPrint)}
          closeLabel={preview.kind === 'receipt' && preview.autoPrint ? 'Listo' : 'Cerrar'}
          footerNote={preview.kind === 'x' ? 'El corte X no cierra el turno' : undefined}
          onClose={() => setPreview(null)}
        />
      )}

      {movementOpen && (
        <MovementModal
          onClose={() => setMovementOpen(false)}
          onSaved={(result) => {
            setMovementOpen(false);
            onSessionUpdated(result.data);
            addToast(result.message, 'success');
          }}
        />
      )}

      {closeOpen && (
        <CloseShiftModal
          session={session}
          onClose={() => setCloseOpen(false)}
          onClosed={(result) => {
            setCloseOpen(false);
            onShiftClosed(result);
          }}
        />
      )}
    </div>
  );
}
