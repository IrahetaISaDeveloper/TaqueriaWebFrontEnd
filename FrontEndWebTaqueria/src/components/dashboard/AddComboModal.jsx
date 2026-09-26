// src/components/dashboard/AddComboModal.jsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import useSaucers from '../../hooks/useSaucers';
import useDrinks from '../../hooks/useDrinks';
import useDrinkSets from '../../hooks/useDrinkSets';
import { useCombos } from '../../hooks/useCombos';
import FAIcon from '../commons/FAIcon';
import FormModal, { FormSection, FORM_INPUT, FORM_LABEL, FORM_ERROR, PillGroup, ImagePickerField, RequiredBadge, CountBadge, OptionalBadge } from '../commons/FormModal';
import Select from '../commons/Select';
import CardPicker from '../commons/CardPicker';
import ImageCropModal from '../commons/ImageCropModal';
import DuplicateNameDialog from '../commons/DuplicateNameDialog';
import ConfirmModal from '../commons/ConfirmModal';
import AddDrinkSetModal from './AddDrinkSetModal';
import { useToast } from '../commons/ToastProvider.jsx';

// Todas las categorías de platillo disponibles siempre, sin importar cuáles
// ya tengan registros: si solo hay Tacos y Burritos creados, el filtro debe
// igual mostrar Tortas/Sopas/Especiales para cuando se agreguen.
const SAUCER_CATEGORIES = ['Burritos', 'Tortas', 'Tacos', 'Sopas', 'Especiales'];

const AddComboModal = ({ isOpen, onClose, onSave, onEditExisting, loading, comboToEdit = null }) => {
  const { saucers, loading: loadingSaucers } = useSaucers();
  const { drinks } = useDrinks();
  const { drinkSets, createDrinkSet } = useDrinkSets({ activeOnly: true });
  const { checkName } = useCombos();
  const { addToast } = useToast();
  const [duplicate, setDuplicate] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [isDrinkSetModalOpen, setIsDrinkSetModalOpen] = useState(false);
  const [noDrinkConfirmOpen, setNoDrinkConfirmOpen] = useState(false);

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
      description: '',
      category: 'individual',
      status: 'disponible',
      selective: false,
      selectiveMaxPicks: 1,
    },
  });

  const selective = watch('selective');

  const [selectedSaucerIds, setSelectedSaucerIds] = useState([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [selectedDrinkSetIds, setSelectedDrinkSetIds] = useState([]);
  const [selectedDrinkIds, setSelectedDrinkIds] = useState([]);
  const [rawImageFile, setRawImageFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const thirdPartyDrinks = drinks.filter((d) => d.category === 'tercero');

  useEffect(() => {
    if (!isOpen) return;

    if (comboToEdit) {
      setValue('name', comboToEdit.name);
      setValue('price', comboToEdit.price);
      setValue('description', comboToEdit.description);
      setValue('category', comboToEdit.category || 'individual');
      setValue('status', comboToEdit.status || 'disponible');
      setValue('selective', Boolean(comboToEdit.selective));
      setValue('selectiveMaxPicks', comboToEdit.selectiveMaxPicks || 1);

      setSelectedSaucerIds(
        (comboToEdit.saucers || []).map((s) => s.saucerId?._id || s.saucerId).filter(Boolean)
      );
      setSelectedOptionIds(
        (comboToEdit.selectiveOptions || []).map((s) => s.saucerId?._id || s.saucerId).filter(Boolean)
      );
      setSelectedDrinkSetIds(
        (comboToEdit.drinkPolicy?.drinkSetIds || []).map((s) => s?._id || s).filter(Boolean)
      );
      setSelectedDrinkIds(
        (comboToEdit.drinkPolicy?.thirdPartyDrinkIds || []).map((d) => d?._id || d).filter(Boolean)
      );
    } else {
      reset({
        name: '',
        price: '',
        description: '',
        category: 'individual',
        status: 'disponible',
        selective: false,
        selectiveMaxPicks: 1,
      });
      setSelectedSaucerIds([]);
      setSelectedOptionIds([]);
      setSelectedDrinkSetIds([]);
      setSelectedDrinkIds([]);
    }
    setImageFile(null);
    setRawImageFile(null);
  }, [comboToEdit, isOpen, setValue, reset]);

  const toggleSaucer = (id) =>
    setSelectedSaucerIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleOption = (id) =>
    setSelectedOptionIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleDrinkSet = (id) =>
    setSelectedDrinkSetIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleDrink = (id) =>
    setSelectedDrinkIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const onSubmit = async (data) => {
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      addToast('La imagen no debe superar los 5MB', 'error');
      return;
    }

    if (data.selective) {
      if (selectedOptionIds.length === 0) {
        addToast('En modo selectivo, selecciona al menos un platillo como opción', 'error');
        return;
      }
      const maxPicks = Number(data.selectiveMaxPicks);
      if (!maxPicks || maxPicks < 1) {
        addToast('Indica cuántas opciones puede elegir el cliente', 'error');
        return;
      }
      if (maxPicks > selectedOptionIds.length) {
        addToast('El cliente no puede elegir más opciones de las que ofreces', 'error');
        return;
      }
    } else if (selectedSaucerIds.length === 0) {
      addToast('Selecciona al menos un platillo', 'error');
      return;
    }

    if (selectedDrinkSetIds.length === 0 && selectedDrinkIds.length === 0) {
      setPendingData(data);
      setNoDrinkConfirmOpen(true);
      return;
    }

    await proceedAfterDrinkCheck(data);
  };

  // Se llama tanto si el combo sí lleva bebida como si el admin confirmó
  // que quiere guardarlo sin ninguna
  const proceedAfterDrinkCheck = async (data) => {
    if (!comboToEdit) {
      const existing = await checkName(data.name);
      if (existing) {
        setDuplicate(existing);
        setPendingData(data);
        return;
      }
    }

    await submitForm(data);
  };

  const handleConfirmNoDrink = async () => {
    const data = pendingData;
    setNoDrinkConfirmOpen(false);
    setPendingData(null);
    if (data) await proceedAfterDrinkCheck(data);
  };

  const handleCreateAnyway = async () => {
    const data = pendingData;
    setDuplicate(null);
    setPendingData(null);
    if (data) await submitForm(data);
  };

  const submitForm = async (data) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('price', parseFloat(data.price));
      formData.append('description', data.description);
      formData.append('category', data.category);
      // Nace 'disponible' al crear (el select de estado solo se muestra al editar)
      formData.append('status', comboToEdit ? data.status : 'disponible');

      formData.append('selective', Boolean(data.selective));
      if (data.selective) {
        formData.append('selectiveOptions', JSON.stringify(selectedOptionIds.map((id) => ({ saucerId: id }))));
        formData.append('selectiveMaxPicks', parseInt(data.selectiveMaxPicks) || 1);
        formData.append('saucers', JSON.stringify([]));
      } else {
        formData.append('saucers', JSON.stringify(selectedSaucerIds.map((id) => ({ saucerId: id }))));
        formData.append('selectiveOptions', JSON.stringify([]));
      }

      formData.append('drinkPolicy', JSON.stringify({
        drinkSetIds: selectedDrinkSetIds,
        thirdPartyDrinkIds: selectedDrinkIds,
      }));

      if (imageFile) {
        formData.append('image', imageFile);
      }

      await onSave(formData, comboToEdit?._id);
      reset();
    } catch (error) {
      console.error('Error al procesar el formulario del combo:', error);
    }
  };

  if (!isOpen) return null;

  const category = watch('category');
  const saucerCount = selective ? selectedOptionIds.length : selectedSaucerIds.length;
  const drinkCount = selectedDrinkSetIds.length + selectedDrinkIds.length;

  return (
    <>
      <FormModal
        icon="layer-group"
        title={comboToEdit ? 'Editar combo' : 'Nuevo combo'}
        badge={comboToEdit ? 'Edición' : 'Nuevo'}
        subtitle={comboToEdit ? comboToEdit.name : 'Arma un paquete con platillos y bebidas del menú'}
        onClose={onClose}
        onSubmit={handleSubmit(onSubmit)}
        footerNote={comboToEdit ? 'Los cambios se aplican al guardar' : 'Se agregará al catálogo del menú'}
        submitLabel={comboToEdit ? 'Guardar cambios' : 'Guardar combo'}
        submitting={loading}
        maxWidth="max-w-2xl"
      >
        {/* SECCIÓN 1: Información general */}
        <FormSection icon="list" title="Información general">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
            <div className="sm:col-span-2">
              <label className={FORM_LABEL}>Nombre del combo</label>
              <input
                type="text"
                {...register('name', {
                  required: 'El nombre es obligatorio',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                })}
                placeholder="ej. Combo almuerzo doble"
                className={FORM_INPUT}
                disabled={loading}
              />
              {errors.name && <span className={FORM_ERROR}>{errors.name.message}</span>}
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
                disabled={loading}
              />
              {errors.price && <span className={FORM_ERROR}>{errors.price.message}</span>}
            </div>

            {comboToEdit ? (
              <div>
                <label className={FORM_LABEL}>Estado</label>
                <div className="mt-1">
                  <Select {...register('status', { required: true })} value={watch('status')} disabled={loading}>
                    <option value="disponible">Disponible</option>
                    <option value="no disponible">No disponible</option>
                  </Select>
                </div>
              </div>
            ) : <div className="hidden sm:block" />}

            <div className="sm:col-span-2">
              <label className={`${FORM_LABEL} block mb-1.5`}>Categoría</label>
              <PillGroup
                columns={3}
                options={[
                  { value: 'individual', label: 'Individual', icon: 'user' },
                  { value: 'duo', label: 'Duo', icon: 'user-group' },
                  { value: 'familiar', label: 'Familiar', icon: 'users' },
                ]}
                value={category}
                onChange={(v) => setValue('category', v, { shouldDirty: true })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={FORM_LABEL}>Descripción</label>
              <textarea
                {...register('description', {
                  required: 'La descripción es obligatoria',
                  minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                })}
                placeholder="ej. Dos platillos especiales acompañados de una bebida fría..."
                rows="2"
                className={`${FORM_INPUT} resize-none`}
                disabled={loading}
              />
              {errors.description && <span className={FORM_ERROR}>{errors.description.message}</span>}
            </div>
          </div>
        </FormSection>

        {/* SECCIÓN 2: Platillos */}
        <FormSection
          icon="utensils"
          title="Platillos"
          badge={saucerCount > 0
            ? <CountBadge>{saucerCount} {selective ? 'opción' : 'platillo'}{saucerCount === 1 ? '' : selective ? 'es' : 's'}</CountBadge>
            : <RequiredBadge label="Elige al menos uno" />}
        >
          <label className={`${FORM_LABEL} block mb-1.5`}>Modo del combo</label>
          <PillGroup
            columns={2}
            options={[
              { value: false, label: 'Platillos fijos', icon: 'list' },
              { value: true, label: 'Selectivo', icon: 'list-check' },
            ]}
            value={Boolean(selective)}
            onChange={(v) => setValue('selective', v, { shouldDirty: true })}
          />
          <p className="text-[11px] text-muted mt-1.5 mb-4">
            {selective
              ? 'Defines varias opciones y cuántas puede elegir el cliente (ej. "elige 1 taco entre: al pastor, de pollo, de carne").'
              : 'El combo siempre incluye los mismos platillos.'}
          </p>

          {loadingSaucers ? (
            <p className="text-xs text-muted">Cargando platillos...</p>
          ) : (
            <CardPicker
              items={saucers}
              selectedIds={selective ? selectedOptionIds : selectedSaucerIds}
              onToggle={selective ? toggleOption : toggleSaucer}
              categories={SAUCER_CATEGORIES}
            />
          )}

          {selective && (
            <div className="mt-4 max-w-xs">
              <label className={FORM_LABEL}>¿Cuántas opciones puede elegir el cliente?</label>
              <input
                type="number"
                min="1"
                max={selectedOptionIds.length || undefined}
                {...register('selectiveMaxPicks', { required: true, min: 1, valueAsNumber: true })}
                className={FORM_INPUT}
                disabled={loading}
              />
            </div>
          )}
        </FormSection>

        {/* SECCIÓN 3: Bebidas */}
        <FormSection
          icon="wine-glass"
          title="Bebidas permitidas"
          badge={drinkCount > 0
            ? <CountBadge>{drinkCount} seleccionada{drinkCount === 1 ? '' : 's'}</CountBadge>
            : <OptionalBadge />}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <label className={FORM_LABEL}>Conjuntos de bebidas</label>
            <button
              type="button"
              onClick={() => setIsDrinkSetModalOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-display font-semibold text-ac border border-ac/30 bg-ac/5 hover:bg-ac hover:text-white transition-colors cursor-pointer"
            >
              <FAIcon icon="plus" size="xs" /> Nuevo conjunto
            </button>
          </div>
          <p className="text-[11px] text-muted mb-3">
            El cliente elige entre las bebidas de los conjuntos que marques; ya están incluidas en el precio.
          </p>

          {drinkSets.length === 0 ? (
            <p className="text-xs text-muted text-center py-4 rounded-lg border border-dashed border-line">
              Todavía no hay conjuntos creados. Usa "Nuevo conjunto" para armar el primero.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {drinkSets.map((set) => {
                const isSelected = selectedDrinkSetIds.includes(set._id);
                return (
                  <button
                    type="button"
                    key={set._id}
                    onClick={() => toggleDrinkSet(set._id)}
                    className={`text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected ? 'border-ac bg-ac/5 shadow-2xs' : 'border-line bg-white dark:bg-surface hover:border-ac/50'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-ac border-ac text-white' : 'border-linealt'
                      }`}
                    >
                      {isSelected && <FAIcon icon="check" size="xs" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-display font-semibold ${isSelected ? 'text-ac' : 'text-ink'}`}>{set.name}</span>
                      <span className="block text-[11px] text-muted mt-0.5 line-clamp-1">
                        {(set.drinkIds || []).map((d) => d.name).join(', ') || 'Sin bebidas'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-line">
            <label className={FORM_LABEL}>Bebidas individuales</label>
            <p className="text-[11px] text-muted mt-0.5 mb-3">
              Se pueden combinar con los conjuntos: ambas quedan permitidas para el cliente.
            </p>
            <CardPicker items={thirdPartyDrinks} selectedIds={selectedDrinkIds} onToggle={toggleDrink} />
          </div>
        </FormSection>

        {/* SECCIÓN 4: Imagen */}
        <FormSection icon="image" title="Imagen" badge={<OptionalBadge />}>
          <ImagePickerField
            imageFile={imageFile}
            currentImage={comboToEdit?.image}
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
          setPendingData(null);
          onEditExisting?.(existing);
        }}
        onCreateAnyway={handleCreateAnyway}
        onCancel={() => { setDuplicate(null); setPendingData(null); }}
      />

      <AddDrinkSetModal
        isOpen={isDrinkSetModalOpen}
        onClose={() => setIsDrinkSetModalOpen(false)}
        onCreated={createDrinkSet}
        drinks={thirdPartyDrinks}
      />

      <ConfirmModal
        isOpen={noDrinkConfirmOpen}
        onClose={() => { setNoDrinkConfirmOpen(false); setPendingData(null); }}
        onConfirm={handleConfirmNoDrink}
        title="Combo sin bebida"
        message="¿Estás seguro de guardar un combo sin bebida?"
        confirmText="Sí, guardar así"
        variant="warning"
      />
    </>
  );
};

export default AddComboModal;
