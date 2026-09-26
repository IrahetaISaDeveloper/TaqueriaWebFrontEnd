// src/components/promotions/PromotionCard.jsx
import React from 'react';
import CatalogCard from '../menu/CatalogCard';

// "activa" no siempre significa visible para el cliente: una promoción
// programada para mañana está activa pero todavía no corre, y eso se
// distingue con la etiqueta de vigencia, no con el color.
const STATUS_LABELS = {
  activa: 'Activa',
  pausada: 'Pausada',
  expirada: 'Expirada',
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

const PromotionCard = ({ promotion, index, onEdit, onDelete, onToggleStatus, onView }) => {
  const { name, image, price, originalPrice, discountPercent, status, endsAt, aiSuggested, items = [] } = promotion;

  const hasDiscount = Number(originalPrice) > Number(price);
  const isRunning = status === 'activa' && new Date(endsAt).getTime() > Date.now();
  const productCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Lo que se lleva el cliente, resumido: "4 Taco al pastor · 1 Burrito"
  const summary = items
    .map((item) => `${item.quantity || 1} ${item.refId?.name || 'Producto eliminado'}`)
    .join(' · ');

  // Reactivar una promo vencida no haría nada visible, así que el botón solo
  // se ofrece mientras siga teniendo vigencia por delante.
  const extraActions = (isRunning || status === 'pausada')
    ? [{ icon: isRunning ? 'pause' : 'play', label: isRunning ? 'Pausar' : 'Reactivar', onClick: onToggleStatus }]
    : [];

  return (
    <CatalogCard
      image={image || items[0]?.refId?.image}
      name={name}
      description={summary}
      emptyDescription="Sin productos."
      category={aiSuggested ? 'Sugerida por IA' : undefined}
      eyebrow={productCount > 0 ? `${productCount} producto${productCount === 1 ? '' : 's'}` : undefined}
      price={`$${Number(price).toFixed(2)}`}
      originalPrice={hasDiscount ? `$${Number(originalPrice).toFixed(2)}` : null}
      available={status === 'activa'}
      availableLabel={STATUS_LABELS.activa}
      unavailableLabel={STATUS_LABELS[status] || STATUS_LABELS.expirada}
      index={index}
      highlight={isRunning}
      flags={discountPercent > 0 ? [{ label: `-${discountPercent}%`, icon: 'tag', tone: 'ac' }] : []}
      meta={[{ icon: 'clock', label: formatTimeLeft(endsAt), tone: isRunning ? 'ac' : 'muted' }]}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      extraActions={extraActions}
    />
  );
};

export default PromotionCard;
