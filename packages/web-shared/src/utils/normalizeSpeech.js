// Limpia lo que transcribe el reconocimiento de voz para poder interpretarlo:
// minúsculas, sin acentos ni signos, y con los números hablados convertidos
// a cifras ("la orden tres" -> "la orden 3", "cero cuatro" -> "04").
//
// Chrome casi siempre transcribe los números como cifras, pero no siempre
// (sobre todo los del 1 al 10), así que se cubren ambos casos.

const UNITS = {
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
// "un"/"una" no se convierten: casi siempre son artículos ("una orden").

const TENS = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};

const UNIT_WORDS = Object.keys(UNITS).join('|');
const TENS_WORDS = Object.keys(TENS).join('|');

const TENS_RE = new RegExp(`\\b(${TENS_WORDS})(?:\\s+y\\s+(${UNIT_WORDS}))?\\b`, 'g');
const UNITS_RE = new RegExp(`\\b(${UNIT_WORDS})\\b`, 'g');

export const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const normalizeSpeech = (raw) => {
  let text = stripAccents(String(raw || '').toLowerCase())
    .replace(/[¿?¡!.,;:"“”«»()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = text
    .replace(TENS_RE, (match, tens, unit) => String(TENS[tens] + (unit ? UNITS[unit] : 0)))
    .replace(UNITS_RE, (match, unit) => String(UNITS[unit]));

  // "0 4" (dicho "cero cuatro") -> "04"
  text = text.replace(/\b0\s+(\d)\b/g, '0$1');

  return text;
};

export default normalizeSpeech;
