// "Panchita, ¿qué ingredientes lleva el burrito especial?"
//
// Busca un producto del menú por cómo lo dice el cocinero y arma la receta
// para decirla en voz alta. Usa el mismo catálogo que el modo "con detalles"
// de los tickets (hooks/useMenuCatalog.js).
import { normalizeSpeech } from '@syscor/web-shared/src/utils/normalizeSpeech';
import { formatAmount } from '../orderContent';

// Palabras que no ayudan a reconocer un platillo
const STOP_WORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'con', 'y', 'al', 'a', 'en', 'para', 'por', 'favor', 'porfa']);

// "Burritos especiales" y "burrito especial" deben coincidir: se quita la s final
const stem = (word) => (word.length > 3 && word.endsWith('es') ? word.slice(0, -2) : word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word);

const tokens = (text) =>
  normalizeSpeech(text).split(' ').filter((word) => word && !STOP_WORDS.has(word)).map(stem);

// Todo lo que tiene receta en el menú, con su tipo para decirlo bien
const menuEntries = (catalog) => [
  ...[...catalog.saucers.values()].map((item) => ({ kind: 'saucer', item })),
  ...[...catalog.combos.values()].map((item) => ({ kind: 'combo', item })),
  ...[...catalog.drinks.values()].map((item) => ({ kind: 'drink', item })),
  ...[...catalog.extras.values()].map((item) => ({ kind: 'extra', item })),
].filter((entry) => entry.item?.name);

/**
 * Productos del menú que coinciden con lo que se dijo, del mejor al peor.
 * Solo devuelve los de mejor puntaje: si son varios, quien llama pregunta cuál.
 */
export const findDishes = (query, catalog) => {
  const wanted = tokens(query);
  if (wanted.length === 0) return [];
  const wantedText = wanted.join(' ');

  const scored = menuEntries(catalog)
    .map((entry) => {
      const name = tokens(entry.item.name);
      const nameText = name.join(' ');
      let score = 0;
      if (nameText === wantedText) score = 100;
      else if (nameText.includes(wantedText) || wantedText.includes(nameText)) score = 60;
      // Palabras en común (sin importar el orden): "pastor tacos" = "tacos al pastor"
      const common = wanted.filter((word) => name.includes(word)).length;
      score += common * 10 - Math.abs(name.length - common);
      return { ...entry, score, common };
    })
    .filter((entry) => entry.common > 0 && entry.common >= Math.ceil(wanted.length / 2))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];
  const best = scored[0].score;
  return scored.filter((entry) => entry.score === best);
};

// "150 g" -> "150 gramos": la voz lee las abreviaturas letra por letra
const SPOKEN_UNITS = { g: 'gramos', kg: 'kilos', oz: 'onzas', lb: 'libras', ml: 'mililitros', l: 'litros' };
const spokenAmount = (quantity, unit) => {
  const text = formatAmount(quantity, unit);
  return text.replace(/\b(g|kg|oz|lb|ml|l)$/, (match) => SPOKEN_UNITS[match] || match);
};

const ingredientList = (recipe = []) =>
  recipe
    .filter((ingredient) => ingredient?.name)
    .map((ingredient) => {
      const amount = spokenAmount(ingredient.quantity, ingredient.unit);
      return amount ? `${ingredient.name}, ${amount}` : ingredient.name;
    });

const joinList = (parts) =>
  parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join('; ')}; y ${parts[parts.length - 1]}`;

// La receta de un producto, lista para decirse
export const spokenRecipe = ({ kind, item }) => {
  if (kind === 'combo') {
    const saucers = item.saucers.length ? item.saucers : [];
    if (saucers.length === 0 && item.options.length) {
      return `${item.name} es a elegir ${item.maxPicks || 1} entre: ${item.options.map((saucer) => saucer.name).join(', ')}. Pregúntame por cualquiera de ellos y te digo su receta.`;
    }
    const parts = saucers.map((saucer) => {
      const list = ingredientList(saucer.recipe);
      return list.length ? `${saucer.name}: ${list.join(', ')}` : `${saucer.name}, sin receta registrada`;
    });
    return `${item.name} trae ${saucers.length === 1 ? 'un platillo' : `${saucers.length} platillos`}. ${parts.join('. ')}.`;
  }

  const recipe = kind === 'extra' ? item.ingredients : item.recipe;
  const list = ingredientList(recipe);
  if (list.length === 0) {
    return `${item.name} no tiene receta registrada en el menú. Pídele a un administrador que la agregue.`;
  }
  const portion = kind === 'saucer' && item.category === 'Tacos' && item.quantity ? ` La orden es de ${item.quantity} tacos.` : '';
  return `${item.name} lleva: ${joinList(list)}.${portion}`;
};

export default { findDishes, spokenRecipe };
