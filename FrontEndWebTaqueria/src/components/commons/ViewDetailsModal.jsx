// src/components/commons/ViewDetailsModal.jsx
// Modal de solo lectura para ver el detalle completo de un registro (platillo,
// bebida, combo, extra...). El contenido se organiza en secciones navegables
// ("Sección 1", "Sección 2"...) en vez de un único bloque largo.
import React, { useState } from 'react';
import FAIcon from './FAIcon';

const ViewDetailsModal = ({ isOpen, onClose, title, subtitle, image, sections = [] }) => {
  const [activeSection, setActiveSection] = useState(0);

  if (!isOpen) return null;

  const total = sections.length;
  const current = sections[Math.min(activeSection, total - 1)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-line">
        <div className="flex items-center justify-between p-4 sm:p-5 bg-ac text-white">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-display font-bold truncate">{title}</h2>
            {subtitle && <p className="text-xs text-white/80 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all shrink-0"
            aria-label="Cerrar"
          >
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        {image && (
          <img src={image} alt={title} className="w-full h-40 sm:h-48 object-cover" />
        )}

        {total > 1 && (
          <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 flex-wrap">
            {sections.map((s, i) => (
              <button
                key={s.title || i}
                type="button"
                onClick={() => setActiveSection(i)}
                className={`px-3 py-1.5 rounded-none text-xs font-display font-semibold transition-all ${
                  activeSection === i
                    ? 'bg-ac text-white'
                    : 'bg-surface text-muted hover:bg-surfalt border border-line'
                }`}
              >
                Sección {i + 1}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {current?.title && (
            <h3 className="font-display font-semibold text-ink text-sm mb-3">{current.title}</h3>
          )}
          {current?.content}
        </div>

        {total > 1 && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-t border-line">
            <button
              type="button"
              disabled={activeSection === 0}
              onClick={() => setActiveSection((a) => Math.max(0, a - 1))}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-display font-semibold text-inkalt rounded-none hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <FAIcon icon="chevron-left" size="sm" />
              Anterior
            </button>
            <span className="text-xs text-muted font-medium">
              {activeSection + 1} de {total}
            </span>
            <button
              type="button"
              disabled={activeSection === total - 1}
              onClick={() => setActiveSection((a) => Math.min(total - 1, a + 1))}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-display font-semibold text-inkalt rounded-none hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              Siguiente
              <FAIcon icon="chevron-right" size="sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewDetailsModal;
