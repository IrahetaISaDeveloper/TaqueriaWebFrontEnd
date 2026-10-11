// hooks/useCashierPanchita.js
//
// Chef Panchita en la caja: el cajero le habla (o le escribe) y ella
// consulta lo que hay por cobrar, arma la venta de mostrador, abre cobros y
// ayuda a llenarlos ("paga con 20", "crédito fiscal"...). Además avisa sola
// cuando algo queda listo para cobrar o entregar.
//
// Escuchar y hablar lo resuelve useSpeech (compartido con cocina); entender
// la frase, utils/voice/cashierCommands.js. Los datos de la pantalla se leen
// de una ref para responder siempre con lo que se ve en ese instante.
import { useState, useRef, useEffect, useCallback } from 'react';
import useSpeech, { runOnFirstGesture } from '@syscor/web-shared/src/hooks/useSpeech';
import { normalizeSpeech } from '@syscor/web-shared/src/utils/normalizeSpeech';
import { parseCashierCommand, findProduct } from '../utils/voice/cashierCommands';
import { spokenMoney, joinList, plural, spokenPickup, spokenItems, spokenCode } from '../utils/voice/spoken';
import {
  buildCounterCharge,
  buildTableCharge,
  buildPickupCharge,
  cartTotal,
  cartCount,
  needsChoices,
} from '../utils/counterCharge';
import { round2 } from '../utils/format';

const MAX_LOG = 30;
const CONTINUOUS_KEY = 'pos_panchita_continuous';
const ANNOUNCE_KEY = 'pos_panchita_announce';

const readPref = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === '1';
  } catch {
    return fallback;
  }
};
const savePref = (key, on) => {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    // Sin almacenamiento: dura hasta recargar
  }
};

// ¿Lo que oyó el micrófono es su propia voz por la bocina? (mismo criterio que cocina)
const isOwnEcho = (heard, speakingText) => {
  if (!speakingText) return false;
  const speech = normalizeSpeech(speakingText);
  const said = normalizeSpeech(heard);
  if (!said) return true;
  if (said.split(' ').length <= 2) return false;
  if (speech.includes(said)) return true;
  if (/^(?:chef\s+)?panchita\b/.test(said)) return false;
  const spoken = new Set(speech.split(' '));
  const words = said.split(' ');
  return words.filter((w) => spoken.has(w)).length / words.length >= 0.7;
};

export const HELP_TEXT =
  'Puedo decirte cuánto llevas vendido, cuánto efectivo debería haber, qué hay por cobrar, quién pidió la cuenta, ' +
  'cuánto debe o qué consumió una mesa, y qué está listo para entregar. También cobro: «cobra la mesa 5», «cobra el pedido de Ana». ' +
  'En mostrador: «agrega dos horchatas y un burrito», «quita las horchatas», «cobra la venta». ' +
  'Con un cobro abierto: «paga con 20», «con tarjeta terminada en 4242», «crédito fiscal», «propina del 10 por ciento» y «confirma el cobro».';

export const SUGGESTIONS = [
  '¿Qué hay por cobrar?',
  '¿Cuánto llevo vendido?',
  '¿Quién pidió la cuenta?',
  '¿Qué está listo para entregar?',
  '¿Cuánto efectivo debería haber?',
];

const normName = (name) => normalizeSpeech(name || '');

// Pedido para recoger (o por entregar) del que se habla: código, número de
// cocina o nombre del cliente
const findOrder = (ref, list) => {
  if (!ref) return { error: 'missing' };
  let matches = [];
  if (ref.code) matches = list.filter((o) => o.code === ref.code);
  else if (ref.number != null) matches = list.filter((o) => o.kitchenNumber === ref.number || o.code?.endsWith(`-${String(ref.number).padStart(2, '0')}`));
  else if (ref.name) matches = list.filter((o) => normName(o.customerName).split(' ').some((w) => w.startsWith(ref.name.split(' ')[0])));
  if (matches.length === 1) return { order: matches[0] };
  return matches.length > 1 ? { error: 'many', matches } : { error: 'none' };
};

const tableFor = (number, tables) => tables.find((t) => t.number === number);

/**
 * Ejecuta una orden ya interpretada. Devuelve { text, tone, choice? }.
 * ctx: lo que se ve en pantalla y las acciones de la caja (ver PosScreen).
 */
const runCommand = async (command, ctx) => {
  const { pending, summary, menuProducts, cart } = ctx;
  const chargeInfo = ctx.getChargeInfo();
  const tables = pending.tables || [];
  const pickups = pending.pickups || [];
  const toDeliver = pending.toDeliver || [];

  switch (command.intent) {
    case 'wake':
      return { text: '¿Sí? Dime qué necesitas.' };
    case 'help':
      return { text: HELP_TEXT };
    case 'stop':
      ctx.stopListening();
      return { text: 'Listo, dejo de escuchar. Toca el micrófono cuando me necesites.' };
    case 'repeat':
      return { text: ctx.lastReply || 'Todavía no he dicho nada.' };

    // --- Consultas ---
    case 'sales': {
      const receipts = summary.receipts ?? 0;
      if (!receipts) return { text: 'Todavía no hay cobros en este turno.' };
      const cash = summary.byMethod?.cash?.amount || 0;
      const card = summary.byMethod?.card?.amount || 0;
      return {
        text: `Llevas ${spokenMoney(summary.sales)} en ${plural(receipts, 'cobro', 'cobros')}: ${spokenMoney(cash)} en efectivo y ${spokenMoney(card)} con tarjeta.${summary.tips ? ` Propinas: ${spokenMoney(summary.tips)}.` : ''}`,
      };
    }
    case 'cashExpected':
      return { text: `En la gaveta debería haber ${spokenMoney(summary.expectedCash)}, contando el fondo inicial de ${spokenMoney(summary.openingFloat)}.` };
    case 'cardTotal':
      return { text: `Con tarjeta van ${spokenMoney(summary.byMethod?.card?.amount)} en ${plural(summary.byMethod?.card?.count || 0, 'cobro', 'cobros')}.` };
    case 'pendingList': {
      if (tables.length === 0 && pickups.length === 0) return { text: 'No hay nada por cobrar ahorita.' };
      const parts = [];
      if (tables.length) parts.push(`${plural(tables.length, 'mesa', 'mesas')}: ${joinList(tables.map((t) => `la ${t.number} con ${spokenMoney(t.total)}`))}`);
      if (pickups.length) parts.push(`${plural(pickups.length, 'pedido para recoger', 'pedidos para recoger')}: ${joinList(pickups.map((p) => `${spokenPickup(p)} con ${spokenMoney(p.amountDue)}`))}`);
      return { text: `Por cobrar hay ${parts.join('; y ')}.` };
    }
    case 'billRequests': {
      const requested = tables.filter((t) => t.billRequestedAt);
      if (!requested.length) return { text: 'Ninguna mesa ha pedido la cuenta.' };
      return { text: `Pidieron la cuenta: ${joinList(requested.map((t) => `la mesa ${t.number}, ${spokenMoney(t.total)}`))}.` };
    }
    case 'tableTotal':
    case 'tableItems': {
      if (!command.table) return { text: '¿De qué mesa? Dime, por ejemplo: cuánto debe la mesa 5.', tone: 'warn' };
      const tab = tableFor(command.table, tables);
      if (!tab) return { text: `La mesa ${command.table} no tiene nada pendiente de cobro.` };
      if (command.intent === 'tableTotal') {
        return { text: `La mesa ${tab.number} debe ${spokenMoney(tab.total)}${tab.blocked ? ', pero tiene un segundo tiempo esperando: el mesero debe marcharlo antes de cobrar' : ''}.` };
      }
      return { text: `La mesa ${tab.number} consumió ${spokenItems(tab.items)}. En total, ${spokenMoney(tab.total)}.` };
    }
    case 'readyList': {
      const ready = toDeliver.filter((o) => o.status === 'ready');
      const parts = [];
      if (ready.length) parts.push(`para entregar: ${joinList(ready.map((o) => `${o.kitchenNumber != null ? `la orden ${o.kitchenNumber}` : spokenCode(o.code)} de ${o.customerName}`))}`);
      if (pickups.length) parts.push(`para cobrar: ${joinList(pickups.map(spokenPickup))}`);
      return { text: parts.length ? `Listos ${parts.join('; y ')}.` : 'No hay nada listo por ahora.' };
    }
    case 'change': {
      const amounts = command.amounts || [];
      let due = null;
      let paid = null;
      if (command.table) {
        const tab = tableFor(command.table, tables);
        if (!tab) return { text: `La mesa ${command.table} no tiene nada pendiente.` };
        due = tab.total;
        paid = amounts[0];
      } else if (amounts.length >= 2) {
        [paid, due] = amounts[0] >= amounts[1] ? amounts : [amounts[1], amounts[0]];
      } else if (chargeInfo) {
        due = chargeInfo.amountDue;
        paid = amounts[0];
      }
      if (due == null || paid == null) return { text: 'Dime con cuánto paga y cuánto es. Por ejemplo: vuelto de 20 para 13 con 50.', tone: 'warn' };
      if (paid < due) return { text: `No alcanza: faltan ${spokenMoney(round2(due - paid))}.`, tone: 'warn' };
      return { text: `El vuelto de ${spokenMoney(paid)} para ${spokenMoney(due)} es ${spokenMoney(round2(paid - due))}.` };
    }
    case 'time':
      return { text: `Son las ${new Date().toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' })}.` };
    case 'greeting':
      return { text: '¡Hola! Aquí estoy para ayudarte con la caja. Pregúntame qué hay por cobrar, o dime qué cobrar.' };
    case 'thanks':
      return { text: '¡Con gusto!' };
    case 'whoAreYou':
      return { text: 'Soy Chef Panchita. En la caja te ayudo a cobrar más rápido y te aviso cuando algo queda listo.' };

    // --- Cobros ---
    case 'chargeTable': {
      if (!command.table) return { text: '¿Qué mesa cobro? Dime, por ejemplo: cobra la mesa 5.', tone: 'warn' };
      const tab = tableFor(command.table, tables);
      if (!tab) return { text: `La mesa ${command.table} no tiene nada pendiente de cobro.`, tone: 'warn' };
      if (tab.blocked) return { text: `La mesa ${tab.number} tiene un segundo tiempo esperando: el mesero debe marcharlo o cancelarlo antes de cobrar.`, tone: 'warn' };
      ctx.openCharge(buildTableCharge(tab));
      return { text: `Abrí el cobro de la mesa ${tab.number}: son ${spokenMoney(tab.total)}. ¿Cómo paga?`, tone: 'ok' };
    }
    case 'chargeOrder': {
      const found = findOrder(command.ref, pickups);
      if (found.order) {
        ctx.openCharge(buildPickupCharge(found.order));
        return { text: `Abrí el cobro de ${spokenPickup(found.order)}: son ${spokenMoney(found.order.amountDue)}.`, tone: 'ok' };
      }
      if (found.error === 'many') return { text: `Hay varios: ${joinList(found.matches.map(spokenPickup))}. Dime el número de orden.`, tone: 'warn' };
      if (found.error === 'missing') {
        if (pickups.length === 1) {
          ctx.openCharge(buildPickupCharge(pickups[0]));
          return { text: `Abrí el cobro de ${spokenPickup(pickups[0])}: son ${spokenMoney(pickups[0].amountDue)}.`, tone: 'ok' };
        }
        return { text: '¿Qué cobro? Dime una mesa, un número de orden o el nombre del cliente.', tone: 'warn' };
      }
      return { text: 'No encontré ese pedido entre los listos para cobrar. Los pedidos de la app llegan a caja cuando cocina los marca listos.', tone: 'warn' };
    }
    case 'deliver': {
      const found = findOrder(command.ref, toDeliver);
      if (found.error === 'many') return { text: 'Hay varios con ese nombre. Dime el número de orden.', tone: 'warn' };
      if (!found.order) return { text: 'No encontré ese pedido entre los que se entregan en caja.', tone: 'warn' };
      if (found.order.status !== 'ready') return { text: `${found.order.kitchenNumber != null ? `La orden ${found.order.kitchenNumber}` : 'Ese pedido'} todavía está en cocina.`, tone: 'warn' };
      const ok = await ctx.deliver(found.order);
      return ok
        ? { text: `Entregado: ${found.order.kitchenNumber != null ? `la orden ${found.order.kitchenNumber}` : spokenCode(found.order.code)} de ${found.order.customerName}.`, tone: 'ok' }
        : { text: 'No pude marcarlo como entregado.', tone: 'error' };
    }

    // --- Venta de mostrador ---
    case 'addItems': {
      ctx.setTab('counter');
      const added = [];
      const problems = [];
      let choice = null;
      for (const item of command.items || []) {
        const found = findProduct(item.text, menuProducts);
        if (found.product) {
          if (needsChoices(found.product)) {
            problems.push(`${found.product.name} necesita que elijas sus platillos: tócalo en la pantalla`);
            continue;
          }
          ctx.addToCart(found.product, Math.min(item.quantity, 50));
          added.push(`${item.quantity} ${found.product.name}`);
        } else if (found.options) {
          choice = { quantity: item.quantity, options: found.options };
          const names = found.options.map((p) => p.name);
          problems.push(`¿cuál quieres: ${names.slice(0, -1).join(', ')} o ${names[names.length - 1]}?`);
        } else {
          problems.push(`no encontré «${item.text}» en el menú`);
        }
      }
      const parts = [];
      if (added.length) parts.push(`Agregué ${joinList(added)}. La venta va en ${spokenMoney(ctx.nextCartTotal())}.`);
      // Cada problema como su propia oración ("¿Cuál quieres…?" ya trae su signo)
      if (problems.length) {
        parts.push(problems
          .map((p) => p.replace(/^(¿?)(\w)/, (m, q, c) => q + c.toUpperCase()))
          .map((p) => (/[?.]$/.test(p) ? p : `${p}.`))
          .join(' '));
      }
      return { text: parts.join(' '), tone: problems.length ? 'warn' : 'ok', choice };
    }
    case 'removeItem': {
      const lines = cart.lines;
      if (!lines.length) return { text: 'La venta está vacía.' };
      const found = findProduct(command.query, lines.map((l) => l.product));
      // Si dos líneas se parecen, se quita la primera
      const product = found.product || found.options?.[0] || null;
      if (!product) return { text: `No veo «${command.query}» en la venta.`, tone: 'warn' };
      ctx.removeFromCart(product.id);
      return { text: `Quité ${product.name}.`, tone: 'ok' };
    }
    case 'clearCart':
      if (!cart.lines.length) return { text: 'La venta ya está vacía.' };
      ctx.clearCart();
      return { text: 'Vacié la venta.', tone: 'ok' };
    case 'customerName':
      ctx.setTab('counter');
      ctx.updateCart({ customerName: command.name, ...(/\bpara llevar\b/.test(command.text) ? { fulfillment: 'pickup' } : {}), ...(/\bcomer aqui\b/.test(command.text) ? { fulfillment: 'dine_in' } : {}) });
      return { text: `La venta queda a nombre de ${command.name}${/\bpara llevar\b/.test(command.text) ? ', para llevar' : ''}.`, tone: 'ok' };
    case 'fulfillmentPickup':
      ctx.updateCart({ fulfillment: 'pickup' });
      return { text: 'Para llevar.', tone: 'ok' };
    case 'fulfillmentDineIn':
      ctx.updateCart({ fulfillment: 'dine_in' });
      return { text: 'Para comer aquí.', tone: 'ok' };
    case 'cartStatus':
      if (!cart.lines.length) return { text: 'La venta está vacía.' };
      return { text: `La venta lleva ${spokenItems(cart.lines.map((l) => ({ quantity: l.quantity, name: l.product.name })))}: ${spokenMoney(cartTotal(cart))}.` };
    case 'chargeCounter':
      if (!cart.lines.length) return { text: 'La venta está vacía. Dime qué agrego, por ejemplo: agrega dos horchatas.', tone: 'warn' };
      ctx.openCharge(buildCounterCharge(cart));
      return { text: `Abrí el cobro de la venta: ${plural(cartCount(cart), 'producto', 'productos')}, ${spokenMoney(cartTotal(cart))}.`, tone: 'ok' };

    // --- Navegación y turno ---
    case 'openCounter':
      ctx.setTab('counter');
      return { text: 'Abrí la venta de mostrador. Dime qué agrego.' };
    case 'openCharges':
      ctx.setTab('charges');
      return { text: 'Aquí están las cuentas por cobrar.' };
    case 'openDeliver':
      ctx.setTab('deliver');
      return { text: 'Estos son los pedidos por entregar.' };
    case 'openReceipts':
      ctx.setTab('receipts');
      return { text: `Estos son los cobros del turno: ${plural(summary.receipts ?? 0, 'comprobante', 'comprobantes')}.` };
    case 'cutX':
      ctx.openCutX();
      return { text: 'Abrí el corte X. Puedes imprimirlo sin cerrar el turno.' };
    case 'movement':
      ctx.openMovement();
      return { text: 'Abrí el movimiento de efectivo. Escribe el monto y el motivo.' };
    case 'closeShift':
      ctx.openCloseShift();
      return { text: 'Abrí el cierre de caja. Cuenta los billetes y monedas de la gaveta.' };

    // --- Dentro del cobro abierto ---
    case 'chargeCash':
    case 'chargeCard':
    case 'chargeReceived':
    case 'chargeCcf':
    case 'chargeFcf':
    case 'chargeTip':
    case 'chargeNoTip':
    case 'chargeConfirm':
    case 'chargeCancel':
      if (!chargeInfo) return { text: 'No hay un cobro abierto.', tone: 'warn' };
      return ctx.chargeVoice(command);

    default:
      return {
        text: `No te entendí bien${command.text ? `: «${command.text}»` : ''}. Pídeme ayuda para saber qué puedo hacer.`,
        tone: 'warn',
      };
  }
};

/**
 * @param {object} params
 * @param {object} params.context  Lo que ve la caja y sus acciones (se lee en cada orden)
 */
export default function useCashierPanchita({ context }) {
  const [log, setLog] = useState([]);
  const [continuous, setContinuousState] = useState(() => readPref(CONTINUOUS_KEY, false));
  const [announcements, setAnnouncementsState] = useState(() => readPref(ANNOUNCE_KEY, true));
  const contextRef = useRef(context);
  const speechRef = useRef(null);
  const lastReplyRef = useRef('');
  const choiceRef = useRef(null);
  const idRef = useRef(0);

  useEffect(() => {
    contextRef.current = context;
  });

  const addLog = useCallback((entry) => {
    idRef.current += 1;
    const id = idRef.current;
    setLog((prev) => [...prev, { id, at: Date.now(), ...entry }].slice(-MAX_LOG));
  }, []);

  const reply = useCallback((result, { silent = false } = {}) => {
    lastReplyRef.current = result.text;
    addLog({ from: 'panchita', text: result.text, tone: result.tone });
    if (!silent) speechRef.current?.speak(result.text);
  }, [addLog]);

  // Procesa una frase (hablada o escrita)
  const handleText = useCallback(async (text, { requireWakeWord = false, spoken = true } = {}) => {
    const ctx = contextRef.current;
    if (!ctx) return false;

    // Respuesta a "¿cuál?" (había varios productos parecidos)
    const choice = choiceRef.current;
    if (choice && Date.now() - choice.at < 30000) {
      const picked = findProduct(text, choice.options);
      if (picked.product) {
        choiceRef.current = null;
        addLog({ from: 'user', text });
        ctx.setTab('counter');
        ctx.addToCart(picked.product, choice.quantity);
        reply({ text: `Agregué ${choice.quantity} ${picked.product.name}. La venta va en ${spokenMoney(ctx.nextCartTotal())}.`, tone: 'ok' }, { silent: !spoken });
        return true;
      }
    }

    const command = parseCashierCommand(text, { requireWakeWord, chargeOpen: Boolean(ctx.getChargeInfo()) });
    if (!command) return false;
    if (command.intent === 'hush') {
      speechRef.current?.stopSpeaking();
      return true;
    }
    addLog({ from: 'user', text });
    const result = await runCommand(command, {
      ...ctx,
      lastReply: lastReplyRef.current,
      stopListening: () => {
        savePref(CONTINUOUS_KEY, false);
        setContinuousState(false);
        speechRef.current?.stopListening();
      },
    });
    choiceRef.current = result.choice ? { ...result.choice, at: Date.now() } : null;
    reply(result, { silent: !spoken });
    return true;
  }, [addLog, reply]);

  const handleResult = useCallback(async (alternatives, { mode, whileSpeaking = false, speakingText = '' }) => {
    if (whileSpeaking && isOwnEcho(alternatives[0], speakingText)) return;
    if (whileSpeaking) speechRef.current?.stopSpeaking();
    const requireWakeWord = mode === 'continuous';
    const chargeOpen = Boolean(contextRef.current?.getChargeInfo());
    // Se usa la primera transcripción que se entienda
    for (const alternative of alternatives) {
      const command = parseCashierCommand(alternative, { requireWakeWord, chargeOpen });
      if (command && command.intent !== 'unknown') {
        await handleText(alternative, { requireWakeWord });
        return;
      }
    }
    await handleText(alternatives[0], { requireWakeWord });
  }, [handleText]);

  const speech = useSpeech({ onResult: handleResult });
  const { supported, mode, error, startListening, stopListening, speak } = speech;

  useEffect(() => {
    speechRef.current = speech;
  });

  const setContinuous = useCallback((on) => {
    setContinuousState(on);
    savePref(CONTINUOUS_KEY, on);
    if (on) startListening('continuous');
    else stopListening();
  }, [startListening, stopListening]);

  const setAnnouncements = useCallback((on) => {
    setAnnouncementsState(on);
    savePref(ANNOUNCE_KEY, on);
  }, []);

  // Escucha continua que sobrevive a recargar (igual que en cocina)
  useEffect(() => {
    if (!continuous || !supported.recognition || mode !== 'off') return undefined;
    if (!error) {
      const timer = setTimeout(() => startListening('continuous'), 400);
      return () => clearTimeout(timer);
    }
    return runOnFirstGesture(() => startListening('continuous'));
  }, [continuous, supported.recognition, mode, error, startListening]);

  // Avisos que da sola (algo quedó listo). Siempre quedan escritos; en voz
  // alta solo si los avisos están encendidos.
  const announce = useCallback((text, tone = 'ok') => {
    lastReplyRef.current = text;
    addLog({ from: 'panchita', text, tone, notice: true });
    if (readPref(ANNOUNCE_KEY, true)) speak(text);
  }, [addLog, speak]);

  // Escrito desde el panel: se responde en voz solo si los avisos están activos
  const submitText = useCallback((text) => handleText(text, { spoken: readPref(ANNOUNCE_KEY, true) }), [handleText]);

  return { ...speech, log, continuous, setContinuous, announcements, setAnnouncements, announce, submitText };
}
