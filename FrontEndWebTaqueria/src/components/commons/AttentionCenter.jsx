// src/components/commons/AttentionCenter.jsx
import React, { useState } from 'react';
import FAIcon from './FAIcon';

const PLACEHOLDER_IMAGE = 'https://placehold.co/300x200/f3f0eb/9ca3af?text=Sin+imagen';

// Reemplaza los banners de "alerta" por un label clickeable ("Atención: N")
// que abre un modal con las tarjetas de lo que falta completar. Cuando no
// falta nada, el label y el modal cambian a un estado verde/tranquilo.
const AttentionCenter = ({ items, getKey, getTitle, getImage, getReason, onEdit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const count = items.length;
  const hasIssues = count > 0;

  const handleItemClick = (item) => {
    setIsOpen(false);
    onEdit(item);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`mb-4 inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-none text-sm font-display font-semibold cursor-pointer transition-all border hover:scale-[1.03] active:scale-[0.98] ${
          hasIssues
            ? 'bg-warnsoft border-warn text-warn hover:bg-warnsoft/70'
            : 'bg-oksoft border-ok text-ok hover:bg-oksoft/70'
        }`}
      >
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${hasIssues ? 'bg-warn' : 'bg-ok'}`}>
          <FAIcon icon={hasIssues ? 'triangle-exclamation' : 'check'} size="xs" />
        </span>
        {hasIssues ? `Atención: ${count}` : 'Todo en orden'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surfalt rounded-none border border-acline/60 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">

            {/* Header delgado — estilo institucional */}
            <div
              className={`flex items-center justify-between px-4 sm:px-5 py-2.5 text-white sticky top-0 z-10 shadow-sm ${
                hasIssues ? 'bg-warn' : 'bg-ok'
              }`}
            >
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-display font-bold leading-tight truncate">
                  {hasIssues ? `Atención: ${count} por completar` : 'Todo en orden'}
                </h2>
                {hasIssues && (
                  <p className="text-white/70 text-xs mt-0.5">
                    Expedientes con información pendiente
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center hover:bg-white/10 transition-colors ml-2 shrink-0"
              >
                <FAIcon icon="times" />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {!hasIssues ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-oksoft flex items-center justify-center mb-4">
                    <FAIcon icon="face-smile" size="2xl" className="text-ok" />
                  </div>
                  <p className="text-ink font-display font-bold text-base">
                    No hay nada que revisar
                  </p>
                  <p className="text-muted text-xs mt-1">
                    Todos los expedientes están completos
                  </p>
                </div>
              ) : (
                <>
                  {/* Etiqueta de sección */}
                  <h4 className="text-[10.5px] text-warn font-bold tracking-wider mb-3 flex items-center gap-1.5 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0" />
                    Expedientes pendientes
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((item) => {
                      const clickable = Boolean(onEdit);
                      const Wrapper = clickable ? 'button' : 'div';
                      return (
                        <Wrapper
                          key={getKey(item)}
                          type={clickable ? 'button' : undefined}
                          onClick={clickable ? () => handleItemClick(item) : undefined}
                          className={`flex items-center gap-3 bg-surface rounded-none p-3 border border-line text-left w-full group ${
                            clickable ? 'hover:border-warn/60 transition-all cursor-pointer' : ''
                          }`}
                        >
                          <img
                            src={getImage?.(item) || PLACEHOLDER_IMAGE}
                            alt=""
                            className="w-11 h-11 rounded-none object-cover shrink-0 border border-line"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-display font-semibold text-ink text-[13px] leading-tight truncate">
                              {getTitle(item)}
                            </p>
                            <p className="text-[11px] text-warn mt-0.5 leading-snug line-clamp-2">
                              {getReason(item)}
                            </p>
                          </div>
                          {clickable && (
                            <span className="w-7 h-7 flex items-center justify-center text-muted group-hover:text-warn transition-colors shrink-0">
                              <FAIcon icon="pen" size="sm" />
                            </span>
                          )}
                        </Wrapper>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttentionCenter;
