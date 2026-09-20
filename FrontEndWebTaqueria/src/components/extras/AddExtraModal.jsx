// src/components/extras/AddExtraModal.jsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import FAIcon from '../commons/FAIcon';
import Select from '../commons/Select';
import ImageCropModal from '../commons/ImageCropModal';
import RecipeBuilder from '../commons/RecipeBuilder';
import { resolveRecipeRows } from '../../utils/recipeRowUtils';
import DuplicateNameDialog from '../commons/DuplicateNameDialog';
import { useToast } from '../commons/ToastProvider';
import { useInventory } from '../../hooks/useInventory';
import useExtras from '../../hooks/useExtras';
import { INGREDIENT_CATEGORIES_DISHES } from '../../constants/units';

const AI_API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/ai/suggest-recipe` : '/api/ai/suggest-recipe';

const AddExtraModal = ({ isOpen, onClose, onAdd, onEditExisting, editingExtra = null }) => {
  const { addToast } = useToast();
  const { insumos, quickCreateInsumo, checkRecipeStock, saveInsumo } = useInventory();
  const { checkName } = useExtras();
  const [rawImageFile, setRawImageFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [ingredientRows, setIngredientRows] = useState([]);
  const [duplicate, setDuplicate] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [suggestingRecipe, setSuggestingRecipe] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState([]);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [restockAmounts, setRestockAmounts] = useState({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      price: '',
      category: '',
      status: 'DISPONIBLE',
      isCompound: false,
    },
  });

  const isCompound = watch('isCompound');
  const watchedName = watch('name');

  useEffect(() => {
    if (isOpen) {
      if (editingExtra) {
        setValue('name', editingExtra.name || '');
        setValue('price', editingExtra.price || '');
        setValue('category', editingExtra.category || '');
        setValue('status', editingExtra.status || 'DISPONIBLE');
        setValue('isCompound', Boolean(editingExtra.isCompound));
        setIngredientRows(
          (editingExtra.ingredients || []).map((item) => ({
            key: crypto.randomUUID(),
            name: item.ingredientId?.name || '',
            tracked: true,
            inventoryId: item.ingredientId?._id || item.ingredientId || null,
            quantity: item.quantity ?? '',
            unit: item.unit || 'g',
            ingredientCategory: 'Otros',
            isNew: false,
          }))
        );
      } else {
        reset({
          name: '',
          price: '',
          category: '',
          status: 'DISPONIBLE',
          isCompound: false,
        });
        setIngredientRows([]);
      }
    }
    setImageFile(null);
    setRawImageFile(null);
    setMissingIngredients([]);
    setPendingFormData(null);
    setRestockAmounts({});
  }, [editingExtra, isOpen, setValue, reset]);

  const buildFormData = (data, resolvedIngredients) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', parseFloat(data.price));
    formData.append('category', data.category || '');
    formData.append('status', data.status);
    formData.append('isCompound', Boolean(data.isCompound));
    formData.append(
      'ingredients',
      JSON.stringify(
        data.isCompound
          ? resolvedIngredients.map((i) => ({ ingredientId: i.inventoryId, quantity: i.quantity, unit: i.unit }))
          : []
      )
    );
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return formData;
  };

  const onSubmit = async (data) => {
    const priceNum = parseFloat(data.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      addToast('El precio debe ser un número mayor a 0', 'error');
      return;
    }
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      addToast('La imagen no debe superar los 5MB', 'error');
      return;
    }
    if (data.isCompound && ingredientRows.filter((r) => r.name.trim()).length === 0) {
      addToast('Este extra depende de insumos: agrega al menos un ingrediente', 'error');
      return;
    }

    if (!data.isCompound) {
      const formData = buildFormData(data, []);
      await proceedToDuplicateCheck(data, formData);
      return;
    }

    // Los ingredientes de un extra siempre están ligados a un insumo real
    // (no hay "solo receta"), así que se fuerza tracked:true en cada fila
    const resolvedIngredients = await resolveRecipeRows({
      rows: ingredientRows.map((r) => ({ ...r, tracked: true })),
      quickCreateInsumo,
      addToast,
    });

    const missing = await checkRecipeStock(
      resolvedIngredients.map((r) => ({ inventoryId: r.inventoryId, tracked: true, quantity: r.quantity, unit: r.unit }))
    );

    const formData = buildFormData(data, resolvedIngredients);

    if (missing.length > 0) {
      setMissingIngredients(missing);
      setPendingFormData(formData);
      return;
    }

    await proceedToDuplicateCheck(data, formData);
  };

  const proceedToDuplicateCheck = async (data, formData) => {
    if (!editingExtra) {
      const existing = await checkName(data.name);
      if (existing) {
        setDuplicate(existing);
        setPendingSubmit(formData);
        return;
      }
    }
    onAdd(formData);
  };

  const handleCreateAnyway = () => {
    const formData = pendingSubmit;
    setDuplicate(null);
    setPendingSubmit(null);
    if (!formData) return;
    onAdd(formData);
  };

  const handleConfirmAnyway = () => {
    if (!pendingFormData) return;
    setMissingIngredients([]);
    onAdd(pendingFormData);
    setPendingFormData(null);
  };

  const handleAddStock = async (ingredientId) => {
    const amount = Number(restockAmounts[ingredientId]);
    if (!amount || amount <= 0) return;

    const target = insumos.find((i) => i._id === ingredientId);
    if (!target) return;

    const restockData = new FormData();
    restockData.append('name', target.name);
    restockData.append('itemType', 'producto');
    restockData.append('price', target.price);
    restockData.append('ubication', target.ubication);
    restockData.append('type', target.type);
    restockData.append('unit', target.unit);
    restockData.append('quantity', (Number(target.quantity) || 0) + amount);
    restockData.append('status', target.status);

    await saveInsumo(restockData, ingredientId);

    addToast(`Se agregaron ${amount} ${target.unit} a ${target.name}`, 'success');
    setRestockAmounts((prev) => ({ ...prev, [ingredientId]: '' }));

    // Volvemos a revisar el faltante con el stock ya actualizado
    const stillMissing = await checkRecipeStock(
      missingIngredients.map((r) => ({ inventoryId: r.ingredientId, tracked: true, quantity: r.needed, unit: r.unit }))
    );
    setMissingIngredients(stillMissing);
  };

  const handleSuggestRecipe = async () => {
    if (!watchedName) {
      addToast('Escribe primero el nombre del extra', 'error');
      return;
    }
    setSuggestingRecipe(true);
    try {
      const res = await fetch(AI_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: watchedName, quantity: 1, unit: 'unidad' }),
      });
      const data = await res.json();
      const suggested = Array.isArray(data.ingredients) ? data.ingredients : [];

      if (suggested.length === 0) {
        addToast('La IA no devolvió una sugerencia esta vez. Puedes armar la receta manualmente.', 'info');
        return;
      }

      setIngredientRows((prev) => [
        ...prev,
        ...suggested.map((s) => ({
          key: crypto.randomUUID(),
          name: s.name,
          tracked: true,
          inventoryId: s.inventoryId || null,
          quantity: s.quantity ?? '',
          unit: s.unit || 'g',
          ingredientCategory: 'Otros',
          isNew: !s.inventoryId,
        })),
      ]);
      addToast('Sugerencia agregada. Revísala y ajústala antes de guardar.', 'success');
    } catch {
      addToast('No se pudo obtener una sugerencia en este momento', 'info');
    } finally {
      setSuggestingRecipe(false);
    }
  };

  if (!isOpen) return null;

  // Estilos clay para inputs
  const inputClasses =
    'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt placeholder:text-muted text-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-md max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-line">
        {/* Cabecera roja con relieve */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-ac text-white">
          <h2 className="text-base sm:text-lg font-display font-bold">
            {editingExtra ? 'Editar extra' : 'Nuevo extra'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all"
          >
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        {missingIngredients.length > 0 ? (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-warnsoft/80 border border-warn text-warn px-4 py-3 rounded-none text-sm flex items-start gap-2">
              <FAIcon icon="triangle-exclamation" size="sm" className="mt-0.5" />
              <span>El stock actual no alcanza para estos ingredientes. Puedes reabastecer aquí mismo o confirmar de todas formas.</span>
            </div>

            <div className="space-y-3">
              {missingIngredients.map((item) => (
                <div key={item.ingredientId} className="bg-surface rounded-none p-3 border border-line">
                  <p className="font-display font-semibold text-ink text-sm">{item.name}</p>
                  <p className="text-xs text-muted mb-2">
                    {item.reason || `Disponible: ${item.available ?? 0} ${item.unit || ''} · Necesario: ${item.needed ?? 0} ${item.unit || ''}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={restockAmounts[item.ingredientId] || ''}
                      onChange={(e) => setRestockAmounts((prev) => ({ ...prev, [item.ingredientId]: e.target.value }))}
                      placeholder={`Agregar ${item.unit || ''}`}
                      className={inputClasses}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddStock(item.ingredientId)}
                      className="px-4 py-2.5 bg-ac text-white rounded-none text-xs font-display font-semibold hover:bg-ac transition-all shrink-0"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setMissingIngredients([]); setPendingFormData(null); }}
                className="flex-1 px-4 py-3 bg-line text-inkalt rounded-none hover:bg-linealt font-display font-semibold text-sm transition-all"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmAnyway}
                className="flex-1 px-4 py-3 bg-ac text-white rounded-none hover:bg-ac font-display font-semibold text-sm transition-all"
              >
                Confirmar de todas formas
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Nombre del extra
            </label>
            <input
              type="text"
              {...register('name', {
                required: 'El nombre es obligatorio',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              })}
              placeholder="Ej: Queso Cheddar"
              className={inputClasses}
            />
            {errors.name && <span className="text-ac text-xs mt-1 block font-medium">{errors.name.message}</span>}
          </div>

          {/* Precio */}
          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Precio ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('price', {
                required: 'El precio es obligatorio',
                min: { value: 0.01, message: 'Debe ser mayor a 0' },
                valueAsNumber: true,
              })}
              placeholder="Ej: 1.50"
              className={inputClasses}
            />
            {errors.price && <span className="text-ac text-xs mt-1 block font-medium">{errors.price.message}</span>}
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Categoría
            </label>
            <input
              type="text"
              list="extra-category-suggestions"
              {...register('category')}
              placeholder="Ej: Verduras, Lácteos, Salsas, Especial..."
              className={inputClasses}
            />
            <datalist id="extra-category-suggestions">
              <option value="Verduras" />
              <option value="Lácteos" />
              <option value="Salsas" />
              <option value="Especial" />
              <option value="Otros" />
            </datalist>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Estado
            </label>
            <Select {...register('status')}>
              <option value="DISPONIBLE">Disponible</option>
              <option value="AGOTADO">Agotado</option>
            </Select>
          </div>

          {/* ¿Depende de insumos de inventario? */}
          <div className="border-t border-line pt-4">
            <label className="flex items-center gap-2 text-sm text-inkalt font-medium">
              <input type="checkbox" {...register('isCompound')} className="accent-red-500" />
              ¿Este extra depende de insumos de inventario? (se produce a partir de otros insumos)
            </label>

            {isCompound && (
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={handleSuggestRecipe}
                  disabled={suggestingRecipe}
                  className="text-xs font-display font-semibold text-ac hover:text-ac flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FAIcon icon="wand-magic-sparkles" size="xs" />
                  {suggestingRecipe ? 'Consultando IA...' : 'Sugerir receta con IA'}
                </button>

                <RecipeBuilder
                  rows={ingredientRows}
                  setRows={setIngredientRows}
                  categories={INGREDIENT_CATEGORIES_DISHES}
                  paginate
                  title="Ingredientes"
                  helperText="Se descuentan del stock de cada ingrediente al confirmarse un pedido que incluya este extra."
                />
              </div>
            )}
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Imagen (opcional)
            </label>
            {editingExtra?.image && !imageFile && (
              <div className="mb-3 flex items-center gap-2 bg-surface p-2 rounded-none border border-line">
                <img src={editingExtra.image} alt="Actual" className="w-10 h-10 object-cover rounded-none shadow-inner" />
                <span className="text-xs text-muted truncate">Conservar imagen actual</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                if (selected) setRawImageFile(selected);
                e.target.value = '';
              }}
              className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-semibold file:bg-ac file:text-white hover:file:bg-ac file:transition-colors file: cursor-pointer"
            />
            {imageFile && (
              <div className="flex items-center gap-3 mt-2">
                <img src={URL.createObjectURL(imageFile)} alt="Vista previa" className="w-12 h-12 rounded-none object-cover ring-2 ring-red-400" />
                <button type="button" onClick={() => setRawImageFile(imageFile)} className="text-xs text-muted hover:text-ac">Ajustar</button>
                <button type="button" onClick={() => setImageFile(null)} className="text-xs text-muted hover:text-ac">Quitar</button>
              </div>
            )}
            {!editingExtra?.image && !imageFile && (
              <p className="text-[11px] text-muted mt-1">Si no seleccionas una imagen se usará un diseño por defecto</p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-line text-inkalt rounded-none hover:bg-linealt font-display font-semibold text-sm transition-all
              "
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-ac text-white rounded-none hover:bg-ac font-display font-semibold text-sm transition-all
                active:
              "
            >
              {editingExtra ? 'Actualizar extra' : 'Agregar extra'}
            </button>
          </div>
        </form>
        )}
      </div>

      <ImageCropModal
        file={rawImageFile}
        onCancel={() => setRawImageFile(null)}
        onConfirm={(croppedFile) => {
          setImageFile(croppedFile);
          setRawImageFile(null);
        }}
      />

      <DuplicateNameDialog
        existing={duplicate}
        onEditExisting={() => {
          const existing = duplicate;
          setDuplicate(null);
          setPendingSubmit(null);
          onEditExisting?.(existing);
        }}
        onCreateAnyway={handleCreateAnyway}
        onCancel={() => { setDuplicate(null); setPendingSubmit(null); }}
      />
    </div>
  );
};

export default AddExtraModal;
