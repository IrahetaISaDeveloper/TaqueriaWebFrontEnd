// src/components/drinks/AddDrinkModal.jsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import FormModal, { FormSection, FORM_INPUT, FORM_LABEL, FORM_ERROR, PillGroup, ImagePickerField, RequiredBadge, CountBadge, OptionalBadge } from '../commons/FormModal';
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

  const recipeCount = recipeRows.filter((r) => r.name.trim()).length;

  return (
    <>
      <FormModal
        icon="wine-glass"
        title={editData ? 'Editar bebida' : 'Nueva bebida'}
        badge={editData ? 'Edición' : 'Nueva'}
        subtitle={editData ? editData.title : 'Completa la información para agregarla al menú'}
        onClose={onClose}
        onSubmit={handleSubmit(onSubmit)}
        footerNote={editData ? 'Los cambios se aplican al guardar' : 'Se agregará al catálogo del menú'}
        submitLabel={editData ? 'Guardar cambios' : 'Guardar bebida'}
      >
        {/* SECCIÓN 1: Información general */}
        <FormSection icon="list" title="Información general">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
            <div className="sm:col-span-2">
              <label className={FORM_LABEL}>Nombre de la bebida</label>
              <input
                type="text"
                {...register('name', {
                  required: 'El nombre es obligatorio',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                })}
                placeholder="ej. Limonada Natural"
                className={FORM_INPUT}
              />
              {errors.name && <span className={FORM_ERROR}>{errors.name.message}</span>}
            </div>

            <div className="sm:col-span-2">
              <label className={`${FORM_LABEL} block mb-1.5`}>Tipo de bebida</label>
              <PillGroup
                columns={2}
                options={[
                  { value: 'tercero', label: 'De tercero', icon: 'box' },
                  { value: 'casa', label: 'De casa', icon: 'flask' },
                ]}
                value={category}
                onChange={(v) => setValue('category', v, { shouldDirty: true })}
              />
              <p className="text-[11px] text-muted mt-1.5">
                {category === 'casa'
                  ? 'Se prepara en la taquería: lleva receta y descuenta insumos.'
                  : 'Se compra hecha: lleva control de stock por unidad.'}
              </p>
            </div>

            <div>
              <label className={FORM_LABEL}>Precio ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('price', {
                  required: 'El precio es obligatorio',
                  min: { value: 0.01, message: 'Debe ser mayor a 0' },
                  valueAsNumber: true,
                })}
                placeholder="ej. 3.50"
                className={FORM_INPUT}
              />
              {errors.price && <span className={FORM_ERROR}>{errors.price.message}</span>}
            </div>

            <div>
              <label className={FORM_LABEL}>Subcategoría</label>
              <div className="mt-1">
                <Select {...register('subcategory')} value={watch('subcategory')}>
                  <option value="">Selecciona una subcategoría...</option>
                  {SUBCATEGORY_SUGGESTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            </div>

            {category === 'tercero' && (
              <div>
                <label className={FORM_LABEL}>Stock (unidades)</label>
                <input
                  type="number"
                  min="0"
                  {...register('quantity', {
                    required: category === 'tercero' ? 'El stock es obligatorio' : false,
                    min: { value: 0, message: 'No puede ser negativo' },
                  })}
                  placeholder="ej. 50"
                  className={FORM_INPUT}
                />
                {errors.quantity && <span className={FORM_ERROR}>{errors.quantity.message}</span>}
              </div>
            )}

            {editData && (
              <div>
                <label className={FORM_LABEL}>Estado</label>
                <div className="mt-1">
                  <Select {...register('status', { required: true })} value={watch('status')}>
                    <option value="disponible">Disponible</option>
                    <option value="no disponible">No disponible</option>
                  </Select>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className={FORM_LABEL}>Descripción</label>
              <textarea
                {...register('description')}
                placeholder="Breve descripción de la bebida..."
                rows={2}
                className={`${FORM_INPUT} resize-none`}
              />
            </div>
          </div>
        </FormSection>

        {/* SECCIÓN 2: Receta (solo bebidas de casa) */}
        {category === 'casa' && (
          <FormSection
            icon="list-check"
            title="Receta"
            badge={recipeCount > 0
              ? <CountBadge>{recipeCount} ingrediente{recipeCount === 1 ? '' : 's'}</CountBadge>
              : <RequiredBadge />}
          >
            <RecipeBuilder
              rows={recipeRows}
              setRows={setRecipeRows}
              categories={INGREDIENT_CATEGORIES_DRINKS}
              paginate
              title=""
              helperText="Los ingredientes ligados a un insumo descuentan inventario al confirmarse una orden que use esta bebida en un combo."
            />
          </FormSection>
        )}

        {/* SECCIÓN 3: Imagen */}
        <FormSection icon="image" title="Imagen" badge={<OptionalBadge />}>
          <ImagePickerField
            imageFile={imageFile}
            currentImage={editData?.image && keepExistingImage ? editData.image : null}
            onPick={(file) => { setRawImageFile(file); setKeepExistingImage(false); }}
            onAdjust={() => setRawImageFile(imageFile)}
            onRemove={() => { setImageFile(null); setKeepExistingImage(true); }}
          />
        </FormSection>
      </FormModal>

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
    </>
  );
};

export default AddDrinkModal;
