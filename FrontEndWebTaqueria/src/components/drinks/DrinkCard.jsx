// src/components/drinks/DrinkCard.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300/f3f0eb/9ca3af?text=Bebida';

const DrinkCard = (drink) => {
  const { id, image, title, price, stock, category, isMostSold, isAvailable, status, onEdit, onDelete, onView } = drink;
  // Calculamos disponibilidad y etiqueta de stock
  const available = isAvailable !== undefined ? isAvailable : status !== 'Agotado';
  const hasStock = stock !== null && stock !== undefined;
  const stockLabel = hasStock ? (status || (stock > 0 ? 'Disponible' : 'Agotado')) : 'Preparación en casa';

  return (
    <div className="bg-surface rounded-none overflow-hidden border border-line flex flex-col h-full transition-colors duration-200 hover:border-ac">
      {/* Imagen con overlay degradado y badges (idéntico a ComboCard) */}
      <div className="relative h-44 sm:h-48">
        <img src={image || PLACEHOLDER_IMAGE} alt={title} className="w-full h-full object-cover" />
        {/* Overlay sutil para que los badges resalten */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Badges superiores */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {isMostSold && (
            <span className="inline-flex items-center gap-1 bg-warn text-white px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              <FAIcon icon="star" size="xs" />
              <span>Estrella</span>
            </span>
          )}
          {available ? (
            <span className="inline-flex items-center gap-1 bg-ok text-white px-2.5 py-1 rounded-full text-xs font-semibold ml-auto backdrop-blur-sm">
              <FAIcon icon="check-circle" size="xs" />
              <span className="hidden sm:inline">Disponible</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-muted text-white px-2.5 py-1 rounded-full text-xs font-semibold ml-auto backdrop-blur-sm">
              <FAIcon icon="ban" size="xs" />
              <span className="hidden sm:inline">No disponible</span>
            </span>
          )}
        </div>
      </div>

      {/* Contenido (misma estructura que ComboCard) */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <h3 className="font-display font-bold text-ink mb-1 text-sm sm:text-base line-clamp-1">
          {title}
        </h3>
        <p className="num text-ac font-bold text-lg sm:text-xl mb-2">
          ${parseFloat(price).toFixed(2)}
        </p>
        
        {/* Categoría + información de stock (en lugar de descripción) */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-inkalt mb-3 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-surfalt text-inkalt text-[11px] font-semibold uppercase">
            {category === 'casa' ? 'De casa' : 'De tercero'}
          </span>
          {hasStock && (
            <>
              <FAIcon icon="box" size="sm" className="text-muted" />
              <span className={`font-semibold ${
                stock > 10 ? 'text-ok' : stock > 0 ? 'text-warn' : 'text-ac'
              }`}>
                {stock} uds.
              </span>
            </>
          )}
          <span className="text-muted">·</span>
          <span className="text-muted">{stockLabel}</span>
        </div>

        {/* Espacio flexible para mantener la estructura */}
        <div className="flex-1" />

        {/* Botones (exactamente igual que en ComboCard) */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-line">
          {onView && (
            <button
              onClick={() => onView(drink)}
              className="px-3 py-2.5 bg-infosoft text-info rounded-none hover:bg-infosoft transition-colors
                active:
              "
              aria-label="Ver detalles"
            >
              <FAIcon icon="eye" size="sm" />
            </button>
          )}
          <button
            onClick={() => onEdit(drink)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surfalt text-inkalt rounded-none hover:bg-line transition-colors text-xs sm:text-sm font-medium
              active:
            "
          >
            <FAIcon icon="edit" size="sm" />
            Editar
          </button>
          <button
            onClick={() => onDelete(id)}
            className="px-3 py-2.5 bg-acsoft text-ac rounded-none hover:bg-acsoft transition-colors
              active:
            "
          >
            <FAIcon icon="trash" size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrinkCard;