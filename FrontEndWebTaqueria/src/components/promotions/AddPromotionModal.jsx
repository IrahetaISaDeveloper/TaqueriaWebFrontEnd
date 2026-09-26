// src/components/promotions/AddPromotionModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import FAIcon from '../commons/FAIcon';
import Select from '../commons/Select';
import { useToast } from '../commons/ToastProvider';
import useSaucers from '../../hooks/useSaucers';
import useDrinks from '../../hooks/useDrinks';
import { useCombos } from '../../hooks/useCombos';
import useExtras from '../../hooks/useExtras';

// El backend rechaza cualquier vigencia mayor a esto (MAX_PROMOTION_DAYS).
// Se repite aquí solo para no dejar elegir algo que se sabe que va a fallar.
const MAX_DAYS = 3;

const TYPE_LABELS = {
  saucer: 'Platillo',
  drink: 'Bebida',
  combo: 'Combo',
  extra: 'Extra',
};

/**
 * Modal para armar una promoción del día.
 *
 * La promoción no crea productos nuevos: combina los que ya están en el menú
 * (de ahí que se carguen las cuatro listas) y les pone un precio propio y una
 * vigencia corta. Los ingredientes que se quitan se guardan por línea, para
 * que la cocina sepa que estos tacos de la promo van sin cebolla.
 */
const AddPromotionModal = ({
  isOpen,
  onClose,
  onSave,
  editingPromotion = null,
  previewPricing,
  suggestPromotions,
}) => {
  const { addToast } = useToast();
  const { saucers } = useSaucers();
  const { drinks } = useDrinks();
  const { combos } = useCombos();
  const { extras } = useExtras();

  const [form, setForm] = useState({ name: '', description: '', price: '', durationDays: 1 });
  const [items, setItems] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Selector de producto a agregar
  const [pickerType, setPickerType] = useState('saucer');
  const [pickerId, setPickerId] = useState('');

  // Asistencia de IA
  const [idea, setIdea] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  // Catálogo unificado: mismo formato para los cuatro tipos, así el selector y
  // el resumen no tienen que preguntar de qué colección vino cada producto.
  const catalog = useMemo(
    () => ({
      saucer: (saucers || []).map((s) => ({ id: s._id, name: s.name, price: s.price, recipe: s.recipe || [] })),
      drink: (drinks || []).map((d) => ({ id: d._id, name: d.name, price: d.price, recipe: d.recipe || [] })),
      combo: (combos || []).map((c) => ({ id: c._id, name: c.name, price: c.price, recipe: [] })),
      extra: (extras || []).map((e) => ({ id: e._id, name: e.name, price: e.price, recipe: [] })),
    }),
    [saucers, drinks, combos, extras]
  );

  const findInCatalog = (itemType, refId) => catalog[itemType]?.find((p) => p.id === refId) || null;

  // Precarga al editar. Las promociones guardadas traen refId ya poblado.
  useEffect(() => {
    if (!isOpen) return;

    if (editingPromotion) {
      // La vigencia se guarda como fechas; en el formulario se maneja en días,
      // que es como lo piensa el admin ("esta promo dura 2 días").
      const start = new Date(editingPromotion.startsAt).getTime();
      const end = new Date(editingPromotion.endsAt).getTime();
      const days = Math.min(Math.max(Math.ceil((end - start) / (24 * 60 * 60 * 1000)), 1), MAX_DAYS);

      setForm({
        name: editingPromotion.name || '',
        description: editingPromotion.description || '',
        price: editingPromotion.price ?? '',
        durationDays: days,
      });
      setItems(
        (editingPromotion.items || []).map((item) => ({
          itemType: item.itemType,
          refId: item.refId?._id || item.refId,
          name: item.refId?.name || 'Producto eliminado',
          quantity: item.quantity || 1,
          removedIngredients: item.removedIngredients || [],
        }))
      );
      setAiUsed(Boolean(editingPromotion.aiSuggested));
    } else {
      setForm({ name: '', description: '', price: '', durationDays: 1 });
      setItems([]);
      setAiUsed(false);
    }

    setImageFile(null);
    setPricing(null);
    setSuggestions([]);
    setIdea('');
    setPickerId('');
  }, [isOpen, editingPromotion]);

  // El "antes/ahora" se recalcula en el backend cada vez que cambia el armado
  // o el precio: es el único que conoce los precios vigentes de cada producto.
  useEffect(() => {
    if (!isOpen || items.length === 0) {
      setPricing(null);
      return;
    }

    let cancelled = false;
    const payload = items.map(({ itemType, refId, quantity }) => ({ itemType, refId, quantity }));

    previewPricing(payload, Number(form.price) || 0).then((result) => {
      if (!cancelled) setPricing(result);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, items, form.price, previewPricing]);

  const handleAddItem = () => {
    if (!pickerId) {
      addToast('Elige un producto para agregar', 'error');
      return;
    }

    // Si ya está en la promo, se suma una unidad en vez de duplicar la línea
    const existing = items.find((item) => item.itemType === pickerType && item.refId === pickerId);
    if (existing) {
      setItems((prev) =>
        prev.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item))
      );
      setPickerId('');
      return;
    }

    const product = findInCatalog(pickerType, pickerId);
    setItems((prev) => [
      ...prev,
      {
        itemType: pickerType,
        refId: pickerId,
        name: product?.name || 'Producto',
        quantity: 1,
        removedIngredients: [],
      },
    ]);
    setPickerId('');
  };

  const updateItem = (index, changes) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  // Quitar/poner un ingrediente de la receta original para esta promoción
  const toggleIngredient = (index, ingredientName) => {
    const item = items[index];
    const removed = item.removedIngredients.includes(ingredientName)
      ? item.removedIngredients.filter((name) => name !== ingredientName)
      : [...item.removedIngredients, ingredientName];

    updateItem(index, { removedIngredients: removed });
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    const result = await suggestPromotions(idea, 3);
    setSuggesting(false);

    if (result.length === 0) {
      addToast('La IA no devolvió sugerencias esta vez. Puedes armar la promoción a mano.', 'info');
      return;
    }
    setSuggestions(result);
  };

  // Cargar una sugerencia en el formulario. Queda todo editable: la IA
  // propone, el admin decide.
  const applySuggestion = (suggestion) => {
    setForm({
      name: suggestion.name || '',
      description: suggestion.description || '',
      price: suggestion.price ?? '',
      durationDays: Math.min(Math.max(suggestion.durationDays || 1, 1), MAX_DAYS),
    });
    setItems(
      (suggestion.items || []).map((item) => ({
        itemType: item.itemType,
        refId: item.refId,
        name: item.name || findInCatalog(item.itemType, item.refId)?.name || 'Producto',
        quantity: item.quantity || 1,
        removedIngredients: item.removedIngredients || [],
      }))
    );
    setAiUsed(true);
    setSuggestions([]);
    addToast('Sugerencia cargada. Revísala y ajústala antes de guardar.', 'success');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (items.length === 0) {
      addToast('Agrega al menos un producto a la promoción', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', form.price);
    formData.append(
      'items',
      JSON.stringify(
        items.map(({ itemType, refId, quantity, removedIngredients }) => ({
          itemType,
          refId,
          quantity,
          removedIngredients,
        }))
      )
    );

    // El formulario pide días; el backend guarda fechas. La conversión se hace
    // aquí, desde el momento en que se guarda.
    const startsAt = editingPromotion ? new Date(editingPromotion.startsAt) : new Date();
    const endsAt = new Date(startsAt.getTime() + Number(form.durationDays) * 24 * 60 * 60 * 1000);
    formData.append('startsAt', startsAt.toISOString());
    formData.append('endsAt', endsAt.toISOString());

    if (editingPromotion) formData.append('status', editingPromotion.status);
    if (aiUsed) formData.append('aiSuggested', 'true');
    if (imageFile) formData.append('image', imageFile);

    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  if (!isOpen) return null;

  const inputClasses =
    'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt placeholder:text-muted text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-line">
        <div className="bg-ac px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-display font-bold text-lg">
            {editingPromotion ? 'Editar promoción' : 'Nueva promoción del día'}
          </h2>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white">
            <FAIcon icon="xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* ── ASISTENCIA DE IA ── */}
          <div className="bg-surface border border-line rounded-none p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FAIcon icon="wand-magic-sparkles" className="text-ac" />
              <span className="font-display font-semibold text-sm text-ink">
                ¿No sabes qué combinar?
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Ej. algo para levantar las ventas de los martes"
                className={inputClasses}
              />
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting}
                className="px-4 py-2.5 rounded-none bg-ink text-white text-sm font-semibold whitespace-nowrap disabled:opacity-60"
              >
                {suggesting ? 'Pensando...' : 'Sugerir'}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => applySuggestion(suggestion)}
                    className="w-full text-left bg-surface rounded-none p-3 border border-line hover:border-acline transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-ink">{suggestion.name}</span>
                      <span className="text-sm font-bold text-ac">
                        ${Number(suggestion.price).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">{suggestion.description}</p>
                    <p className="text-[11px] text-muted mt-1">
                      {(suggestion.items || []).map((item) => `${item.quantity} ${item.name}`).join(' · ')}
                      {suggestion.discountPercent > 0 && ` — ahorra ${suggestion.discountPercent}%`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── DATOS BÁSICOS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-inkalt mb-1">Nombre</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej. Martes de pastor"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-inkalt mb-1">
                Precio de la promoción
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-inkalt mb-1">Descripción</label>
            <textarea
              required
              rows={2}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Lo que ve el cliente en la app"
              className={inputClasses}
            />
          </div>

          {/* ── QUÉ INCLUYE ── */}
          <div className="space-y-3">
            <span className="font-display font-semibold text-sm text-ink">
              ¿Qué incluye la promoción?
            </span>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                className="sm:w-36"
                value={pickerType}
                onChange={(e) => {
                  setPickerType(e.target.value);
                  setPickerId('');
                }}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>

              <Select className="flex-1" value={pickerId} onChange={(e) => setPickerId(e.target.value)}>
                <option value="">Selecciona un producto...</option>
                {catalog[pickerType].map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — ${Number(product.price || 0).toFixed(2)}
                  </option>
                ))}
              </Select>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2.5 rounded-none bg-ac text-white text-sm font-semibold whitespace-nowrap"
              >
                Agregar
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted text-center py-3">
                Todavía no has agregado productos. Puedes combinar platillos, bebidas, combos y extras.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const product = findInCatalog(item.itemType, item.refId);

                  return (
                    <div
                      key={`${item.itemType}-${item.refId}`}
                      className="bg-surface rounded-none p-3 border border-line space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                          className="w-16 px-2 py-1.5 bg-surfalt border border-line rounded-none text-sm text-center"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                          <p className="text-[11px] text-muted">
                            {TYPE_LABELS[item.itemType]} · ${Number(product?.price || 0).toFixed(2)} c/u
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="px-2 py-1.5 rounded-none bg-acsoft text-ac"
                        >
                          <FAIcon icon="trash" size="xs" />
                        </button>
                      </div>

                      {/* Ingredientes de la receta original: se pueden desmarcar
                          para que esta promo salga sin ellos */}
                      {product?.recipe?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {product.recipe.map((ingredient) => {
                            const isRemoved = item.removedIngredients.includes(ingredient.name);
                            return (
                              <button
                                type="button"
                                key={ingredient.name}
                                onClick={() => toggleIngredient(index, ingredient.name)}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                                  isRemoved
                                    ? 'bg-line text-muted line-through'
                                    : 'bg-oksoft text-ok'
                                }`}
                              >
                                {ingredient.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ahorro en vivo, calculado por el backend */}
            {pricing && (
              <div className="bg-surface border border-line rounded-none p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-muted">
                  Por separado: <strong className="text-inkalt">${pricing.originalPrice.toFixed(2)}</strong>
                </span>
                {pricing.price !== null && (
                  <>
                    <span className="text-muted">
                      En promoción: <strong className="text-ac">${pricing.price.toFixed(2)}</strong>
                    </span>
                    <span
                      className={`font-semibold ${
                        pricing.savings > 0 ? 'text-ok' : 'text-warn'
                      }`}
                    >
                      {pricing.savings > 0
                        ? `El cliente ahorra $${pricing.savings.toFixed(2)} (${pricing.discountPercent}%)`
                        : 'El precio no representa un descuento'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── VIGENCIA E IMAGEN ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-inkalt mb-1">
                Duración (máximo {MAX_DAYS} días)
              </label>
              <Select
                value={form.durationDays}
                onChange={(e) => setForm((prev) => ({ ...prev, durationDays: Number(e.target.value) }))}
              >
                {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((days) => (
                  <option key={days} value={days}>
                    {days} {days === 1 ? 'día' : 'días'}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-inkalt mb-1">Imagen (opcional)</label>
              {imageFile ? (
                <div className="flex flex-wrap items-center gap-2 bg-surface border border-line px-3 py-2">
                  <span className="text-xs text-inkalt flex-1 min-w-0 truncate">{imageFile.name}</span>
                  <button type="button" onClick={() => setImageFile(null)} className="shrink-0 text-xs font-medium text-ac hover:underline">
                    Quitar
                  </button>
                </div>
              ) : (
                <label className="flex flex-wrap items-center gap-2 bg-surfalt border border-dashed border-linealt px-3 py-2 cursor-pointer hover:border-ac transition-colors">
                  <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 bg-ac text-white text-xs font-display font-semibold">
                    <FAIcon icon="image" size="xs" />
                    Elegir
                  </span>
                  <span className="text-xs text-muted truncate">Ningún archivo seleccionado</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </form>

        <div className="p-5 pt-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-none bg-surface text-inkalt text-sm font-semibold border border-line"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-none bg-ac text-white text-sm font-semibold hover:bg-ac transition-all disabled:opacity-60"
          >
            {saving ? 'Guardando...' : editingPromotion ? 'Guardar cambios' : 'Crear promoción'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPromotionModal;
