// src/components/menu/CatalogCard.jsx
//
// Tarjeta del catálogo (platillos, bebidas, combos, conjuntos) con estilo de
// carta de restaurante: nombre y precio unidos por una línea punteada,
// descripción corta y un pie con el estado y datos rápidos. Encima de la
// imagen van la categoría, el número de ficha y las marcas ("Más vendido",
// "Stock bajo"...).
//
// - Sin imagen: el hueco se convierte en un botón "Agregar imagen" que abre
//   la edición. Con `visual` se reemplaza la zona de imagen por contenido
//   propio (p. ej. los conjuntos de bebidas, que no llevan foto).
// - Editar/eliminar aparecen al pasar el ratón (siempre visibles en móvil) y
//   una línea roja se dibuja bajo la tarjeta al enfocarla.
import React from 'react';
import FAIcon from '../commons/FAIcon';

const FLAG_TONES = {
  ac: 'bg-ac text-white',
  warn: 'bg-warn text-white',
  ink: 'bg-ink/85 text-white',
};

const META_TONES = {
  muted: 'text-muted',
  warn: 'text-warn',
  ac: 'text-ac',
  ok: 'text-ok',
};

const ActionButton = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`w-8 h-8 flex items-center justify-center bg-surface/95 backdrop-blur-sm border border-line transition-colors cursor-pointer ${
      danger ? 'text-ac hover:bg-ac hover:text-white hover:border-ac' : 'text-inkalt hover:border-ac hover:text-ac'
    }`}
  >
    <FAIcon icon={icon} size="sm" />
  </button>
);

const CatalogCard = ({
  image,
  visual,
  name,
  description,
  emptyDescription = 'Sin descripción registrada.',
  category,
  eyebrow,
  price,
  originalPrice,
  available = true,
  availableLabel = 'Disponible',
  unavailableLabel = 'No disponible',
  meta = [],
  flags = [],
  index,
  highlight = false,
  onView,
  onEdit,
  onDelete,
  extraActions = [],
}) => {
  const actions = [
    ...extraActions,
    onEdit && { icon: 'edit', label: 'Editar', onClick: onEdit },
    onDelete && { icon: 'trash', label: 'Eliminar', onClick: onDelete, danger: true },
  ].filter(Boolean);

  const hasPhoto = Boolean(image) && !visual;

  return (
    <div
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
      onClick={onView}
      onKeyDown={onView ? (e) => { if (e.key === 'Enter') onView(); } : undefined}
      className={`group relative bg-surface border flex flex-col h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(41,43,49,0.35)] focus-visible:outline-none ${
        highlight ? 'border-ac' : 'border-line hover:border-linealt'
      } ${onView ? 'cursor-pointer' : ''}`}
    >
      {/* ── Imagen / visual ────────────────────────────────── */}
      <div className="relative aspect-[4/3] bg-surfalt overflow-hidden">
        {visual ? (
          <div className={`absolute inset-0 ${!available ? 'opacity-60 grayscale' : ''}`}>{visual}</div>
        ) : image ? (
          <>
            <img
              src={image}
              alt={name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05] ${
                !available ? 'grayscale opacity-60' : ''
              }`}
            />
            {/* Degradado para que las etiquetas de abajo se lean sobre cualquier foto */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="absolute inset-3 flex flex-col items-center justify-center gap-2 border border-dashed border-warn/50 bg-warnsoft/40 text-warn hover:bg-warnsoft hover:border-warn transition-colors cursor-pointer"
          >
            <span className="w-10 h-10 flex items-center justify-center border border-warn/40 bg-surface">
              <FAIcon icon="camera" />
            </span>
            <span className="kick">Agregar imagen</span>
          </button>
        )}

        {category && (
          <span className="absolute top-3 left-3 kick px-2 py-1 bg-surface/95 backdrop-blur-sm text-ink border border-line pointer-events-none">
            {category}
          </span>
        )}

        {actions.length > 0 && (
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 lg:opacity-0 lg:translate-y-1 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 lg:group-focus-within:opacity-100 transition-all">
            {actions.map((a) => (
              <ActionButton key={a.label} {...a} />
            ))}
          </div>
        )}

        {flags.length > 0 && (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
            {flags.map((f) => (
              <span key={f.label} className={`kick inline-flex items-center gap-1.5 px-2 py-1 ${FLAG_TONES[f.tone] || FLAG_TONES.ac}`}>
                {f.icon && <FAIcon icon={f.icon} size="xs" />}
                {f.label}
              </span>
            ))}
          </div>
        )}

        {index !== undefined && hasPhoto && (
          <span className="absolute bottom-3 right-3 num text-[11px] text-white/85 pointer-events-none">
            N.º {String(index).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* ── Cuerpo ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 flex-1 flex flex-col">
        {eyebrow && <p className="kick text-ac mb-1.5 truncate">{eyebrow}</p>}

        {/* Nombre ····· precio, como en una carta */}
        <div className="flex items-end gap-2">
          <h3 className="text-[15px] font-display font-semibold text-ink leading-snug line-clamp-2 min-w-0 group-hover:text-ac transition-colors">
            {name}
          </h3>
          {price !== undefined && price !== null && (
            <>
              <span className="flex-1 min-w-4 border-b border-dotted border-linealt mb-1.5" aria-hidden="true" />
              <span className="text-right shrink-0 mb-0.5">
                {originalPrice && <span className="block num text-[11px] text-muted line-through leading-none mb-1">{originalPrice}</span>}
                <span className="num text-[17px] font-medium text-ink leading-none">{price}</span>
              </span>
            </>
          )}
        </div>

        <p className={`text-xs leading-relaxed mt-2 line-clamp-2 ${description ? 'text-muted' : 'text-muted/60 italic'}`}>
          {description || emptyDescription}
        </p>

        <div className="flex-1" />

        {/* Pie */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-line">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`kick inline-flex items-center gap-1.5 shrink-0 ${available ? 'text-ok' : 'text-muted'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-ok' : 'bg-muted'}`} />
              {available ? availableLabel : unavailableLabel}
            </span>
            {meta.map((m) => (
              <React.Fragment key={m.label}>
                <span className="w-px h-3 bg-line shrink-0" aria-hidden="true" />
                <span
                  className={`kick inline-flex items-center gap-1.5 truncate ${META_TONES[m.tone] || META_TONES.muted}`}
                  title={m.title}
                >
                  {m.icon && <FAIcon icon={m.icon} size="xs" />}
                  {m.label}
                </span>
              </React.Fragment>
            ))}
          </div>

          {onView && (
            <span className="kick inline-flex items-center gap-1 text-muted group-hover:text-ac transition-colors shrink-0">
              Ver
              <FAIcon icon="arrow-right" size="xs" className="transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>

      {/* Acento rojo que se dibuja al pasar el ratón */}
      <span
        className="absolute left-0 right-0 -bottom-px h-0.5 bg-ac origin-left scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-300"
        aria-hidden="true"
      />
    </div>
  );
};

export default CatalogCard;
