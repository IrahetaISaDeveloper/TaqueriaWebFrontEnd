// src/components/dashboard/AddComboModal.jsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import useSaucers from '../../hooks/useSaucers';
import useDrinks from '../../hooks/useDrinks';
import useDrinkSets from '../../hooks/useDrinkSets';
import { useCombos } from '../../hooks/useCombos';
import FAIcon from '../commons/FAIcon';
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

  const inputClasses =
    'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt placeholder:text-muted text-sm';
  const labelClasses = 'block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-line">
        <div className="flex items-center justify-between p-4 sm:p-5 bg-ac text-white">
          <h2 className="text-base sm:text-lg font-display font-bold">
            {comboToEdit ? 'Actualizar combo' : 'Nuevo Combo'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all"
            disabled={loading}
          >
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div>
            <label className={labelClasses}>Nombre del Combo</label>
            <input
              type="text"
              {...register('name', {
                required: 'El nombre es obligatorio',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' },
              })}
              placeholder="Ej: Combo almuerzo doble"
              className={inputClasses}
              disabled={loading}
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
                placeholder="0.00"
                className={inputClasses}
                disabled={loading}
              />
              {errors.price && <span className="text-ac text-xs mt-1 block font-medium">{errors.price.message}</span>}
            </div>
            <div>
              <label className={labelClasses}>Categoría</label>
              <Select {...register('category', { required: true })} disabled={loading}>
                <option value="individual">Individual</option>
                <option value="duo">Duo</option>
                <option value="familiar">Familiar</option>
              </Select>
            </div>
          </div>

          {comboToEdit && (
            <div>
              <label className={labelClasses}>Estado</label>
              <Select {...register('status', { required: true })} disabled={loading}>
                <option value="disponible">Disponible</option>
                <option value="no disponible">No disponible</option>
              </Select>
            </div>
          )}

          <div>
            <label className={labelClasses}>Descripción</label>
            <textarea
              {...register('description', {
                required: 'La descripción es obligatoria',
                minLength: { value: 10, message: 'Mínimo 10 caracteres' },
              })}
              placeholder="Ej: Dos platillos especiales acompañados de una bebida fría..."
              rows="2"
              className={inputClasses + ' resize-none'}
              disabled={loading}
            />
            {errors.description && <span className="text-ac text-xs mt-1 block font-medium">{errors.description.message}</span>}
          </div>

          {/* Modo selectivo */}
          <div className="border-t border-line pt-4">
            <label className="flex items-center gap-2 text-sm text-inkalt font-medium">
              <input type="checkbox" {...register('selective')} className="accent-red-500" disabled={loading} />
              Selectivo (opcional)
            </label>
            <p className="text-[11px] text-muted mt-1">
              Si lo activas, en vez de platillos fijos defines varias opciones y cuántas puede elegir el cliente
              (ej. "elige 1 taco entre: al pastor, de pollo, de carne").
            </p>
          </div>

          {selective ? (
            <div className="border-t border-line pt-4">
              <label className={labelClasses}>Opciones de platillo ({selectedOptionIds.length})</label>
              {loadingSaucers ? (
                <p className="text-xs text-muted">Cargando platillos...</p>
              ) : (
                <CardPicker
                  items={saucers}
                  selectedIds={selectedOptionIds}
                  onToggle={toggleOption}
                  categories={SAUCER_CATEGORIES}
                />
              )}

              <div className="mt-3">
                <label className={labelClasses}>¿Cuántas opciones puede elegir el cliente?</label>
                <input
                  type="number"
                  min="1"
                  max={selectedOptionIds.length || undefined}
                  {...register('selectiveMaxPicks', { required: true, min: 1, valueAsNumber: true })}
                  className={inputClasses}
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-4">
              <label className={labelClasses}>Platillos incluidos ({selectedSaucerIds.length})</label>
              {loadingSaucers ? (
                <p className="text-xs text-muted">Cargando platillos...</p>
              ) : (
                <CardPicker
                  items={saucers}
                  selectedIds={selectedSaucerIds}
                  onToggle={toggleSaucer}
                  categories={SAUCER_CATEGORIES}
                />
              )}
            </div>
          )}

          <div className="border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className={labelClasses + ' mb-0'}>Conjuntos de bebidas permitidos ({selectedDrinkSetIds.length})</label>
              <button
                type="button"
                onClick={() => setIsDrinkSetModalOpen(true)}
                className="shrink-0 text-xs font-display font-semibold text-warn hover:text-warn flex items-center gap-1"
              >
                <FAIcon icon="plus" size="xs" /> Nuevo conjunto
              </button>
            </div>
            <p className="text-[11px] text-muted mb-2">
              El cliente elige entre las bebidas de los conjuntos que marques aquí; ya están incluidas en el precio.
              Los conjuntos son solo de conveniencia y no descuentan inventario por sí mismos.
            </p>

            {drinkSets.length === 0 ? (
              <p className="text-xs text-muted text-center py-3 bg-surface rounded-none">
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
                      className={`text-left p-3 rounded-none border-2 transition-all ${
                        isSelected ? 'border-ac bg-acsoft/50' : 'border-line bg-surface hover:border-line'
                      }`}
                    >
                      <p className="text-sm font-display font-semibold text-ink">{set.name}</p>
                      <p className="text-[11px] text-muted mt-0.5 line-clamp-1">
                        {(set.drinkIds || []).map((d) => d.name).join(', ') || 'Sin bebidas'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4">
              <label className={labelClasses}>o bebidas individuales sueltas ({selectedDrinkIds.length})</label>
              <p className="text-[11px] text-muted mb-2">
                Se puede combinar con los conjuntos de arriba: ambas cosas quedan permitidas para el cliente.
              </p>
              <CardPicker items={thirdPartyDrinks} selectedIds={selectedDrinkIds} onToggle={toggleDrink} />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <label className={labelClasses}>Imagen (opcional)</label>

            {comboToEdit?.image && !imageFile && (
              <div className="mb-3 flex items-center gap-3 bg-surface p-2.5 rounded-none border border-line">
                <img src={comboToEdit.image} alt="Actual" className="w-11 h-11 object-cover rounded-none shadow-inner shrink-0" />
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
              <label className={`flex flex-wrap items-center gap-3 bg-surfalt border border-dashed border-linealt px-4 py-3 transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-ac'}`}>
                <span className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 bg-ac text-white text-xs font-display font-semibold">
                  <FAIcon icon="image" size="xs" />
                  Seleccionar imagen
                </span>
                <span className="text-xs text-muted truncate">
                  {comboToEdit?.image ? 'Toca para reemplazarla' : 'Ningún archivo seleccionado'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    if (selected) setRawImageFile(selected);
                    e.target.value = '';
                  }}
                  disabled={loading}
                  className="hidden"
                />
              </label>
            )}

            {!comboToEdit?.image && !imageFile && (
              <p className="text-[11px] text-muted mt-1.5">Si no seleccionas una imagen se usará un diseño por defecto</p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-line text-inkalt rounded-none hover:bg-linealt font-display font-semibold text-sm transition-all
              "
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-ac text-white rounded-none hover:bg-ac font-display font-semibold text-sm transition-all
                active:
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {loading ? 'Procesando...' : comboToEdit ? 'Guardar cambios' : 'Guardar combo'}
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
    </div>
  );
};

export default AddComboModal;
