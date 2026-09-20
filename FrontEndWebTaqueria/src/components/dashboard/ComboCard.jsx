// src/components/dashboard/ComboCard.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const ComboCard = ({
  image,
  title,
  price,
  description,
  isMostSold = false,
  isAvailable = true,
  onEdit,
  onDelete,
  onView,
}) => {
  return (
    <div
      className="bg-surface rounded-none overflow-hidden
        border border-line flex flex-col h-full transition-transform duration-200 hover:scale-[1.02]"
    >
      {/* Imagen con overlay degradado y badges */}
      <div className="relative h-44 sm:h-48">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover rounded-t-3xl"
        />
        {/* Overlay sutil para que los badges resalten */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-3xl" />

        {/* Badges */}
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
      </div>

      {/* Contenido */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <h3 className="font-display font-bold text-ink mb-1 text-sm sm:text-base line-clamp-1">
          {title}
        </h3>
        <p className="text-ac font-display font-bold text-lg sm:text-xl mb-2">
          {price}
        </p>
        <p className="text-inkalt text-xs sm:text-sm line-clamp-3 text-justify flex-1">
          {description}
        </p>

        {/* Botones con estilo clay */}
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
};

export default ComboCard;