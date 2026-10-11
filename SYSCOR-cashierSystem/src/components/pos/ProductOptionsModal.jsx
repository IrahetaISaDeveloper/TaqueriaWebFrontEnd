// components/pos/ProductOptionsModal.jsx
//
// Opciones de un producto antes de sumarlo a la venta de mostrador: los
// platillos a elegir de un combo, su bebida incluida, los extras que le
// aplican y un comentario para cocina. Mismas reglas que el checkout de la
// app (el servidor las vuelve a validar al cobrar).
import { useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import FormModal, { FORM_INPUT, FORM_LABEL } from '@syscor/web-shared/src/components/FormModal';
import { money, round2 } from '../../utils/format';

export default function ProductOptionsModal({ product, extrasById, onClose, onAdd }) {
  const maxPicks = product.selectiveMaxPicks || 1;
  const [picks, setPicks] = useState([]);
  const [drinkId, setDrinkId] = useState(product.drinks?.[0]?.id ? String(product.drinks[0].id) : '');
  const [extraIds, setExtraIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');

  const extras = (product.extras || []).map((id) => extrasById.get(String(id))).filter(Boolean);
  const chosenExtras = extras.filter((extra) => extraIds.includes(String(extra.id)));
  const unitPrice = round2(product.price + chosenExtras.reduce((sum, extra) => sum + extra.price, 0));
  const needsPicks = product.selective && (product.selectiveOptions || []).length > 0;
  const picksOk = !needsPicks || picks.length === Math.min(maxPicks, product.selectiveOptions.length);

  const togglePick = (name) =>
    setPicks((prev) => {
      if (prev.includes(name)) return prev.filter((p) => p !== name);
      if (prev.length >= maxPicks) return maxPicks === 1 ? [name] : prev;
      return [...prev, name];
    });

  const toggleExtra = (id) =>
    setExtraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!picksOk) return;
    const drink = (product.drinks || []).find((d) => String(d.id) === drinkId);
    onAdd({
      product,
      quantity,
      selectedSelectiveItems: picks,
      selectedDrinkId: drink ? String(drink.id) : null,
      drinkName: drink?.name || null,
      selectedExtras: chosenExtras.map((extra) => ({ extraId: String(extra.id), name: extra.name, price: extra.price })),
      comment: comment.trim(),
      unitPrice,
    });
  };

  const pill = (active) =>
    `px-3 py-1.5 border rounded-full text-[13px] transition-colors cursor-pointer ${
      active ? 'border-ac bg-ac text-white' : 'border-line text-inkalt hover:border-ac hover:text-ac'
    }`;

  return (
    <FormModal
      icon="plus"
      title={product.name}
      badge={money(product.price)}
      subtitle="Elige las opciones antes de agregarlo"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={`Agregar · ${money(unitPrice * quantity)}`}
      submitIcon="plus"
      submitDisabled={!picksOk}
      maxWidth="max-w-lg"
    >
      <div className="bg-white dark:bg-surface rounded-xl border border-line p-4 shadow-2xs space-y-5">
        {(product.fixed || []).length > 0 && (
          <p className="text-[13px] text-inkalt">
            <span className={FORM_LABEL}>Incluye</span>
            <span className="block mt-1">{product.fixed.join(', ')}</span>
          </p>
        )}

        {needsPicks && (
          <div>
            <p className={FORM_LABEL}>
              Elige {maxPicks === 1 ? 'un platillo' : `${Math.min(maxPicks, product.selectiveOptions.length)} platillos`} *
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.selectiveOptions.map((name) => (
                <button key={name} type="button" onClick={() => togglePick(name)} className={pill(picks.includes(name))}>
                  {picks.includes(name) && <FAIcon icon="check" size="xs" className="mr-1" />}
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {(product.drinks || []).length > 0 && (
          <div>
            <label htmlFor="combo-drink" className={FORM_LABEL}>Bebida incluida</label>
            <select id="combo-drink" className={FORM_INPUT} value={drinkId} onChange={(e) => setDrinkId(e.target.value)}>
              {product.drinks.map((drink) => (
                <option key={drink.id} value={String(drink.id)}>{drink.name}</option>
              ))}
              <option value="">Sin bebida</option>
            </select>
          </div>
        )}

        {extras.length > 0 && (
          <div>
            <p className={FORM_LABEL}>Extras</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {extras.map((extra) => (
                <button key={extra.id} type="button" onClick={() => toggleExtra(String(extra.id))} className={pill(extraIds.includes(String(extra.id)))}>
                  {extra.name} <span className="num opacity-80">+{money(extra.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <p className={FORM_LABEL}>Cantidad</p>
            <div className="mt-1 flex items-center border border-line rounded-lg">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 text-inkalt hover:text-ac cursor-pointer" aria-label="Menos">
                <FAIcon icon="minus" size="xs" />
              </button>
              <span className="flex-1 text-center num text-ink">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(50, q + 1))} className="w-9 h-9 text-inkalt hover:text-ac cursor-pointer" aria-label="Más">
                <FAIcon icon="plus" size="xs" />
              </button>
            </div>
          </div>
          <div className="col-span-2">
            <label htmlFor="item-comment" className={FORM_LABEL}>Comentario para cocina</label>
            <input id="item-comment" className={FORM_INPUT} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={120} placeholder="Ej. sin cebolla" />
          </div>
        </div>
      </div>
    </FormModal>
  );
}
