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
        className={`mb-4 inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-display font-semibold cursor-pointer transition-all border hover:scale-[1.03] active:scale-[0.98] ${
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
          <div className="bg-surfalt rounded-none w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-line">
            <div
              className={`flex items-center justify-between p-4 sm:p-5 text-white ${
                hasIssues ? 'bg-warn' : 'bg-ok'
              }`}
            >
              <h2 className="text-base sm:text-lg font-display font-bold">
                {hasIssues ? `Atención: ${count} por completar` : 'Todo en orden'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all"
              >
                <FAIcon icon="times" size="lg" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {!hasIssues ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FAIcon icon="face-smile" size="3xl" className="text-ok mb-3" />
                  <p className="text-inkalt font-display font-semibold text-lg">
                    No hay nada que revisar
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {items.map((item) => {
                    const clickable = Boolean(onEdit);
                    const Wrapper = clickable ? 'button' : 'div';
                    return (
                      <Wrapper
                        key={getKey(item)}
                        type={clickable ? 'button' : undefined}
                        onClick={clickable ? () => handleItemClick(item) : undefined}
                        className={`flex items-center gap-3 bg-surface rounded-none p-3 border border-line text-left w-full ${
                          clickable ? 'hover:border-warn transition-all cursor-pointer' : ''
                        }`}
                      >
                        <img
                          src={getImage?.(item) || PLACEHOLDER_IMAGE}
                          alt=""
                          className="w-14 h-14 rounded-none object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-semibold text-ink text-sm truncate">
                            {getTitle(item)}
                          </p>
                          <p className="text-xs text-warn mt-0.5">{getReason(item)}</p>
                        </div>
                        {clickable && (
                          <FAIcon icon="pen" size="sm" className="text-muted shrink-0" />
                        )}
                      </Wrapper>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttentionCenter;
