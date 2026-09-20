import React from 'react';
import FAIcon from './FAIcon';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar', 
  loading = false,
  icon = 'exclamation-triangle', 
  variant = 'danger', 
}) => {
  if (!isOpen) return null;

  // Variantes de color para el ícono
  const variantStyles = {
    danger: {
      bg: 'bg-acsoft',
      icon: 'text-ac',
      btn: 'bg-ac hover:bg-ac',
    },
    warning: {
      bg: 'bg-warnsoft',
      icon: 'text-warn',
      btn: 'bg-warn hover:bg-warn',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface rounded-none border border-line max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full ${currentVariant.bg} flex items-center justify-center flex-shrink-0`}
          >
            <FAIcon icon={icon} className={currentVariant.icon} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-display font-bold text-ink mb-1">
              {title}
            </h3>
            <p className="text-sm text-inkalt leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-display font-semibold text-inkalt bg-surfalt hover:bg-line rounded-none transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2.5 text-sm font-display font-semibold text-white rounded-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${currentVariant.btn}`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;