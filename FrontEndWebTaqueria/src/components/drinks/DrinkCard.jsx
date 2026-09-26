// src/components/drinks/DrinkCard.jsx
import React from 'react';
import MenuItemCard from '../menu/MenuItemCard';

const DrinkCard = (drink) => {
  const { id, image, title, price, stock, category, subcategory, isMostSold, isAvailable, status, lowStockThreshold = 10, onEdit, onDelete, onView } = drink;
  const available = isAvailable !== undefined ? isAvailable : status === 'disponible';
  const hasStock = category === 'tercero' && stock !== null && stock !== undefined;

  // "DE TERCERO · 24 UDS." / "DE CASA · AGUAS FRESCAS"
  const meta = [
    category === 'casa' ? 'De casa' : 'De tercero',
    hasStock ? `${stock} uds.` : subcategory,
  ].filter(Boolean).join(' · ');

  let tag = null;
  let tagTone = 'muted';
  if (isMostSold) { tag = 'Más vendida'; tagTone = 'ac'; }
  else if (hasStock && stock < lowStockThreshold) { tag = 'Stock bajo'; tagTone = 'ac'; }
  else if (!image) { tag = 'Falta imagen'; tagTone = 'warn'; }

  return (
    <MenuItemCard
      image={image}
      name={title}
      price={`$${parseFloat(price).toFixed(2)}`}
      meta={meta}
      status={available ? 'Disponible' : 'No disponible'}
      statusTone={available ? 'ok' : 'muted'}
      tag={tag}
      tagTone={tagTone}
      dimmed={!available}
      onView={onView ? () => onView(drink) : undefined}
      onEdit={() => onEdit(drink)}
      onDelete={() => onDelete(id)}
    />
  );
};

export default DrinkCard;
