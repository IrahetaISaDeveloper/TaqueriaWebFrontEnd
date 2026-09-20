// src/components/promotions/PromotionCard.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x260/f3f0eb/9ca3af?text=Sin+imagen';

// Colores por estado. "activa" no siempre significa visible para el cliente:
// una promoción programada para mañana está activa pero todavía no corre, y
// eso se distingue con la etiqueta de vigencia, no con el color.
const STATUS_STYLES = {
  activa: 'bg-oksoft text-ok',
  pausada: 'bg-warnsoft text-warn',
  expirada: 'bg-line text-inkalt',
};

// Cuánto le queda de vida a la promoción, en el lenguaje en que la piensa el
// admin (horas cuando es cuestión de horas, días cuando falta más).
const formatTimeLeft = (endsAt) => {
  if (!endsAt) return 'Sin vigencia';

  const remainingMs = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(remainingMs)) return 'Sin vigencia';
  if (remainingMs <= 0) return 'Terminada';

  const hours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (hours < 24) return `Quedan ${hours} h`;

  const days = Math.ceil(hours / 24);
  return `Quedan ${days} ${days === 1 ? 'día' : 'días'}`;
};

const PromotionCard = ({ promotion, onEdit, onDelete, onToggleStatus, onView }) => {
  const { name, image, price, originalPrice, discountPercent, status, endsAt, items = [] } = promotion;

  const hasDiscount = Number(originalPrice) > Number(price);
  const isRunning = status === 'activa' && new Date(endsAt).getTime() > Date.now();

  return (
    <div className="bg-surface rounded-none overflow-hidden border border-line flex flex-col">
      <div className="relative h-40 bg-surfalt">
        <img
          src={image || items[0]?.refId?.image || PLACEHOLDER_IMAGE}
          alt={name}
          className="w-full h-full object-cover"
        />

        {discountPercent > 0 && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-ac text-white text-xs font-bold shadow">
            -{discountPercent}%
          </span>
        )}

        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            STATUS_STYLES[status] || STATUS_STYLES.expirada
          }`}
        >
          {status?.toUpperCase()}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-display font-bold text-ink text-base leading-snug">{name}</h3>

        {/* Lo que se lleva el cliente, resumido: "4 Taco al pastor · 1 Burrito" */}
        <p className="text-xs text-muted line-clamp-2 min-h-[2rem]">
          {items.length === 0
            ? 'Sin productos'
            : items
                .map((item) => `${item.quantity || 1} ${item.refId?.name || 'Producto eliminado'}`)
                .join(' · ')}
        </p>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-ac">${Number(price).toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-sm text-muted line-through">${Number(originalPrice).toFixed(2)}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted">
          <FAIcon icon="clock" size="xs" />
          {formatTimeLeft(endsAt)}
        </div>

        <div className="flex items-center gap-2 mt-auto pt-3">
          <button
            type="button"
            onClick={onView}
            className="flex-1 px-3 py-2 rounded-none bg-surfalt text-inkalt text-xs font-semibold hover:bg-line transition-colors"
          >
            Ver
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 px-3 py-2 rounded-none bg-surfalt text-inkalt text-xs font-semibold hover:bg-line transition-colors"
          >
            Editar
          </button>
          {/* Reactivar una promo vencida no haría nada visible, así que el
              botón solo se ofrece mientras siga teniendo vigencia por delante */}
          {(isRunning || status === 'pausada') && (
            <button
              type="button"
              onClick={onToggleStatus}
              title={isRunning ? 'Pausar' : 'Reactivar'}
              className="px-3 py-2 rounded-none bg-surfalt text-inkalt text-xs font-semibold hover:bg-line transition-colors"
            >
              <FAIcon icon={isRunning ? 'pause' : 'play'} size="xs" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar"
            className="px-3 py-2 rounded-none bg-acsoft text-ac text-xs font-semibold hover:bg-acsoft transition-colors"
          >
            <FAIcon icon="trash" size="xs" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionCard;
