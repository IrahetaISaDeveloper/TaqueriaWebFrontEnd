// src/components/promotions/PromotionCard.jsx
import React from 'react';
import MenuItemCard from '../menu/MenuItemCard';

// "activa" no siempre significa visible para el cliente: una promoción
// programada para mañana está activa pero todavía no corre, y eso se
// distingue con la etiqueta de vigencia, no con el color.
const STATUS = {
  activa: { label: 'Activa', tone: 'ok' },
  pausada: { label: 'Pausada', tone: 'warn' },
  expirada: { label: 'Expirada', tone: 'muted' },
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
  const statusInfo = STATUS[status] || STATUS.expirada;

  // Lo que se lleva el cliente, resumido: "4 Taco al pastor · 1 Burrito"
  const meta = items.length === 0
    ? 'Sin productos'
    : items.map((item) => `${item.quantity || 1} ${item.refId?.name || 'Producto eliminado'}`).join(' · ');

  // Reactivar una promo vencida no haría nada visible, así que el botón solo
  // se ofrece mientras siga teniendo vigencia por delante.
  const extraActions = (isRunning || status === 'pausada')
    ? [{ icon: isRunning ? 'pause' : 'play', label: isRunning ? 'Pausar' : 'Reactivar', onClick: onToggleStatus }]
    : [];

  return (
    <MenuItemCard
      image={image || items[0]?.refId?.image}
      name={name}
      price={`$${Number(price).toFixed(2)}`}
      originalPrice={hasDiscount ? `$${Number(originalPrice).toFixed(2)}` : null}
      corner={discountPercent > 0 ? `-${discountPercent}%` : null}
      meta={meta}
      status={statusInfo.label}
      statusTone={statusInfo.tone}
      tag={formatTimeLeft(endsAt)}
      tagTone={isRunning ? 'ac' : 'muted'}
      dimmed={status === 'expirada'}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      extraActions={extraActions}
    />
  );
};

export default PromotionCard;
