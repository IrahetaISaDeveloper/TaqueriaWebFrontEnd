// src/components/menu/MenuItemCard.jsx
//
// Tarjeta del catálogo: imagen, nombre y precio en la misma línea, una
// línea de datos en versalitas y un pie con el estado (punto de color) y una
// etiqueta a la derecha ("MÁS VENDIDO", "FALTA IMAGEN"...).
//
// Clic en la tarjeta abre el detalle; editar/eliminar viven en botones
// pequeños sobre la imagen, que en escritorio aparecen al pasar el ratón y
// en móvil (sin hover) quedan siempre visibles.
import React from 'react';
import FAIcon from '../commons/FAIcon';

const TONES = {
  ok: { text: 'text-ok', dot: 'bg-ok' },
  warn: { text: 'text-warn', dot: 'bg-warn' },
  ac: { text: 'text-ac', dot: 'bg-ac' },
  info: { text: 'text-info', dot: 'bg-info' },
  muted: { text: 'text-muted', dot: 'bg-muted' },
};

const ActionButton = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`w-8 h-8 flex items-center justify-center bg-surface/95 border border-line transition-colors cursor-pointer ${
      danger ? 'text-ac hover:border-ac' : 'text-inkalt hover:border-ac hover:text-ac'
    }`}
  >
    <FAIcon icon={icon} size="sm" />
  </button>
);

const MenuItemCard = ({
  image,
  name,
  price,
  originalPrice,
  meta,
  status,
  statusTone = 'ok',
  tag,
  tagTone = 'muted',
  corner,
  dimmed = false,
  onView,
  onEdit,
  onDelete,
  extraActions = [],
}) => {
  const tone = TONES[statusTone] || TONES.muted;
  const tagClass = (TONES[tagTone] || TONES.muted).text;

  const actions = [
    ...extraActions,
    onEdit && { icon: 'edit', label: 'Editar', onClick: onEdit },
    onDelete && { icon: 'trash', label: 'Eliminar', onClick: onDelete, danger: true },
  ].filter(Boolean);

  return (
    <div
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
      onClick={onView}
      onKeyDown={onView ? (e) => { if (e.key === 'Enter') onView(); } : undefined}
      className={`group bg-surface border border-line flex flex-col h-full transition-colors hover:border-ac ${
        onView ? 'cursor-pointer' : ''
      }`}
    >
      <div className="relative h-40 sm:h-44 bg-surfalt overflow-hidden">
        {image ? (
          <img src={image} alt={name} className={`w-full h-full object-cover ${dimmed ? 'grayscale opacity-70' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-linealt">
            <FAIcon icon="image" size="2xl" />
          </div>
        )}

        {corner && (
          <span className="absolute top-2.5 left-2.5 num text-[11px] px-2 py-0.5 bg-ac text-white">{corner}</span>
        )}

        {actions.length > 0 && (
          <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
            {actions.map((a) => (
              <ActionButton key={a.label} {...a} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3.5 pb-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[14px] font-medium text-ink leading-snug line-clamp-2 min-w-0">{name}</h3>
          <div className="text-right shrink-0">
            <p className="num text-[13px] text-ink">{price}</p>
            {originalPrice && <p className="num text-[11px] text-muted line-through">{originalPrice}</p>}
          </div>
        </div>
        {meta && <p className="kick text-muted mt-1.5 truncate">{meta}</p>}

        <div className="flex-1" />

        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-line">
          {status ? (
            <span className={`kick inline-flex items-center gap-1.5 ${tone.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
              {status}
            </span>
          ) : <span />}
          {tag && <span className={`kick truncate ${tagClass}`}>{tag}</span>}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
