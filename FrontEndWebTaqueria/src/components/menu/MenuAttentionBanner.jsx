// src/components/menu/MenuAttentionBanner.jsx
//
// Aviso de una línea con lo que falta completar ("3 platillos necesitan
// atención: A, B, C — falta imagen."). Cada nombre abre su edición. Si no
// falta nada, no se pinta.
import React from 'react';
import FAIcon from '../commons/FAIcon';

const MAX_NAMES = 5;

const MenuAttentionBanner = ({ items = [], getKey, getTitle, onEdit, noun = ['elemento', 'elementos'], reason = 'falta imagen' }) => {
  if (items.length === 0) return null;

  const [singular, plural] = noun;
  const shown = items.slice(0, MAX_NAMES);
  const rest = items.length - shown.length;

  return (
    <div className="flex items-start gap-2.5 mb-6 px-4 py-2.5 border border-warn/40 bg-warnsoft text-[13px] text-inkalt">
      <FAIcon icon="triangle-exclamation" size="sm" className="text-warn mt-0.5 shrink-0" />
      <p className="min-w-0">
        <span className="text-warn font-medium">
          {items.length} {items.length === 1 ? `${singular} necesita` : `${plural} necesitan`} atención:
        </span>{' '}
        {shown.map((item, i) => (
          <React.Fragment key={getKey(item)}>
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="underline decoration-dotted underline-offset-2 hover:text-ac cursor-pointer"
              >
                {getTitle(item)}
              </button>
            ) : (
              getTitle(item)
            )}
            {i < shown.length - 1 ? ', ' : ''}
          </React.Fragment>
        ))}
        {rest > 0 && ` y ${rest} más`} — {reason}.
      </p>
    </div>
  );
};

export default MenuAttentionBanner;
