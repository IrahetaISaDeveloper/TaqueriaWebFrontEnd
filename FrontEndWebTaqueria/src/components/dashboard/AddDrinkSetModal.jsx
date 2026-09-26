// src/components/dashboard/AddDrinkSetModal.jsx
// Crea o edita un "conjunto de bebidas" (ej. "La clásica" = Coca-Cola +
// Fanta) para que el admin lo reutilice al armar combos sin elegir bebida
// por bebida. No descuenta inventario: es solo una agrupación de conveniencia.
import React, { useEffect, useState } from 'react';
import FormModal, { FormSection, FORM_INPUT, FORM_LABEL, RequiredBadge, CountBadge } from '../commons/FormModal';
import CardPicker from '../commons/CardPicker';
import { useToast } from '../commons/ToastProvider';

const AddDrinkSetModal = ({ isOpen, onClose, onCreated, onUpdated, drinks, setToEdit = null }) => {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (setToEdit) {
      setName(setToEdit.name || '');
      setSelectedIds((setToEdit.drinkIds || []).map((d) => d?._id || d).filter(Boolean));
    } else {
      setName('');
      setSelectedIds([]);
    }
  }, [isOpen, setToEdit]);

  if (!isOpen) return null;

  const toggleDrink = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const handleClose = () => {
    setName('');
    setSelectedIds([]);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      addToast('El nombre debe tener al menos 3 caracteres', 'error');
      return;
    }
    if (selectedIds.length === 0) {
      addToast('Selecciona al menos una bebida para el conjunto', 'error');
      return;
    }

    setSaving(true);
    const result = setToEdit
      ? await onUpdated(setToEdit._id, { name: name.trim(), drinkIds: selectedIds })
      : await onCreated({ name: name.trim(), drinkIds: selectedIds });
    setSaving(false);

    if (result.success) {
      addToast(setToEdit ? 'Conjunto actualizado exitosamente' : 'Conjunto creado exitosamente', 'success');
      handleClose();
    } else {
      addToast(result.message || 'Error al guardar el conjunto', 'error');
    }
  };

  return (
    <FormModal
      icon="layer-group"
      title={setToEdit ? 'Editar conjunto' : 'Nuevo conjunto'}
      badge={setToEdit ? 'Edición' : 'Nuevo'}
      subtitle={setToEdit ? setToEdit.name : 'Agrupa bebidas para elegirlas rápido al armar un combo'}
      onClose={handleClose}
      onSubmit={handleSubmit}
      footerNote="No descuenta inventario: es solo una agrupación"
      submitLabel={setToEdit ? 'Guardar cambios' : 'Crear conjunto'}
      submitting={saving}
      zIndex="z-[60]"
    >
      {/* SECCIÓN 1: Información general */}
      <FormSection icon="list" title="Información general">
        <label className={FORM_LABEL}>Nombre del conjunto</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. La clásica"
          className={FORM_INPUT}
        />
      </FormSection>

      {/* SECCIÓN 2: Bebidas */}
      <FormSection
        icon="wine-glass"
        title="Bebidas incluidas"
        badge={selectedIds.length > 0
          ? <CountBadge>{selectedIds.length} seleccionada{selectedIds.length === 1 ? '' : 's'}</CountBadge>
          : <RequiredBadge label="Elige al menos una" />}
      >
        <p className="text-xs text-muted mb-3">Solo se pueden agrupar bebidas de tercero.</p>
        <CardPicker items={drinks} selectedIds={selectedIds} onToggle={toggleDrink} />
      </FormSection>
    </FormModal>
  );
};

export default AddDrinkSetModal;
