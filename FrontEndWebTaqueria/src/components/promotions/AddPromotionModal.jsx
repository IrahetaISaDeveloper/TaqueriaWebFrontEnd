// src/components/promotions/AddPromotionModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import FAIcon from '../commons/FAIcon';
import FormModal, { FormSection, FORM_INPUT, FORM_LABEL, PillGroup, ImagePickerField, RequiredBadge, CountBadge, OptionalBadge } from '../commons/FormModal';
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

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <FormModal
      icon="tag"
      title={editingPromotion ? 'Editar promoción' : 'Nueva promoción'}
      badge={editingPromotion ? 'Edición' : aiUsed ? 'Con IA' : 'Nueva'}
      subtitle={editingPromotion ? editingPromotion.name : 'Combina productos del menú a un precio especial'}
      onClose={onClose}
      onSubmit={handleSubmit}
      footerNote={`Vigencia máxima de ${MAX_DAYS} días`}
      submitLabel={editingPromotion ? 'Guardar cambios' : 'Crear promoción'}
      submitting={saving}
      maxWidth="max-w-2xl"
    >
      {/* SECCIÓN 1: Asistente de IA */}
      <FormSection icon="wand-magic-sparkles" title="Asistente de IA" badge={<OptionalBadge />}>
        <p className="text-xs text-muted mb-2.5">¿No sabes qué combinar? Describe la idea y la IA te propone opciones.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="ej. algo para levantar las ventas de los martes"
            className={`${FORM_INPUT} sm:mt-0`}
          />
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-ink text-white text-xs font-display font-semibold whitespace-nowrap disabled:opacity-60 hover:bg-ink/90 transition-colors cursor-pointer"
          >
            <FAIcon icon={suggesting ? 'spinner' : 'wand-magic-sparkles'} size="xs" className={suggesting ? 'animate-spin' : ''} />
            {suggesting ? 'Pensando...' : 'Sugerir'}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2 mt-3">
            {suggestions.map((suggestion, index) => (
              <button
                type="button"
                key={index}
                onClick={() => applySuggestion(suggestion)}
                className="group/sug w-full text-left rounded-lg p-3 border border-line bg-white dark:bg-surface hover:border-ac hover:bg-ac/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-sm text-ink group-hover/sug:text-ac transition-colors">{suggestion.name}</span>
                  <span className="text-sm font-bold text-ac shrink-0">${Number(suggestion.price).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted mt-1">{suggestion.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {(suggestion.items || []).map((item, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-surfalt border border-line text-inkalt">
                      {item.quantity} {item.name}
                    </span>
                  ))}
                  {suggestion.discountPercent > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10">
                      Ahorra {suggestion.discountPercent}%
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </FormSection>

      {/* SECCIÓN 2: Información general */}
      <FormSection icon="list" title="Información general">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
          <div>
            <label className={FORM_LABEL}>Nombre</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="ej. Martes de pastor"
              className={FORM_INPUT}
            />
          </div>

          <div>
            <label className={FORM_LABEL}>Precio de la promoción ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              className={FORM_INPUT}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={FORM_LABEL}>Descripción</label>
            <textarea
              required
              rows={2}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Lo que ve el cliente en la app"
              className={`${FORM_INPUT} resize-none`}
            />
          </div>
        </div>
      </FormSection>

      {/* SECCIÓN 3: Productos incluidos */}
      <FormSection
        icon="shopping-bag"
        title="¿Qué incluye?"
        badge={items.length > 0
          ? <CountBadge>{totalUnits} producto{totalUnits === 1 ? '' : 's'}</CountBadge>
          : <RequiredBadge label="Agrega al menos uno" />}
      >
        <label className={`${FORM_LABEL} block mb-1.5`}>Tipo de producto</label>
        <PillGroup
          columns={4}
          options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          value={pickerType}
          onChange={(v) => { setPickerType(v); setPickerId(''); }}
        />

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
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
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-ac text-white text-xs font-display font-semibold whitespace-nowrap hover:bg-ac/90 transition-colors cursor-pointer shadow-2xs"
          >
            <FAIcon icon="plus" size="xs" />
            Agregar
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted text-center py-4 mt-3 rounded-lg border border-dashed border-line">
            Todavía no has agregado productos. Puedes combinar platillos, bebidas, combos y extras.
          </p>
        ) : (
          <div className="space-y-2 mt-3">
            {items.map((item, index) => {
              const product = findInCatalog(item.itemType, item.refId);

              return (
                <div
                  key={`${item.itemType}-${item.refId}`}
                  className="rounded-lg p-3 border border-line bg-surfalt/30 space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-14 px-2 py-1.5 rounded-lg bg-white dark:bg-surface border border-line focus:border-ac focus:outline-none text-sm text-center text-ink"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold text-ink truncate">{item.name}</p>
                      <p className="text-[11px] text-muted">
                        <span className="text-ac font-semibold">{TYPE_LABELS[item.itemType]}</span> · ${Number(product?.price || 0).toFixed(2)} c/u
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      title="Quitar producto"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-ac border border-ac/30 bg-ac/5 hover:bg-ac hover:text-white transition-colors cursor-pointer"
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
                            title={isRemoved ? 'Volver a incluir' : 'Quitar de esta promoción'}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                              isRemoved
                                ? 'bg-surfalt text-muted border-line line-through'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
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
          <div className="mt-3 rounded-lg border border-line bg-white dark:bg-surface p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <p className={FORM_LABEL}>Por separado</p>
              <p className="font-display font-semibold text-inkalt">${pricing.originalPrice.toFixed(2)}</p>
            </div>
            {pricing.price !== null && (
              <>
                <div>
                  <p className={FORM_LABEL}>En promoción</p>
                  <p className="font-display font-bold text-ac">${pricing.price.toFixed(2)}</p>
                </div>
                <div className="self-center">
                  {pricing.savings > 0 ? (
                    <span className="inline-flex px-2 py-1 rounded-full text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10">
                      Ahorra ${pricing.savings.toFixed(2)} ({pricing.discountPercent}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      No representa descuento
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </FormSection>

      {/* SECCIÓN 4: Vigencia */}
      <FormSection icon="clock" title="Vigencia">
        <label className={`${FORM_LABEL} block mb-1.5`}>Duración (máximo {MAX_DAYS} días)</label>
        <PillGroup
          columns={MAX_DAYS}
          options={Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((days) => ({
            value: days,
            label: `${days} ${days === 1 ? 'día' : 'días'}`,
          }))}
          value={Number(form.durationDays)}
          onChange={(v) => setForm((prev) => ({ ...prev, durationDays: v }))}
        />
      </FormSection>

      {/* SECCIÓN 5: Imagen */}
      <FormSection icon="image" title="Imagen" badge={<OptionalBadge />}>
        <ImagePickerField
          imageFile={imageFile}
          currentImage={editingPromotion?.image}
          onPick={setImageFile}
          onRemove={() => setImageFile(null)}
        />
      </FormSection>
    </FormModal>
  );
};

export default AddPromotionModal;
