// src/components/dishes/DishCard.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300/f3f0eb/9ca3af?text=Platillo';

const CATEGORY_COLORS = {
  Burritos: 'bg-warnsoft text-warn',
  Tortas: 'bg-warnsoft text-warn',
  Tacos: 'bg-oksoft text-ok',
  Sopas: 'bg-infosoft text-info',
  Especiales: 'bg-infosoft text-info',
};
const DEFAULT_CATEGORY_COLOR = 'bg-surfalt text-inkalt';

export default function DishCard({ image, name, category, subcategory, price, status, isMostSold = false, onEdit, onDelete, onView }) {
  const isAvailable = status === 'Activo';

  return (
    <div className="bg-surface rounded-none overflow-hidden border border-line flex flex-col h-full transition-transform duration-200 hover:scale-[1.02]">
      {/* Imagen con overlay y badges */}
      <div className="relative h-44 sm:h-48">
        <img src={image || PLACEHOLDER_IMAGE} alt={name} className="w-full h-full object-cover rounded-t-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-3xl" />

        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {isMostSold && (
            <span className="inline-flex items-center gap-1 bg-warn text-white px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              <FAIcon icon="star" size="xs" />
              <span>Estrella</span>
            </span>
          )}
          {isAvailable ? (
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

        {/* Overlay de "SIN STOCK" si no está disponible */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center rounded-t-3xl">
            <span className="text-white font-display font-bold text-base sm:text-lg tracking-wide border-2 border-line px-4 py-1 rounded-none">
              SIN STOCK
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <h3 className="font-display font-bold text-ink mb-1 text-sm sm:text-base line-clamp-2">
          {name}
        </h3>
        {(category || subcategory) && (
          <div className="flex gap-1 flex-wrap mb-1">
            {category && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase w-fit ${CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR}`}>
                {category}
              </span>
            )}
            {subcategory && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-acsoft text-ac text-[11px] font-semibold w-fit">
                {subcategory}
              </span>
            )}
          </div>
        )}
        <p className="text-ac font-display font-bold text-lg sm:text-xl mb-2">
          {price}
        </p>
        {/* Espacio flexible */}
        <div className="flex-1" />

        {/* Botones */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-line">
          {onView && (
            <button
              onClick={onView}
              className="px-3 py-2.5 bg-infosoft text-info rounded-none hover:bg-infosoft transition-colors
                active:
              "
              aria-label="Ver detalles"
            >
              <FAIcon icon="eye" size="sm" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surfalt text-inkalt rounded-none hover:bg-line transition-colors text-xs sm:text-sm font-medium
              active:
            "
          >
            <FAIcon icon="edit" size="sm" />
            Editar
          </button>
          <button
            onClick={onDelete}
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
}