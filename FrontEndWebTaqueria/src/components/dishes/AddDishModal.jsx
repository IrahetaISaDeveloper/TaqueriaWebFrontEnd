// src/components/dishes/AddDishModal.jsx
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

  const recipeCount = recipeRows.filter((r) => r.name.trim()).length;

  return (
    <>
      <FormModal
        icon="utensils"
        title={dishToEdit ? 'Editar platillo' : 'Nuevo platillo'}
        badge={dishToEdit ? 'Edición' : 'Nuevo'}
        subtitle={dishToEdit ? dishToEdit.name : 'Completa la información para agregarlo al menú'}
        onClose={onClose}
        onSubmit={handleSubmit(onSubmit)}
        footerNote={dishToEdit ? 'Los cambios se aplican al guardar' : 'Se agregará al catálogo del menú'}
        submitLabel={dishToEdit ? 'Guardar cambios' : 'Guardar platillo'}
      >
        {/* SECCIÓN 1: Información general */}
        <FormSection icon="list" title="Información general">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
            <div className="sm:col-span-2">
              <label className={FORM_LABEL}>Nombre del platillo</label>
              <input
                type="text"
                {...register('name', {
                  required: 'El nombre es obligatorio',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                })}
                placeholder="ej. Tacos al Pastor"
                className={FORM_INPUT}
              />
              {errors.name && <span className={FORM_ERROR}>{errors.name.message}</span>}
            </div>

            <div>
              <label className={FORM_LABEL}>Categoría</label>
              <div className="mt-1">
                <Select {...register('category', { required: true })} value={category}>
                  {DISH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
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
                placeholder="0.00"
                className={FORM_INPUT}
              />
              {errors.price && <span className={FORM_ERROR}>{errors.price.message}</span>}
            </div>

            {subcategoryApplies && (
              <div className={dishToEdit ? '' : 'sm:col-span-2'}>
                <label className={FORM_LABEL}>Subcategoría</label>
                <div className="mt-1">
                  <Select {...register('subcategory')} value={watch('subcategory')}>
                    <option value="">Selecciona una subcategoría...</option>
                    {SUBCATEGORY_SUGGESTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
              </div>
            )}

            {dishToEdit && (
              <div className={subcategoryApplies ? '' : 'sm:col-span-2'}>
                <label className={FORM_LABEL}>Estado</label>
                <div className="mt-1">
                  <Select {...register('status')} value={watch('status')}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </Select>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className={FORM_LABEL}>Descripción</label>
              <textarea
                {...register('description')}
                placeholder="Breve descripción del platillo..."
                rows={2}
                className={`${FORM_INPUT} resize-none`}
              />
            </div>

            {isTacoCategory && (
              <div className="sm:col-span-2">
                <label className={`${FORM_LABEL} block mb-1.5`}>Cantidad de tacos por orden</label>
                <PillGroup
                  columns={3}
                  options={TACO_QUANTITIES.map((q) => ({ value: q, label: `${q} tacos` }))}
                  value={tacoQuantity}
                  onChange={setTacoQuantity}
                />
              </div>
            )}
          </div>
        </FormSection>

        {/* SECCIÓN 2: Receta */}
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
            categories={INGREDIENT_CATEGORIES_DISHES}
            showRemovable
            paginate
            title=""
            helperText="Marca 'el cliente puede quitarlo' para los ingredientes que se puedan pedir sin ellos. Los ingredientes ligados a un insumo descuentan inventario al confirmarse una orden con este platillo."
          />
        </FormSection>

        {/* SECCIÓN 3: Imagen */}
        <FormSection icon="image" title="Imagen" badge={<OptionalBadge />}>
          <ImagePickerField
            imageFile={imageFile}
            currentImage={dishToEdit?.image}
            onPick={setRawImageFile}
            onAdjust={() => setRawImageFile(imageFile)}
            onRemove={() => setImageFile(null)}
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

export default AddDishModal;
