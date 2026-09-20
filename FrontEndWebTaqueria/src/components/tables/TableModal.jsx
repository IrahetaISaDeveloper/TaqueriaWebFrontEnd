// src/components/tables/TableModal.jsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import FAIcon from '../commons/FAIcon';
import Select from '../commons/Select';
import { useToast } from '../commons/ToastProvider';

export default function TableModal({ isOpen, onClose, onSave, currentTable }) {
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { number: '', status: 'libre' },
  });

  useEffect(() => {
    if (isOpen) {
      if (currentTable) {
        setValue('number', currentTable.number || '');
        setValue('status', currentTable.status || 'libre');
      } else {
        reset({ number: '', status: 'libre' });
      }
    }
  }, [currentTable, isOpen, setValue, reset]);

  const onSubmit = (data) => {
    const num = parseInt(data.number);
    if (isNaN(num) || num <= 0) {
      addToast('El número de mesa debe ser un entero positivo', 'error');
      return;
    }
    onSave({ number: num, status: data.status });
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
          <h3 className="text-base sm:text-lg font-display font-bold">
            {currentTable ? 'Editar Mesa' : 'Añadir Nueva Mesa'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all"
          >
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Número de la Mesa
            </label>
            <input
              type="number"
              {...register('number', {
                required: 'El número es obligatorio',
                min: { value: 1, message: 'Debe ser positivo' },
                valueAsNumber: true,
              })}
              placeholder="Ej: 8"
              className={inputClasses}
            />
            {errors.number && (
              <span className="text-ac text-xs mt-1 block font-medium">{errors.number.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Estado
            </label>
            <Select {...register('status')}>
              <option value="libre">Disponible</option>
              <option value="ocupada">Ocupada</option>
              <option value="reservada">Reservada</option>
              <option value="limpieza">En Limpieza</option>
            </Select>
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
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}