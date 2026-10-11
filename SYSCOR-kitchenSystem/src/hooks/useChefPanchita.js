// hooks/useChefPanchita.js
//
// Chef Panchita en cocina: el cocinero le habla y ella consulta el tablero o
// actúa sobre él. Escuchar/hablar lo resuelve useSpeech (Web Speech API);
// entender la frase, utils/voice/kitchenCommands.js; aquí se decide qué
// hacer y qué contestar.
//
// Los datos del tablero se leen de una ref, no de las dependencias: así la
// escucha no se reinicia cada vez que llega una comanda, y la respuesta usa
// siempre el tablero tal como está en el instante en que se habló.
import { useState, useRef, useEffect, useCallback } from 'react';
import useSpeech, { runOnFirstGesture } from '@syscor/web-shared/src/hooks/useSpeech';
import { parseKitchenCommand } from '../utils/voice/kitchenCommands';
import { normalizeSpeech } from '@syscor/web-shared/src/utils/normalizeSpeech';
import { smallTalkReply } from '../utils/voice/smallTalk';
import { findDishes, spokenRecipe } from '../utils/voice/recipeLookup';
import { findOrdersByRef, spokenOrder, spokenContents, spokenCode } from '../utils/voice/orderMatching';
import { orderWorkload } from '../utils/orderContent';
import { spokenDuration } from '../utils/timeFormat';
import { TIMED_PHASES } from '../utils/orderPhase';
import { DETAIL_MODES } from '../constants/kitchenStatus';
import { orderCode } from '@syscor/web-shared/src/utils/orderCode';

const MAX_LOG = 6;

// ¿Lo que oyó el micrófono es su propia voz saliendo por la bocina? Si casi
// todas las palabras están en lo que está diciendo, es eco (el reconocimiento
// nunca transcribe exacto, por eso no se exige que coincida completo).
//
// Excepción: si empieza con "Panchita" es alguien llamándola (ella casi nunca
// arranca una frase con su nombre); solo es eco si es un pedazo literal de lo
// que está diciendo. Si no, "Panchita, ¿qué sigue?" dicho durante la
// bienvenida (que contiene "Panchita" y "qué sigue") se tomaría por eco.
const isOwnEcho = (heard, speakingText) => {
  if (!speakingText) return false;
  const speech = normalizeSpeech(speakingText);
  const said = normalizeSpeech(heard);
  if (!said) return true;
  // Una o dos palabras ("ya", "cállate") son alguien interrumpiéndola: su
  // eco por la bocina llega en frases, no en palabras sueltas.
  if (said.split(' ').length <= 2) return false;
  if (speech.includes(said)) return true;
  if (/^(?:chef\s+)?panchita\b/.test(said)) return false;
  const spoken = new Set(speech.split(' '));
  const words = said.split(' ');
  const inSpeech = words.filter((word) => spoken.has(word)).length;
  return inSpeech / words.length >= 0.7;
};

// Cuánto tiempo espera Panchita la respuesta a "¿de cuál orden?"
const FOLLOW_UP_MS = 20000;
// Para soltar esa pregunta: "olvídalo", "nada", "ninguna"...
const CANCEL_RE = /\b(?:olvidalo|olvida|nada|ninguna|ninguno|cancela|cancelalo|dejalo|no importa)\b/;

// Preferencia de escucha continua (por pantalla, como el tema)
const CONTINUOUS_KEY = 'kds_panchita_continuous';

const readContinuousPreference = () => {
  try {
    return localStorage.getItem(CONTINUOUS_KEY) === '1';
  } catch {
    return false;
  }
};

const saveContinuousPreference = (on) => {
  try {
    localStorage.setItem(CONTINUOUS_KEY, on ? '1' : '0');
  } catch {
    // Sin almacenamiento: dura hasta recargar
  }
};

// Lo que dice Panchita al empezar el turno: cómo se trabaja con la pantalla
const buildWelcome = (kitchen, continuous) =>
  [
    '¡Bienvenidos al turno! Soy Chef Panchita y hoy les ayudo en la cocina.',
    'Las comandas aparecen solas en la pantalla. Cada una tiene un número grande: es su número de cocina, empieza en uno cada día y es el que me pueden decir.',
    'Si no hay nada en cocina, la siguiente comanda entra directo; si no, espera su turno como pendiente.',
    `El color de arriba de cada ticket es la estación. El tiempo se pone amarillo a los ${kitchen?.warningMinutes ?? 10} minutos y rojo a los ${kitchen?.maxMinutes ?? 15}.`,
    continuous
      ? 'Ya estoy escuchando: díganme Panchita antes de pedirme algo.'
      : 'Para hablarme, toquen el micrófono, o activen la escucha continua y díganme Panchita antes de cada pedido.',
    'Por ejemplo: Panchita, marca la orden tres como lista. O pregúntenme cuánto tiempo lleva una orden, cuál es la más pesada o qué sigue.',
  ].join(' ');

const HELP_TEXT =
  'Puedo marcar una orden como lista, decirte cuánto tiempo lleva una orden, cuál es la más pesada, ' +
  'cuál lleva más tiempo, cuál sigue, leerte una orden, mostrar los detalles ' +
  'o decirte con qué repartidor sale una orden a domicilio. ' +
  'Por ejemplo: Panchita, marca la orden tres como lista.';

const plural = (count, singular, pluralForm) => `${count} ${count === 1 ? singular : pluralForm}`;

// "12", "12 y 15", "12, 15 y 17"
const joinNumbers = (numbers) => {
  const list = numbers.map(String);
  return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`;
};

/**
 * Lo que dice Panchita cuando arma (o completa) un paquete de reparto: qué
 * órdenes van juntas y con quién, para que la cocina empaque juntas esas
 * bolsas.
 */
export const spokenPackage = (pkg) => {
  const driver = pkg.driverName || 'el repartidor';
  const all = pkg.packageKitchenNumbers?.length ? pkg.packageKitchenNumbers : pkg.kitchenNumbers;
  if (pkg.added) {
    return `A ${driver} le sumé ${pkg.kitchenNumbers.length === 1 ? 'la orden' : 'las órdenes'} ${joinNumbers(pkg.kitchenNumbers)}, `
      + `que le queda de camino. Ahora se lleva las órdenes ${joinNumbers(all)}: empáquenlas juntas.`;
  }
  if (all.length === 1) return `La orden ${all[0]} sale a domicilio con ${driver}.`;
  return `Armé un paquete para ${driver}: las órdenes ${joinNumbers(all)} van a domicilios cercanos. Empáquenlas juntas.`;
};

const describeWorkload = ({ dishes, drinks, extras }) =>
  [
    dishes ? plural(dishes, 'platillo', 'platillos') : null,
    drinks ? plural(drinks, 'bebida', 'bebidas') : null,
    extras ? plural(extras, 'extra', 'extras') : null,
  ]
    .filter(Boolean)
    .join(', ') || 'sin productos';

// Por qué una comanda bloqueada no se puede tocar todavía
const BLOCKED_REASON = {
  waiting: 'todavía está esperando a que el mesero la marche',
  hold: 'el cliente está agregando productos',
  scheduled: 'está programada para más tarde',
};

const ASK_WHICH = '¿De cuál orden? Dime, por ejemplo: la orden tres, o la mesa cinco.';

const notFoundText = (ref) =>
  `No encontré ${ref?.table != null ? `la mesa ${ref.table}` : `la orden ${ref?.seq ?? ref?.code ?? ''}`} entre las comandas activas.`;

// Elige UNA comanda a partir de lo que se dijo, o explica por qué no puede.
const resolveOne = (ref, pool, missingText) => {
  if (!ref) return { error: ASK_WHICH, ask: true };
  const matches = findOrdersByRef(ref, pool);
  if (matches.length === 1) return { order: matches[0] };
  if (matches.length > 1) {
    const options = matches.slice(0, 3).map(spokenOrder).join(', o ');
    return { error: `Hay ${matches.length} con ese número: ${options}. Dime cuál por su código, por ejemplo: orden C L tres.`, ask: true };
  }
  return { error: missingText ?? notFoundText(ref) };
};

/**
 * Ejecuta un comando ya interpretado y devuelve qué contestar.
 * @returns {Promise<{ text: string, tone?: 'ok'|'warn'|'error' }>}
 */
const runKitchenCommand = async (command, ctx) => {
  const { entries, recentReady, catalog, kitchen, actions, setDetailMode, stopListening, lastReadyRef, packageOf } = ctx;
  const now = Date.now();
  const pool = entries.map((entry) => entry.order);
  const timed = entries.filter((entry) => TIMED_PHASES.includes(entry.phase));
  const entryOf = (order) => entries.find((entry) => entry.order._id === order._id);

  switch (command.intent) {
    case 'wake':
      return { text: '¿Sí? Dime qué necesitas.' };

    case 'help':
      return { text: HELP_TEXT };

    case 'stop':
      stopListening();
      return { text: 'Listo, dejo de escuchar. Toca el micrófono cuando me necesites.' };

    case 'details':
      setDetailMode(command.on ? DETAIL_MODES.detailed : DETAIL_MODES.simple);
      return { text: command.on ? 'Mostrando los tickets con detalles de receta.' : 'Listo, tickets sin detalles.' };

    case 'count': {
      if (entries.length === 0) return { text: 'No hay comandas activas. Todo al día.' };
      const count = (phase) => entries.filter((entry) => entry.phase === phase).length;
      const cooking = count('cooking');
      const queued = count('queued');
      const blocked = entries.length - cooking - queued;
      return {
        text:
          `Hay ${plural(cooking, 'comanda', 'comandas')} en cocina y ${plural(queued, 'pendiente', 'pendientes')}` +
          (blocked ? `, más ${blocked} en espera.` : '.') +
          (recentReady.length ? ` Se han marcado ${plural(recentReady.length, 'lista', 'listas')} en los últimos minutos.` : ''),
      };
    }

    case 'elapsed': {
      const { order, error, ask } = resolveOne(command.ref, pool);
      if (error) return { text: error, tone: 'warn', awaitRef: ask };
      const entry = entryOf(order);
      if (!TIMED_PHASES.includes(entry.phase)) {
        return { text: `${spokenOrder(order)} ${BLOCKED_REASON[entry.phase]}, así que todavía no corre su tiempo.` };
      }
      const elapsed = now - entry.since;
      const overMax = elapsed >= kitchen.maxMinutes * 60000 || order.status === 'atrasado';
      const where = entry.phase === 'cooking'
        ? 'Está en cocina.'
        : `Está pendiente, en el lugar ${entry.queuePosition} de la cola.`;
      return {
        text: `${spokenOrder(order)} lleva ${spokenDuration(elapsed)}. ${where}${overMax ? ' Ya pasó el tiempo máximo.' : ''}`,
        tone: overMax ? 'warn' : undefined,
      };
    }

    case 'heaviest': {
      if (timed.length === 0) return { text: 'No hay comandas activas.' };
      const [heaviest] = timed
        .map((entry) => ({ entry, workload: orderWorkload(entry.order, catalog) }))
        .sort((a, b) => b.workload.score - a.workload.score || a.entry.since - b.entry.since);
      const where = heaviest.entry.phase === 'cooking' ? 'Ya está en cocina.' : 'Todavía está pendiente.';
      return { text: `La más pesada es ${spokenOrder(heaviest.entry.order)}: ${describeWorkload(heaviest.workload)}. ${where}` };
    }

    case 'oldest': {
      if (timed.length === 0) return { text: 'No hay comandas activas.' };
      const oldest = timed.reduce((first, entry) => (entry.since < first.since ? entry : first));
      return { text: `La que más tiempo lleva es ${spokenOrder(oldest.order)}: ${spokenDuration(now - oldest.since)}.` };
    }

    case 'next': {
      const next = entries.find((entry) => entry.phase === 'queued');
      if (!next) return { text: 'No hay comandas en cola.' };
      return { text: `Sigue ${spokenOrder(next.order)}: ${describeWorkload(orderWorkload(next.order, catalog))}.` };
    }

    case 'read': {
      const { order, error, ask } = resolveOne(command.ref, pool);
      if (error) return { text: error, tone: 'warn', awaitRef: ask };
      return { text: `${spokenOrder(order)}. ${spokenContents(order)}` };
    }

    case 'recipe': {
      const found = findDishes(command.dish, catalog);
      if (found.length === 0) {
        return {
          text: `No encontré «${command.dish}» en el menú. Dime el nombre como aparece en el ticket, por ejemplo: qué ingredientes lleva el burrito especial.`,
          tone: 'warn',
        };
      }
      if (found.length > 1) {
        const names = [...new Set(found.map((entry) => entry.item.name))];
        if (names.length > 1) {
          return { text: `Hay varios parecidos: ${names.slice(0, 4).join(', ')}. ¿De cuál te digo la receta?`, tone: 'warn' };
        }
      }
      return { text: spokenRecipe(found[0]) };
    }

    case 'unclear': {
      // Dijo una orden pero no se entendió qué hacer: se pregunta, sin adivinar
      const { order, error, ask } = resolveOne(command.ref, pool);
      if (error) return { text: error, tone: 'warn', awaitRef: ask };
      return {
        text: `¿Qué hago con ${spokenCode(order)}? Puedo empezarla, marcarla como lista o leerte lo que lleva.`,
        tone: 'warn',
      };
    }

    case 'ready': {
      if (!command.ref) return { text: ASK_WHICH, tone: 'warn', awaitRef: true };
      // Si no está en el tablero, quizá ya se había marcado
      if (findOrdersByRef(command.ref, pool).length === 0) {
        const already = findOrdersByRef(command.ref, recentReady);
        if (already.length === 1) return { text: `${spokenCode(already[0])} ya estaba lista.` };
      }
      const { order, error, ask } = resolveOne(command.ref, pool);
      if (error) return { text: error, tone: 'warn', awaitRef: ask };
      const entry = entryOf(order);
      if (!TIMED_PHASES.includes(entry.phase)) {
        return { text: `No puedo marcar ${spokenOrder(order)}: ${BLOCKED_REASON[entry.phase]}.`, tone: 'warn' };
      }
      const result = await actions.markReady(order);
      if (!result.success) return { text: `No pude marcarla: ${result.message}`, tone: 'error' };
      lastReadyRef.current = order._id;
      return { text: `Listo. Marqué ${spokenOrder(order)} como lista.`, tone: 'ok' };
    }

    case 'driver': {
      // Las de reparto suelen estar ya listas: se buscan en ambas listas
      const searchable = [...pool, ...recentReady.filter((o) => !pool.some((p) => p._id === o._id))];
      const { order, error, ask } = resolveOne(command.ref, searchable);
      if (error) return { text: error, tone: 'warn', awaitRef: ask };
      if (!order.isDelivery && order.fulfillment !== 'delivery') {
        return { text: `${spokenOrder(order)} no es a domicilio, no lleva repartidor.` };
      }
      const pkg = packageOf?.(orderCode(order));
      if (!pkg) {
        return order.status === 'ready'
          ? { text: `${spokenOrder(order)} todavía espera repartidor: no hay nadie libre en este momento.`, tone: 'warn' }
          : { text: `${spokenOrder(order)} todavía no está lista; cuando la marquen, le busco repartidor.` };
      }
      const others = pkg.numbers.filter((n) => n !== order.kitchenNumber);
      return {
        text: others.length
          ? `${spokenOrder(order)} sale con ${pkg.driverName}, junto con ${others.length === 1 ? 'la orden' : 'las órdenes'} ${joinNumbers(others)}.`
          : `${spokenOrder(order)} sale sola con ${pkg.driverName}.`,
      };
    }

    case 'start': {
      const { order, error, ask } = resolveOne(command.ref, pool);
      if (error) return { text: error, tone: 'warn', awaitRef: ask };
      const entry = entryOf(order);
      if (entry.phase === 'cooking') return { text: `${spokenOrder(order)} ya está en cocina.` };
      // Un pedido programado sí se puede adelantar (el cliente llegó antes)
      if (entry.phase !== 'queued' && entry.phase !== 'scheduled') {
        return { text: `No puedo empezar ${spokenOrder(order)}: ${BLOCKED_REASON[entry.phase]}.`, tone: 'warn' };
      }
      const result = await actions.startOrder(order);
      if (!result.success) return { text: `No pude pasarla a cocina: ${result.message}`, tone: 'error' };
      return { text: `Pasé ${spokenOrder(order)} a cocina.`, tone: 'ok' };
    }

    case 'undo': {
      let order;
      if (command.ref) {
        const resolved = resolveOne(command.ref, recentReady, 'No encontré esa orden entre las que se marcaron como listas.');
        if (resolved.error) return { text: resolved.error, tone: 'warn', awaitRef: resolved.ask };
        order = resolved.order;
      } else {
        // "Deshaz" a secas: la última que ella misma marcó como lista
        order = recentReady.find((candidate) => candidate._id === lastReadyRef.current);
        if (!order) return { text: '¿Cuál orden regreso a cocina? Dime, por ejemplo: regresa la orden tres.' };
      }
      const result = await actions.undoReady(order);
      if (!result.success) return { text: `No pude regresarla: ${result.message}`, tone: 'error' };
      return { text: `Regresé ${spokenOrder(order)} a cocina.`, tone: 'ok' };
    }

    default: {
      // Conversación (hola, gracias, ¿cómo estás?...): se contesta como persona
      const chat = smallTalkReply(command.intent, { entries });
      if (chat) return chat;
      // Solo aquí, cuando de verdad no se entendió, se pide repetir
      return {
        text: `No te entendí bien${command.text ? `: «${command.text}»` : ''}. Puedes pedirme, por ejemplo: Panchita, marca la orden tres como lista, o preguntarme qué sigue.`,
        tone: 'warn',
      };
    }
  }
};

/**
 * @param {object} params
 * @param {Array}  params.entries      Tablero (buildBoard): { order, phase, since, queuePosition }
 * @param {Array}  params.recentReady  Comandas marcadas como listas hace poco
 * @param {object} params.catalog      Catálogo del menú (useMenuCatalog)
 * @param {object} params.kitchen      Ajustes del Sistema de Cocina (tiempos)
 * @param {object} params.actions      { markReady, startOrder, undoReady }
 * @param {Function} params.setDetailMode
 */
export default function useChefPanchita({ entries, recentReady, catalog, kitchen, actions, setDetailMode, packageOf }) {
  const [log, setLog] = useState([]);
  const contextRef = useRef(null);
  const speechRef = useRef(null);
  const lastReadyRef = useRef(null);
  // Pregunta pendiente ("¿de cuál orden?"): { intent, at }
  const pendingRef = useRef(null);
  const logIdRef = useRef(0);
  // Escucha continua que sobrevive a recargar la página (ver más abajo)
  const [continuous, setContinuousState] = useState(readContinuousPreference);

  useEffect(() => {
    contextRef.current = { entries, recentReady, catalog, kitchen, actions, setDetailMode, packageOf };
  });

  // heard = lo que se le dijo (null si habló ella sola, como la bienvenida)
  const addLog = useCallback((heard, reply) => {
    logIdRef.current += 1;
    const id = logIdRef.current;
    setLog((prev) => [{ id, heard, reply: reply.text, tone: reply.tone }, ...prev].slice(0, MAX_LOG));
  }, []);

  const handleResult = useCallback(async (alternatives, { mode, whileSpeaking = false, speakingText = '' }) => {
    // Mientras habla, el micrófono sigue abierto para que la interrumpan.
    // Lo que se oye y es parte de lo que ella misma está diciendo es su eco
    // por la bocina: se ignora.
    if (whileSpeaking && isOwnEcho(alternatives[0], speakingText)) return;

    // En escucha continua solo cuenta lo que empieza con "Panchita"; con el
    // botón, cualquier frase. Se prueban las transcripciones alternativas
    // hasta encontrar una que se entienda.
    //
    // Si Panchita acaba de preguntar "¿de cuál orden?", la respuesta puede
    // venir sin su nombre ("la tres"): mientras espera, se acepta, pero solo
    // si trae una orden o un "olvídalo"; la plática de la cocina se ignora.
    const pending = pendingRef.current && Date.now() - pendingRef.current.at < FOLLOW_UP_MS ? pendingRef.current : null;
    if (!pending) pendingRef.current = null;
    const requireWakeWord = mode === 'continuous';
    let command = null;
    let heard = alternatives[0];
    for (const alternative of alternatives) {
      let parsed = parseKitchenCommand(alternative, { requireWakeWord });
      if (!parsed && pending) {
        const loose = parseKitchenCommand(alternative, { requireWakeWord: false });
        if (loose && (loose.ref || CANCEL_RE.test(loose.text))) parsed = loose;
      }
      // "Ya" / "cállate" sueltos la callan sin decir su nombre, pero solo
      // mientras está hablando (si no, cualquier "ya" de la cocina contaría).
      if (!parsed && whileSpeaking) {
        const loose = parseKitchenCommand(alternative, { requireWakeWord: false });
        if (loose?.intent === 'hush') parsed = loose;
      }
      if (!parsed) continue;
      if (!command || (command.intent === 'unknown' && parsed.intent !== 'unknown')) {
        command = parsed;
        heard = alternative;
      }
      if (parsed.intent !== 'unknown') break;
    }
    if (!command || !contextRef.current || !speechRef.current) return;

    const speech = speechRef.current;

    // La interrumpieron con un pedido real: se calla y atiende
    if (whileSpeaking) speech.stopSpeaking();
    if (command.intent === 'hush') {
      speech.stopSpeaking();
      return;
    }

    if (pending) {
      // "Olvídalo": se suelta la pregunta
      if (CANCEL_RE.test(command.text || '') && !command.ref) {
        pendingRef.current = null;
        addLog(heard, { text: 'Va, lo dejamos.' });
        speech.speak('Va, lo dejamos.');
        return;
      }
      // Solo dijo la orden: se completa lo que había pedido antes
      if (command.ref && ['read', 'unknown', 'acknowledge', 'greeting', pending.intent].includes(command.intent)) {
        command = { ...command, intent: pending.intent, needsRef: true };
      }
    }
    const reply = await runKitchenCommand(command, {
      ...contextRef.current,
      // "Panchita, deja de escuchar" también apaga la preferencia guardada
      stopListening: () => {
        saveContinuousPreference(false);
        setContinuousState(false);
        speechRef.current?.stopListening();
      },
      lastReadyRef,
    });

    // Si volvió a preguntar cuál (no dijo orden, o hay varias), se sigue
    // esperando la respuesta; si no, la conversación queda cerrada.
    pendingRef.current = reply.awaitRef ? { intent: command.intent, at: Date.now() } : null;

    addLog(heard, reply);
    speech.speak(reply.text);
  }, [addLog]);


  const speech = useSpeech({ onResult: handleResult });
  const { supported, mode, error, startListening, stopListening, speak } = speech;

  useEffect(() => {
    speechRef.current = speech;
  });

  // --- Escucha continua que sobrevive a recargar la página ---
  // Se guarda en el navegador: si la cocina la dejó encendida, al recargar
  // (o al volver de responder, o tras usar el botón del micrófono) se reanuda
  // sola. Solo se apaga con el interruptor o diciendo "deja de escuchar".
  const setContinuous = useCallback((on) => {
    setContinuousState(on);
    saveContinuousPreference(on);
    if (on) startListening('continuous');
    else stopListening();
  }, [startListening, stopListening]);

  useEffect(() => {
    // Ya no espera a que termine de hablar: escucha mientras habla, para que
    // la puedan interrumpir (su propio eco se descarta en handleResult).
    if (!continuous || !supported.recognition || mode !== 'off') return undefined;
    // Sin error: se reanuda ya (al cargar, o tras una frase con el botón).
    // Con error (Chrome no deja usar el micrófono a una página que nadie ha
    // tocado desde que se abrió), se reintenta en el primer toque.
    if (!error) {
      const timer = setTimeout(() => startListening('continuous'), 400);
      return () => clearTimeout(timer);
    }
    return runOnFirstGesture(() => startListening('continuous'));
  }, [continuous, supported.recognition, mode, error, startListening]);

  // --- Bienvenida del turno ---
  // La dice al empezar un turno (cuando un admin habilita esta pantalla), no
  // al recargar. Queda también escrita en el panel.
  const welcome = useCallback(() => {
    const text = buildWelcome(contextRef.current?.kitchen, continuous);
    addLog(null, { text });
    speak(text);
  }, [addLog, continuous, speak]);

  // Avisos que Panchita da sola (ej. un paquete de reparto que acaba de
  // armar): quedan escritos en el panel y los dice en voz alta.
  const announce = useCallback((text, tone = 'ok') => {
    addLog(null, { text, tone });
    speak(text);
  }, [addLog, speak]);

  return { ...speech, log, continuous, setContinuous, welcome, announce };
}
