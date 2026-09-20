// src/components/commons/DuplicateNameDialog.jsx
// Aviso (no bloqueante) de que ya existe un ítem con el nombre que se está
// por crear. El admin decide: editar el existente o crear de todas formas.
import React from 'react';
import FAIcon from './FAIcon';

const DuplicateNameDialog = ({ existing, onEditExisting, onCreateAnyway, onCancel }) => {
  if (!existing) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-md overflow-hidden border border-line">
        <div className="flex items-center gap-2 p-4 sm:p-5 bg-warn text-white">
          <FAIcon icon="triangle-exclamation" size="sm" />
          <h2 className="text-base sm:text-lg font-display font-bold">Ya existe un ítem con este nombre</h2>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 bg-surface rounded-none p-3 border border-line">
            {existing.image && (
              <img src={existing.image} alt="" className="w-14 h-14 rounded-none object-cover shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-display font-semibold text-ink text-sm truncate">{existing.name}</p>
              {existing.price !== undefined && (
                <p className="text-xs text-muted mt-0.5">${Number(existing.price).toFixed(2)}</p>
              )}
              {existing.status && (
                <p className="text-xs text-muted mt-0.5">Estado: {existing.status}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onEditExisting}
              className="w-full px-4 py-2.5 bg-ac text-white rounded-none font-display font-semibold text-sm hover:bg-ac transition-all"
            >
              Editar el existente
            </button>
            <button
              type="button"
              onClick={onCreateAnyway}
              className="w-full px-4 py-2.5 bg-surface text-inkalt rounded-none font-display font-semibold text-sm hover:bg-surfalt transition-all border border-line"
            >
              Crear de todas formas
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full px-4 py-2 text-muted text-xs hover:text-inkalt transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateNameDialog;
