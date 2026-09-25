// src/components/dishes/AddDishModal.jsx
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
import useSaucers from '../../hooks/useSaucers';
import { INGREDIENT_CATEGORIES_DISHES } from '../../constants/units';

const DISH_CATEGORIES = ['Burritos', 'Tortas', 'Tacos', 'Sopas', 'Especiales'];
const NO_SUBCATEGORY = ['Sopas', 'Especiales'];
const TACO_QUANTITIES = [3, 4, 5];
const SUBCATEGORY_SUGGESTIONS = ['Al pastor', 'Pollo', 'Carne', 'Birria', 'Vegetariano', 'Mixto'];

const AddDishModal = ({ isOpen, onClose, onSave, onEditExisting, dishToEdit = null }) => {
  const { addToast } = useToast();
  const { quickCreateInsumo } = useInventory();
  const { checkName } = useSaucers();

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
      category: 'Tacos',
      subcategory: '',
      description: '',
      price: '',
      status: 'Activo',
    },
  });

  const category = watch('category');
  const isTacoCategory = category === 'Tacos';
  const subcategoryApplies = !NO_SUBCATEGORY.includes(category);

  const [rawImageFile, setRawImageFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [recipeRows, setRecipeRows] = useState([]);
  const [tacoQuantity, setTacoQuantity] = useState(3);
  const [duplicate, setDuplicate] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (dishToEdit) {
      setValue('name', dishToEdit.name || '');
      setValue('category', dishToEdit.category || 'Tacos');
      setValue('subcategory', dishToEdit.subcategory || '');
      setValue('description', dishToEdit.description || '');
      setValue('price', dishToEdit.price || '');
      setValue('status', dishToEdit.status || 'Activo');
      setTacoQuantity(TACO_QUANTITIES.includes(dishToEdit.quantity) ? dishToEdit.quantity : 3);
      setRecipeRows(
        (dishToEdit.recipe || []).map((item) => ({
          key: crypto.randomUUID(),
          name: item.name || '',
          tracked: Boolean(item.tracked),
          inventoryId: item.inventoryId?._id || item.inventoryId || null,
          removable: Boolean(item.removable),
          quantity: item.quantity ?? '',
          unit: item.unit || 'unidad',
          ingredientCategory: 'Verduras',
          isNew: false,
        }))
      );
    } else {
      reset({ name: '', category: 'Tacos', subcategory: '', description: '', price: '', status: 'Activo' });
      setRecipeRows([]);
      setTacoQuantity(3);
    }
    setImageFile(null);
    setRawImageFile(null);
  }, [dishToEdit, isOpen, setValue, reset]);

  if (!isOpen) return null;

  const buildFormData = async (data) => {
    const resolvedRecipe = await resolveRecipeRows({ rows: recipeRows, quickCreateInsumo, addToast });

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('category', data.category);
    formData.append('subcategory', subcategoryApplies ? (data.subcategory || '') : '');
    formData.append('description', data.description || '');
    formData.append('price', parseFloat(data.price));
    formData.append('status', data.status);
    if (isTacoCategory) {
      formData.append('quantity', tacoQuantity);
    }
    formData.append('recipe', JSON.stringify(resolvedRecipe));
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return formData;
  };

  const onSubmit = async (data) => {
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      addToast('La imagen no debe superar los 5MB', 'error');
      return;
    }

    if (recipeRows.filter((r) => r.name.trim()).length === 0) {
      addToast('La receta es obligatoria: agrega al menos un ingrediente', 'error');
      return;
    }

    if (!dishToEdit) {
      const existing = await checkName(data.name);
      if (existing) {
        setDuplicate(existing);
        setPendingSubmit(() => data);
        return;
      }
    }

    const formData = await buildFormData(data);
    onSave(formData);
  };

  const handleCreateAnyway = async () => {
    const data = pendingSubmit;
    setDuplicate(null);
    setPendingSubmit(null);
    if (!data) return;
    const formData = await buildFormData(data);
    onSave(formData);
  };

  // Estilos planos estilo editorial: sin relieve, foco marcado con borde de acento
  const inputClasses =
    'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:border-ac transition-colors text-inkalt placeholder:text-muted text-sm';
  const labelClasses = 'kick text-muted mb-1.5 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-none w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-line">
        {/* Cabecera plana estilo editorial */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b-2 border-ac">
          <div className="min-w-0">
            <p className="kick text-ac mb-1">{dishToEdit ? 'Editar registro' : 'Nuevo registro'}</p>
            <h2 className="text-base sm:text-lg font-display font-bold text-ink truncate">
              {dishToEdit ? 'Editar Platillo' : 'Nuevo Platillo'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ac p-1.5 rounded-none hover:bg-surfalt transition-all shrink-0"
          >
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div>
            <label className={labelClasses}>Nombre del Platillo</label>
            <input
              type="text"
              {...register('name', {
                required: 'El nombre es obligatorio',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' },
              })}
              placeholder="Ej. Tacos al Pastor"
              className={inputClasses}
            />
            {errors.name && <span className="text-ac text-xs mt-1 block font-medium">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelClasses}>Categoría</label>
              <Select {...register('category', { required: true })}>
                {DISH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className={labelClasses}>Precio ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('price', {
                  required: 'El precio es obligatorio',
                  min: { value: 0.01, message: 'Debe ser mayor a 0' },
                  valueAsNumber: true,
                })}
                placeholder="0.00"
                className={inputClasses}
              />
              {errors.price && <span className="text-ac text-xs mt-1 block font-medium">{errors.price.message}</span>}
            </div>
          </div>

          {subcategoryApplies && (
            <div>
              <label className={labelClasses}>Subcategoría</label>
              <Select {...register('subcategory')}>
                <option value="">Selecciona una subcategoría...</option>
                {SUBCATEGORY_SUGGESTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          )}

          <div>
            <label className={labelClasses}>Descripción</label>
            <textarea
              {...register('description')}
              placeholder="Breve descripción del platillo..."
              rows={2}
              className={inputClasses}
            />
          </div>

          {isTacoCategory && (
            <div>
              <label className={labelClasses}>Cantidad de tacos por orden</label>
              <div className="flex gap-2">
                {TACO_QUANTITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setTacoQuantity(q)}
                    className={`flex-1 py-2.5 rounded-none font-display font-semibold text-sm border transition-colors ${
                      tacoQuantity === q
                        ? 'border-ac text-ac bg-acsoft'
                        : 'border-line text-inkalt bg-surfalt hover:border-ac'
                    }`}
                  >
                    {q} tacos
                  </button>
                ))}
              </div>
            </div>
          )}

          {dishToEdit && (
            <div>
              <label className={labelClasses}>Estado</label>
              <Select {...register('status')}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Select>
            </div>
          )}

          <div className="border-t border-line pt-4">
            <RecipeBuilder
              rows={recipeRows}
              setRows={setRecipeRows}
              categories={INGREDIENT_CATEGORIES_DISHES}
              showRemovable
              paginate
              title="Receta (obligatoria)"
              helperText="Marca 'el cliente puede quitarlo' para los ingredientes que se puedan pedir sin ellos. Los ingredientes ligados a un insumo descuentan inventario al confirmarse una orden con este platillo."
            />
          </div>

          <div className="border-t border-line pt-4">
            <label className={labelClasses}>Imagen (opcional)</label>

            {dishToEdit?.image && !imageFile && (
              <div className="mb-3 flex items-center gap-3 bg-surface p-2.5 rounded-none border border-line">
                <img src={dishToEdit.image} alt="Actual" className="w-11 h-11 object-cover rounded-none shadow-inner shrink-0" />
                <span className="text-xs text-muted">Conservar imagen actual</span>
              </div>
            )}

            {imageFile ? (
              <div className="flex flex-wrap items-center gap-3 bg-surface p-2.5 rounded-none border border-line">
                <img src={URL.createObjectURL(imageFile)} alt="Vista previa" className="w-11 h-11 rounded-none object-cover ring-2 ring-red-400 shrink-0" />
                <span className="text-xs text-inkalt flex-1 min-w-[80px] truncate">{imageFile.name}</span>
                <div className="flex gap-3 shrink-0">
                  <button type="button" onClick={() => setRawImageFile(imageFile)} className="text-xs font-medium text-ac hover:underline">Ajustar</button>
                  <button type="button" onClick={() => setImageFile(null)} className="text-xs font-medium text-muted hover:text-ac">Quitar</button>
                </div>
              </div>
            ) : (
              <label className="flex flex-wrap items-center gap-3 bg-surfalt border border-dashed border-linealt px-4 py-3 cursor-pointer hover:border-ac transition-colors">
                <span className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 bg-ac text-white text-xs font-display font-semibold">
                  <FAIcon icon="image" size="xs" />
                  Seleccionar imagen
                </span>
                <span className="text-xs text-muted truncate">
                  {dishToEdit?.image ? 'Toca para reemplazarla' : 'Ningún archivo seleccionado'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    if (selected) setRawImageFile(selected);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            )}

            {!dishToEdit?.image && !imageFile && (
              <p className="text-[11px] text-muted mt-1.5">Si no seleccionas una imagen se usará un diseño por defecto</p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-surfalt border border-line text-inkalt rounded-none hover:border-ac font-display font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-ac text-white rounded-none hover:bg-ac font-display font-semibold text-sm transition-colors"
            >
              {dishToEdit ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
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

export default AddDishModal;
