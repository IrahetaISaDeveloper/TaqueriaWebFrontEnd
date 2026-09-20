// src/components/extras/ExtraCard.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const ExtraCard = ({ title, price, image, status = 'DISPONIBLE', onEdit, onDelete, onView }) => {
  const isAvailable = status === 'DISPONIBLE';

  return (
    <div className="bg-surface rounded-none overflow-hidden border border-line flex flex-col h-full transition-transform duration-200 hover:scale-[1.02]">
      {/* Imagen (o cabecera decorativa si no hay) */}
      <div className="relative h-24 bg-gradient-to-br from-red-100 to-orange-50 flex items-center justify-center rounded-t-3xl overflow-hidden">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <FAIcon icon="star" size="3x" className="text-ac" />
        )}

        {/* Badge de estado */}
        <div className="absolute top-3 right-3">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 bg-ok text-white px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              <FAIcon icon="check-circle" size="xs" />
              <span>Disponible</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-muted text-white px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              <FAIcon icon="ban" size="xs" />
              <span>Agotado</span>
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
        <div className="flex-1" />

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

export default ExtraCard;