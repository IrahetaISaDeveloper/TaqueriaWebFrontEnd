// Intérprete de lo que se le dice (o escribe) a Chef Panchita en la caja.
//
// Igual que en cocina, no usa IA: reglas fijas sobre la frase normalizada.
// En una caja con gente esperando conviene que la misma frase haga siempre
// lo mismo, al instante y sin depender de internet.
//
// parseCashierCommand("Panchita, cobra la mesa 5", { requireWakeWord: true })
//   -> { intent: 'chargeTable', table: 5 }
import { normalizeSpeech } from '@syscor/web-shared/src/utils/normalizeSpeech';

const WAKE_RE = /\b(?:chef\s+)?(?:panchita|pancita|panchito|pachita|panshita|pan chita)\b/;

// "13.50" / "13,50" se protegen antes de normalizar (la normalización quita
// los signos) y se leen después como 13.50.
const protectDecimals = (raw) => String(raw || '').replace(/(\d+)[.,](\d{1,2})\b/g, '$1_$2');

/**
 * Monto en una frase: "20", "13_50", "13 con 50", "13 dolares con 50 centavos",
 * "50 centavos". Devuelve el primero que encuentre (o null).
 */
export const parseAmount = (text) => {
  const decimal = text.match(/\b(\d+)_(\d{1,2})\b/);
  if (decimal) return Number(`${decimal[1]}.${decimal[2].padEnd(2, '0')}`);
  const withCents = text.match(/\b(\d+)\s*(?:dolares?|\$)?\s+con\s+(\d{1,2})\b/);
  if (withCents) return Number(withCents[1]) + Number(withCents[2]) / 100;
  const onlyCents = text.match(/\b(\d{1,2})\s+centavos\b/);
  if (onlyCents) return Number(onlyCents[1]) / 100;
  const whole = text.match(/\b(\d+)\b/);
  return whole ? Number(whole[1]) : null;
};

// Todos los montos de la frase, en orden ("vuelto de 20 para 13 con 50")
const allAmounts = (text) => {
  const found = [];
  const re = /\b(\d+)_(\d{1,2})\b|\b(\d+)\s*(?:dolares?)?\s+con\s+(\d{1,2})\b|\b(\d+)\b/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) found.push(Number(`${m[1]}.${m[2].padEnd(2, '0')}`));
    else if (m[3]) found.push(Number(m[3]) + Number(m[4]) / 100);
    else found.push(Number(m[5]));
  }
  return found;
};

const tableOf = (text) => {
  const m = text.match(/\bmesa\s*(?:numero\s*)?(\d{1,3})\b/);
  return m ? Number(m[1]) : null;
};

// Referencia a un pedido: código ("pl 10 01"), número de cocina ("la 12",
// "orden 12") o nombre del cliente ("el de ana", "el pedido de ana ruiz")
export const orderRefOf = (text) => {
  const code = text.match(/\b(pl|cl|ad)\s*(\d{1,2})\s*-?\s*(\d{1,3})\b/);
  if (code) return { code: `${code[1].toUpperCase()}${code[2].padStart(2, '0')}-${code[3].padStart(2, '0')}` };
  const number = text.match(/\b(?:orden|pedido|numero|la|el)\s*(?:numero\s*)?(\d{1,3})\b/);
  if (number) return { number: Number(number[1]) };
  const name = text.match(/\bde\s+([a-z]+(?:\s+[a-z]+)?)\s*$/);
  if (name && !['la', 'el', 'mostrador', 'efectivo', 'tarjeta'].includes(name[1])) return { name: name[1] };
  return null;
};

// --- Productos dichos en voz ("2 horchatas y un burrito especial") ---
const STOP_WORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'un', 'una', 'uno', 'unos', 'unas', 'por', 'favor', 'mas', 'otra', 'otro', 'otras', 'otros', 'y', 'a', 'al', 'me', 'porfa', 'tambien', 'orden', 'ordenes']);

const singular = (word) => {
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
};

const tokens = (text) => normalizeSpeech(String(text).replace(/-/g, ' ')).split(' ').filter((w) => w && !STOP_WORDS.has(w)).map(singular);

// Dos palabras "son la misma" si coinciden en sus primeras letras (tolera
// plurales y lo que el reconocimiento de voz corta: "taco"/"tacos")
const sameWord = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 4)) && b.startsWith(a.slice(0, 4))));

/**
 * Busca un producto del menú por lo que se dijo. Devuelve
 * { product } si hay uno claro, { options } si hay varios igual de buenos,
 * o {} si no encontró nada.
 */
export const findProduct = (query, products) => {
  const wanted = tokens(query);
  if (wanted.length === 0) return {};
  const scored = products
    .map((product) => {
      const name = tokens(product.name);
      const matched = wanted.filter((w) => name.some((n) => sameWord(w, n))).length;
      return { product, matched, coverage: matched / wanted.length, extra: name.length - matched };
    })
    .filter((s) => s.matched > 0 && s.coverage >= 0.6)
    .sort((a, b) => b.coverage - a.coverage || b.matched - a.matched || a.extra - b.extra);
  if (scored.length === 0) return {};
  const best = scored.filter((s) => s.coverage === scored[0].coverage && s.matched === scored[0].matched);
  if (best.length === 1) return { product: best[0].product };
  // Si el nombre dicho es exactamente el de uno, ese gana
  const exact = best.find((s) => tokens(s.product.name).join(' ') === wanted.join(' '));
  return exact ? { product: exact.product } : { options: best.slice(0, 3).map((s) => s.product) };
};

// "2 horchatas y un burrito especial" -> [{ quantity: 2, text: 'horchatas' }, ...]
export const parseItemList = (text) =>
  text
    .split(/\s*(?:,|\by\b|\bmas\b)\s*|\s+(?=(?:\d{1,2}|un|una|uno)\s)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(\d{1,2}|un|una|uno)\s+(.+)$/);
      if (!m) return { quantity: 1, text: chunk };
      return { quantity: /^\d+$/.test(m[1]) ? Number(m[1]) : 1, text: m[2] };
    })
    .filter((item) => item.text.length > 1);

// --- Reglas ---
// Se revisan en orden: la primera que coincide gana. Las del cobro abierto
// van primero mientras hay un cobro en pantalla ("en efectivo" ahí es elegir
// el método, no preguntar cuánto efectivo hay).
const CHARGE_RULES = [
  { intent: 'chargeConfirm', re: /\b(?:confirma|confirmar|confirmalo|confirmo|procede|cobralo ya|listo cobra|dale cobrar)\b/ },
  { intent: 'chargeCancel', re: /\b(?:cancela|cancelar|cierra el cobro|olvidalo|no cobres)\b/ },
  { intent: 'chargeCcf', re: /\bcredito fiscal\b|\bccf\b/ },
  { intent: 'chargeFcf', re: /\b(?:factura|consumidor final)\b/ },
  { intent: 'chargeNoTip', re: /\bsin propina\b/ },
  { intent: 'chargeTip', re: /\bpropina\b/ },
  { intent: 'chargeCard', re: /\b(?:con tarjeta|tarjeta|pos)\b/ },
  { intent: 'chargeReceived', re: /\b(?:paga|pago|pagan|pagaron|me da|me dio|recibo|recibi|entrego|entregan|billete)\b/ },
  { intent: 'chargeCash', re: /\b(?:en efectivo|efectivo|cash)\b/ },
];

const RULES = [
  { intent: 'hush', re: /^(?:ya|ya ya|callate|calla|basta|silencio|alto|shh)$/ },
  { intent: 'stop', re: /\b(?:deja de escuchar|duerme|a dormir|apagate|descansa)\b/ },
  { intent: 'help', re: /\b(?:ayuda|ayudame|que puedes hacer|que sabes hacer|comandos|que te puedo (?:pedir|decir))\b/ },
  { intent: 'repeat', re: /\b(?:repite|repitelo|otra vez|que dijiste|no te escuche)\b/ },
  { intent: 'change', re: /\bvuelto\b|\bcambio de\b/ },
  { intent: 'pendingList', re: /\b(?:por cobrar|pendientes?|cuentas abiertas|cuantas cuentas|quien debe|que hay que cobrar|que cobro)\b/ },
  // "Cobrar" solo como orden ("cobra", "cóbrale", "cobrar"): "¿cuánto he
  // cobrado?" o "cobros del turno" son preguntas, no cobros.
  { intent: 'chargeCounter', re: /\b(?:cobra|cobrale|cobrame|cobrar)\s+(?:la\s+)?(?:venta|canasta|mostrador)\b/ },
  { intent: 'chargeTable', re: /\b(?:cobra|cobrale|cobrame|cobrar)\b.*\bmesa\b/ },
  { intent: 'chargeOrder', re: /\b(?:cobra|cobrale|cobrame|cobrar)\b/ },
  { intent: 'deliver', re: /\bentreg\w*\b.*\b(?:pedido|orden|la|el|de|venta)\b/ },
  { intent: 'clearCart', re: /\b(?:vacia|limpia|borra|cancela)\s+(?:la\s+|toda\s+la\s+)?(?:venta|canasta|todo)\b/ },
  { intent: 'removeItem', re: /\b(?:quita|quitale|quitame|elimina|borra|saca)\b\s+(.+)$/ },
  { intent: 'addItems', re: /\b(?:agrega|agregame|agregale|anota|anotame|pon|ponme|ponle|dame|suma|sumale|anade|quiero|vende|vendeme)\b\s+(.+)$/ },
  { intent: 'customerName', re: /\ba nombre de\s+([a-z]+(?:\s+[a-z]+)?)/ },
  { intent: 'fulfillmentPickup', re: /\bpara llevar\b/ },
  { intent: 'fulfillmentDineIn', re: /\b(?:para )?comer aqui\b|\bpara aqui\b/ },
  { intent: 'billRequests', re: /\b(?:pidio|pidieron|piden|pide|mandaron|mando) (?:la )?cuenta\b/ },
  { intent: 'tableTotal', re: /\b(?:cuanto|total)\b.*\bmesa\b/ },
  { intent: 'tableItems', re: /\b(?:que|detalle)\b.*\bmesa\b/ },
  { intent: 'readyList', re: /\b(?:listos?|listas?|por entregar|hay que entregar|que entrego)\b/ },
  { intent: 'cashExpected', re: /\b(?:efectivo|gaveta|caja)\b.*\b(?:hay|deberia|tengo|esperado|queda)\b|\b(?:cuanto|que) (?:hay|tengo|deberia haber) en (?:la )?(?:caja|gaveta)\b/ },
  { intent: 'cardTotal', re: /\b(?:cuanto|total)\b.*\btarjeta\b|\btarjeta\b.*\b(?:cuanto|total)\b/ },
  { intent: 'sales', re: /\b(?:vendido|ventas|vendimos|vendi|cobrado|cobramos|como va el turno|como vamos|resumen|cuantos cobros)\b/ },
  { intent: 'cartStatus', re: /\b(?:que lleva|que tiene|cuanto es|cuanto va)\b.*\b(?:venta|canasta)\b/ },
  { intent: 'openCounter', re: /\b(?:mostrador|nueva venta|venta nueva)\b/ },
  { intent: 'openCharges', re: /\b(?:volver a cobros|ver cobros|cuentas)\b/ },
  { intent: 'openDeliver', re: /\bpor entregar\b/ },
  { intent: 'openReceipts', re: /\b(?:cobros del turno|comprobantes|facturas emitidas)\b/ },
  { intent: 'cutX', re: /\bcorte\b/ },
  { intent: 'movement', re: /\b(?:movimiento|retiro|retirar|entrada de efectivo|salida de efectivo)\b/ },
  { intent: 'closeShift', re: /\bcerrar (?:la )?caja\b|\bcierre de caja\b/ },
  { intent: 'time', re: /\b(?:que hora es|que horas son|la hora)\b/ },
  { intent: 'thanks', re: /\b(?:gracias|muy amable)\b/ },
  { intent: 'whoAreYou', re: /\b(?:quien eres|como te llamas|que eres)\b/ },
  { intent: 'greeting', re: /\b(?:hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|que tal|hey)\b/ },
];

/**
 * @param {string} transcript Lo que se dijo o escribió
 * @param {{ requireWakeWord?: boolean, chargeOpen?: boolean }} options
 * @returns {null | object} null = no iba dirigido a Panchita
 */
export const parseCashierCommand = (transcript, { requireWakeWord = false, chargeOpen = false } = {}) => {
  let text = normalizeSpeech(protectDecimals(transcript));
  const wake = text.match(WAKE_RE);
  if (requireWakeWord && !wake) return null;
  if (wake) text = text.slice(wake.index + wake[0].length).trim();
  if (!text) return { intent: 'wake', text };

  const rules = chargeOpen ? [...CHARGE_RULES, ...RULES] : RULES;
  for (const rule of rules) {
    const match = text.match(rule.re);
    if (!match) continue;
    const command = { intent: rule.intent, text };
    switch (rule.intent) {
      case 'chargeTable':
      case 'tableTotal':
      case 'tableItems':
        command.table = tableOf(text);
        break;
      case 'chargeOrder':
      case 'deliver':
        command.ref = orderRefOf(text.replace(/^.*?\b(?:cobra|cobrale|cobrame|cobrar|entreg\w*)\s*/, ''));
        break;
      case 'addItems':
        command.items = parseItemList(match[1]);
        break;
      case 'removeItem':
        command.query = match[1].replace(/\b(?:de la venta|de la canasta)\b/, '').trim();
        break;
      case 'customerName':
        command.name = match[1].replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      case 'chargeReceived':
      case 'chargeTip':
        command.amount = parseAmount(text);
        command.percent = /\bpor ?ciento\b|%/.test(text);
        break;
      case 'chargeCard': {
        const last4 = text.match(/\b(\d{4})\b/);
        command.last4 = last4 ? last4[1] : null;
        break;
      }
      case 'change': {
        command.table = tableOf(text);
        // El número de la mesa no es un monto
        command.amounts = allAmounts(command.table ? text.replace(/\bmesa\s*(?:numero\s*)?\d+/, '') : text);
        break;
      }
      default:
        break;
    }
    return command;
  }
  return { intent: 'unknown', text };
};

export default parseCashierCommand;
