// src/components/dashboard/AddDrinkSetModal.jsx
// Crea o edita un "conjunto de bebidas" (ej. "La clásica" = Coca-Cola +
// Fanta) para que el admin lo reutilice al armar combos sin elegir bebida
// por bebida. No descuenta inventario: es solo una agrupación de conveniencia.
import React, { useEffect, useState } from 'react';
import FAIcon from '../commons/FAIcon';
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-line">
        <div className="flex items-center justify-between p-4 sm:p-5 bg-warn text-white">
          <h2 className="text-base sm:text-lg font-display font-bold">
            {setToEdit ? 'Editar conjunto de bebidas' : 'Nuevo conjunto de bebidas'}
          </h2>
          <button type="button" onClick={handleClose} className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all">
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Nombre del conjunto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: La clásica"
              className="w-full px-4 py-2.5 bg-surface border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-inkalt text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Bebidas incluidas ({selectedIds.length})
            </label>
            <CardPicker items={drinks} selectedIds={selectedIds} onToggle={toggleDrink} />
          </div>

          <div className="flex gap-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-line text-inkalt rounded-none hover:bg-linealt font-display font-semibold text-sm transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-warn text-white rounded-none hover:bg-warn font-display font-semibold text-sm transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : setToEdit ? 'Guardar cambios' : 'Crear conjunto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDrinkSetModal;
