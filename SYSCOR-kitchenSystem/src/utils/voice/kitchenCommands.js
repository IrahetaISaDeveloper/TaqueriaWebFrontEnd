// Intérprete de lo que se le dice a Chef Panchita en cocina.
//
// No usa IA ni internet (más allá del reconocimiento de voz del navegador):
// son reglas fijas sobre la frase ya normalizada. En una cocina con ruido y
// prisa conviene que la misma frase haga siempre lo mismo, al instante.
//
// parseKitchenCommand("Panchita, marca la orden 3 como lista", { requireWakeWord: true })
//   -> { intent: 'ready', ref: { seq: 3 } }
import { normalizeSpeech } from '@syscor/web-shared/src/utils/normalizeSpeech';

// "Panchita" y cómo suele confundirla el reconocimiento de voz
const WAKE_RE = /\b(?:chef\s+)?(?:panchita|pancita|panchito|pachita|panshita|panchi ta|pan chita)\b/;

// Prefijos del código de orden (ver orderCodeUtils del backend):
// AD = a domicilio, CL = comer en el local, PL = para llevar.
const PREFIX_FORMS = [
  { prefix: 'CL', re: '(?:c\\s?l|ce\\s?ele|se\\s?ele|ce\\s?l)' },
  { prefix: 'AD', re: '(?:a\\s?d|a\\s?de)' },
  { prefix: 'PL', re: '(?:p\\s?l|pe\\s?ele|pe\\s?l)' },
];

const FULL_CODE_RE = /\b(ad|cl|pl)\s*-?\s*(\d{1,2})\s*-?\s*(\d{2,3})\b/;
const TABLE_RE = /\bmesa\s*(?:numero\s*)?(\d{1,3})\b/;
const GENERIC_REF_RE = /\b(?:orden|ordenes|pedido|comanda|ticket|numero|la|el)\s*(?:numero\s*)?(\d{1,3})\b/;
const LOOSE_NUMBER_RE = /\b(\d{1,3})\b/;

const PREFIX_HINTS = [
  { prefix: 'AD', re: /\b(?:domicilio|delivery)\b/ },
  { prefix: 'PL', re: /\b(?:llevar|recoger)\b/ },
];

// ¿De qué orden se habla? Devuelve null si la frase no menciona ninguna.
export const parseOrderRef = (text) => {
  const full = text.match(FULL_CODE_RE);
  if (full) {
    return { code: `${full[1].toUpperCase()}${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}` };
  }

  for (const { prefix, re } of PREFIX_FORMS) {
    const match = text.match(new RegExp(`\\b${re}\\s*-?\\s*(\\d{1,3})\\b`));
    if (match) return { prefix, seq: Number(match[1]) };
  }

  const table = text.match(TABLE_RE);
  if (table) return { table: Number(table[1]) };

  const generic = text.match(GENERIC_REF_RE) || text.match(LOOSE_NUMBER_RE);
  if (generic) {
    const hint = PREFIX_HINTS.find(({ re }) => re.test(text));
    return { seq: Number(generic[1]), prefix: hint?.prefix || null };
  }

  return null;
};

// Reglas en orden de prioridad: la primera que coincide gana. El orden
// importa: "¿cuánto tiempo lleva la 3?" no debe caer en "¿cuál lleva más
// tiempo?", y "no estaba lista" no debe marcarla como lista.
const INTENTS = [
  // Callarla mientras habla (sigue escuchando). Solo si es TODO lo que se
  // dijo: "ya" o "para" sueltos, no dentro de otra frase.
  { intent: 'hush', re: /^(?:ya|ya ya|callate|calla|basta|alto|espera|shh|silencio|ya esta|ya entendi|deja de hablar|para|para ya|suficiente|gracias ya)$/ },
  { intent: 'stop', re: /\b(?:duerme|dormir|a dormir|deja de escuchar|para de escuchar|apagate|descansa)\b/ },
  { intent: 'help', re: /\b(?:ayuda|ayudame|que puedes hacer|que sabes hacer|comandos|que te puedo (?:pedir|decir))\b/ },
  { intent: 'details', re: /\bdetalle/ },
  { intent: 'undo', re: /\b(?:regresa|regresala|regresar|devuelve|devuelvela|deshaz|deshacer|vuelve a cocina|no estaba list|todavia no esta list|aun no esta list|reabre)/ },
  // Reparto: con qué repartidor sale una orden a domicilio. Va antes que
  // "leer" y "lista" ("¿con quién va la que ya está lista?").
  { intent: 'driver', re: /\b(?:quien (?:se )?(?:la )?(?:lleva|llevara|va a llevar|reparte|sale con)|que repartidor|cual repartidor|repartidor (?:de|del|para|lleva)|con quien (?:va|van|sale|salen)|en que paquete|que paquete)\b/, needsRef: true },
  { intent: 'elapsed', re: /\b(?:cuanto tiempo|cuanto lleva|cuantos minutos|hace cuanto|cuanto va|que tiempo lleva|cuanto tarda)\b/, needsRef: true },
  { intent: 'heaviest', re: /\bmas (?:pesad|grande|cargad|larg|trabajo|platillos|complicad|llena)/ },
  { intent: 'oldest', re: /\b(?:mas (?:tiempo|atrasad|antigu|viej|tardad|esperando)|lleva mas|primera en entrar)/ },
  { intent: 'count', re: /\bcuant[ao]s\b/ },
  { intent: 'ready', re: /\b(?:lista|listo|listas|listos|terminad[ao]|termine|terminala|ya salio|ya sale|despacha|despachala)\b/, needsRef: true },
  // "Prepara", "cocina", "hazla"... es como se lo dice la gente en la cocina
  { intent: 'start', re: /\b(?:empieza|empiezala|empezar|empecemos|inicia|iniciala|iniciar|arranca|arrancala|arrancale|comienza|comienzala|pasa a cocina|pasala a cocina|metela|mete|prepara|preparala|preparar|preparen|cocina|cocinala|cocinar|haz|hazla|hacer|dale|dale a|echale|echa|sacala|saca|marcha|marchala)\b/, needsRef: true },
  { intent: 'next', re: /\b(?:que sigue|cual sigue|siguiente|la que sigue|que viene|cual viene)\b/ },
  { intent: 'read', re: /\b(?:que lleva|que tiene|leeme|lee|que pidieron|de que es|que trae)\b/, needsRef: true },
];

// Preguntas por la receta de un producto; el grupo 1 es el nombre del producto
const RECIPE_RE = /\b(?:que ingredientes (?:lleva|llevan|tiene|tienen|trae|traen)|cuales son los ingredientes (?:de|del)|ingredientes (?:de|del|para)|(?:la )?receta (?:de|del|para)|como se (?:prepara|preparan|hace|hacen|arma|arman|cocina|cocinan)|como (?:preparo|hago|armo|cocino)|que (?:lleva|llevan|tiene|tienen|trae|traen) (?:un|una|el|la|los|las))\s+(.+)$/;

const DETAILS_OFF_RE = /\b(?:sin|oculta|ocultar|ocultame|quita|quitar|quitale|esconde|apaga|menos)\b/;

/**
 * @param {string} transcript Lo que transcribió el navegador
 * @param {{ requireWakeWord: boolean }} options En escucha continua solo se
 *   atiende lo que viene después de "Panchita"; con el botón, todo.
 * @returns {null | { intent: string, ref?: object, on?: boolean, text: string }}
 *   null = no iba dirigido a Panchita (se ignora en silencio).
 */
// Conversación: lo que una persona le dice a otra y no es un pedido de
// cocina. Se revisa DESPUÉS de las órdenes: "Panchita, hola, marca la orden 3"
// marca la orden; "Panchita, hola" saluda. El orden importa igual que arriba
// ("muchas gracias, adiós" es despedida antes que agradecimiento).
const SMALL_TALK = [
  { intent: 'goodbye', re: /\b(?:adios|hasta luego|hasta manana|hasta la proxima|nos vemos|bye|chao|chau|me voy)\b/ },
  { intent: 'thanks', re: /\b(?:gracias|te lo agradezco|muy amable)\b/ },
  { intent: 'howAreYou', re: /\b(?:como estas|como te va|como vas|como andas|que tal (?:estas|vas|te va)|todo bien)\b/ },
  { intent: 'whoAreYou', re: /\b(?:quien eres|como te llamas|que eres|que haces|para que sirves)\b/ },
  { intent: 'time', re: /\b(?:que hora es|que horas son|dime la hora|la hora)\b/ },
  { intent: 'praise', re: /\b(?:eres la mejor|buen trabajo|muy bien|excelente|genial|te quiero|bien hecho)\b/ },
  { intent: 'greeting', re: /\b(?:hola|holi|buenas|buenos dias|buen dia|buenas tardes|buenas noches|que tal|que onda|hey|saludos|ey)\b/ },
  // Respuestas cortas de acuerdo ("ok", "va", "entendido"): solo si es TODO
  // lo que se dijo, para no confundirlas con una orden.
  { intent: 'acknowledge', re: /^(?:ok|okay|okey|va|vale|perfecto|bien|bueno|entendido|de acuerdo|claro|si|esta bien|sale)$/ },
];

// ¿La frase es solo la orden? ("la 6", "orden cero seis", "la mesa 5",
// "C L 6"): al quitar las palabras de relleno y las de la orden no queda nada.
const ORDER_WORDS = /\b(?:el|la|los|las|de|del|orden|ordenes|pedido|comanda|ticket|numero|mesa|por favor|porfa|a|ad|cl|pl|c|l|p|d|de|ce|ese|pe|ele|\d+)\b/g;
const onlyMentionsOrder = (text) => text.replace(/-/g, ' ').replace(ORDER_WORDS, ' ').trim() === '';

const matchSmallTalk = (text) => SMALL_TALK.find((rule) => rule.re.test(text))?.intent || null;

export const parseKitchenCommand = (transcript, { requireWakeWord = false } = {}) => {
  let text = normalizeSpeech(transcript);
  const wake = text.match(WAKE_RE);

  if (requireWakeWord && !wake) return null;
  // Solo cuenta lo que se dijo DESPUÉS de llamarla: lo de antes era
  // conversación de la cocina. Excepción: "hola Panchita" o "gracias
  // Panchita", donde lo importante va antes de su nombre.
  const before = wake ? text.slice(0, wake.index).trim() : '';
  if (wake) text = text.slice(wake.index + wake[0].length).trim();
  if (!text) {
    const said = matchSmallTalk(before.split(' ').slice(-3).join(' '));
    return { intent: said || 'wake', text: before };
  }

  // Receta de un producto del menú ("¿qué ingredientes lleva el burrito
  // especial?", "¿cómo se prepara la piña colada?"). Va antes que las órdenes
  // porque "cómo se prepara" no es "prepara la orden"; pero si lo que sigue es
  // una orden ("¿qué lleva la orden 3?"), es leer esa orden, no una receta.
  const recipe = text.match(RECIPE_RE);
  if (recipe && !onlyMentionsOrder(recipe[1])) {
    return { intent: 'recipe', dish: recipe[1].trim(), text };
  }

  const ref = parseOrderRef(text);

  for (const rule of INTENTS) {
    if (!rule.re.test(text)) continue;
    if (rule.intent === 'details') return { intent: 'details', on: !DETAILS_OFF_RE.test(text), text };
    return { intent: rule.intent, ref, needsRef: Boolean(rule.needsRef), text };
  }

  if (ref) {
    // Solo dijo la orden ("Panchita, la mesa 5"): se le lee lo que lleva.
    if (onlyMentionsOrder(text)) return { intent: 'read', ref, needsRef: true, text };
    // Dijo una orden con algo que no se entendió ("Panchita, fríe la 6"):
    // no se adivina; se le pregunta qué hacer con esa orden.
    return { intent: 'unclear', ref, needsRef: true, text };
  }

  const smallTalk = matchSmallTalk(text);
  if (smallTalk) return { intent: smallTalk, text };

  return { intent: 'unknown', text };
};

export default parseKitchenCommand;
