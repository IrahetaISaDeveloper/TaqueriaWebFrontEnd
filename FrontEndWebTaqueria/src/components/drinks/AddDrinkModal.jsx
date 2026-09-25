// src/components/drinks/AddDrinkModal.jsx
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
import useDrinks from '../../hooks/useDrinks';
import { INGREDIENT_CATEGORIES_DRINKS } from '../../constants/units';

const SUBCATEGORY_SUGGESTIONS = ['Gaseosa', 'Natural', 'Alcohólica', 'Lite', 'Cítrica', 'Caliente', 'Fría'];

const AddDrinkModal = ({ isOpen, onClose, onSave, onEditExisting, editData = null }) => {
  const { addToast } = useToast();
  const { quickCreateInsumo } = useInventory();
  const { checkName } = useDrinks();

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
      category: 'tercero',
      subcategory: '',
      description: '',
      quantity: '',
      status: 'disponible',
    },
  });

  const category = watch('category');

  const [rawImageFile, setRawImageFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [keepExistingImage, setKeepExistingImage] = useState(true);
  const [recipeRows, setRecipeRows] = useState([]);
  const [duplicate, setDuplicate] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setValue('name', editData.title || '');
      setValue('price', editData.price || '');
      setValue('category', editData.category || 'tercero');
      setValue('subcategory', editData.subcategory || '');
      setValue('description', editData.description || '');
      setValue('quantity', editData.stock ?? '');
      setValue('status', editData.status || 'disponible');
      setRecipeRows(
        (editData.recipe || []).map((item) => ({
          key: crypto.randomUUID(),
          name: item.name || '',
          tracked: Boolean(item.tracked),
          inventoryId: item.inventoryId?._id || item.inventoryId || null,
          quantity: item.quantity ?? '',
          unit: item.unit || 'unidad',
          ingredientCategory: 'Frutas',
          isNew: false,
        }))
      );
      setKeepExistingImage(true);
    } else {
      reset({ name: '', price: '', category: 'tercero', subcategory: '', description: '', quantity: '' });
      setRecipeRows([]);
      setKeepExistingImage(true);
    }
    setImageFile(null);
    setRawImageFile(null);
  }, [editData, isOpen, setValue, reset]);

  if (!isOpen) return null;

  const buildFormData = async (data) => {
    const resolvedRecipe = await resolveRecipeRows({ rows: recipeRows, quickCreateInsumo, addToast });

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', parseFloat(data.price));
    formData.append('category', data.category);
    formData.append('subcategory', data.subcategory || '');
    formData.append('description', data.description || '');
    if (data.category === 'tercero') {
      formData.append('quantity', parseInt(data.quantity));
    }
    // Nace 'disponible' al crear (el select de estado solo se muestra al editar)
    formData.append('status', editData ? data.status : 'disponible');
    if (data.category === 'casa') {
      formData.append('recipe', JSON.stringify(resolvedRecipe));
    }
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

    if (data.category === 'casa' && recipeRows.filter((r) => r.name.trim()).length === 0) {
      addToast('La receta es obligatoria: agrega al menos un ingrediente', 'error');
      return;
    }

    // Solo se revisa duplicado al crear, no al editar el mismo registro
    if (!editData) {
      const existing = await checkName(data.name);
      if (existing) {
        setDuplicate(existing);
        setPendingSubmit(() => data);
        return;
      }
    }

    const formData = await buildFormData(data);
    await onSave(formData);
  };

  const handleCreateAnyway = async () => {
    const data = pendingSubmit;
    setDuplicate(null);
    setPendingSubmit(null);
    if (!data) return;
    const formData = await buildFormData(data);
    await onSave(formData);
  };

  const inputClasses =
    'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt placeholder:text-muted text-sm';
  const labelClasses = 'block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-line">
        <div className="flex items-center justify-between p-4 sm:p-5 bg-ac text-white">
          <h2 className="text-base sm:text-lg font-display font-bold">
            {editData ? 'Editar Bebida' : 'Nueva Bebida'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all"
          >
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div>
            <label className={labelClasses}>Nombre de la Bebida</label>
            <input
              type="text"
              {...register('name', {
                required: 'El nombre es obligatorio',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' },
              })}
              placeholder="Ej: Limonada Natural"
              className={inputClasses}
            />
            {errors.name && <span className="text-ac text-xs mt-1 block font-medium">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                placeholder="Ej: 3.50"
                className={inputClasses}
              />
              {errors.price && <span className="text-ac text-xs mt-1 block font-medium">{errors.price.message}</span>}
            </div>
            <div>
              <label className={labelClasses}>Categoría</label>
              <Select {...register('category', { required: true })}>
                <option value="tercero">De Tercero</option>
                <option value="casa">De Casa</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelClasses}>Subcategoría</label>
              <Select {...register('subcategory')}>
                <option value="">Selecciona una subcategoría...</option>
                {SUBCATEGORY_SUGGESTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>

            {editData && (
              <div>
                <label className={labelClasses}>Estado</label>
                <Select {...register('status', { required: true })}>
                  <option value="disponible">Disponible</option>
                  <option value="no disponible">No disponible</option>
                </Select>
              </div>
            )}

            {category === 'tercero' && (
              <div>
                <label className={labelClasses}>Stock</label>
                <input
                  type="number"
                  min="0"
                  {...register('quantity', {
                    required: category === 'tercero' ? 'El stock es obligatorio' : false,
                    min: { value: 0, message: 'No puede ser negativo' },
                  })}
                  placeholder="Ej: 50"
                  className={inputClasses}
                />
                {errors.quantity && <span className="text-ac text-xs mt-1 block font-medium">{errors.quantity.message}</span>}
              </div>
            )}
          </div>

          <div>
            <label className={labelClasses}>Descripción</label>
            <textarea
              {...register('description')}
              placeholder="Breve descripción de la bebida..."
              rows={2}
              className={inputClasses}
            />
          </div>

          {category === 'casa' && (
            <div className="border-t border-line pt-4">
              <RecipeBuilder
                rows={recipeRows}
                setRows={setRecipeRows}
                categories={INGREDIENT_CATEGORIES_DRINKS}
                paginate
                title="Receta (obligatoria)"
                helperText="Los ingredientes ligados a un insumo descuentan inventario al confirmarse una orden que use esta bebida en un combo."
              />
            </div>
          )}

          <div className="border-t border-line pt-4">
            <label className={labelClasses}>Imagen (opcional)</label>

            {editData?.image && keepExistingImage && !imageFile && (
              <div className="mb-3 flex items-center gap-3 bg-surface p-2.5 rounded-none border border-line">
                <img src={editData.image} alt="Imagen actual" className="w-11 h-11 rounded-none object-cover shrink-0" />
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
                  {editData?.image ? 'Toca para reemplazarla' : 'Ningún archivo seleccionado'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    if (selected) {
                      setRawImageFile(selected);
                      setKeepExistingImage(false);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            )}

            {!editData?.image && !imageFile && (
              <p className="text-[11px] text-muted mt-1.5">Si no seleccionas una imagen se usará un diseño por defecto</p>
            )}
          </div>

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
              {editData ? 'Actualizar Cambios' : 'Guardar Bebida'}
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

export default AddDrinkModal;
