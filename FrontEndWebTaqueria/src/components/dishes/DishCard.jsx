// src/components/dishes/DishCard.jsx
import React from 'react';
import MenuItemCard from '../menu/MenuItemCard';

export default function DishCard({ image, name, category, subcategory, quantity, price, status, isMostSold = false, onEdit, onDelete, onView }) {
  const isAvailable = status === 'Activo';

  // "TACOS · ORDEN DE 3": la cantidad solo tiene sentido en los tacos.
  const meta = [
    category,
    category === 'Tacos' && quantity ? `Orden de ${quantity}` : subcategory,
  ].filter(Boolean).join(' · ');

  let tag = null;
  let tagTone = 'muted';
  if (isMostSold) { tag = 'Más vendido'; tagTone = 'ac'; }
  else if (!image) { tag = 'Falta imagen'; tagTone = 'warn'; }

  return (
    <MenuItemCard
      image={image}
      name={name}
      price={price}
      meta={meta}
      status={isAvailable ? 'Disponible' : 'No disponible'}
      statusTone={isAvailable ? 'ok' : 'muted'}
      tag={tag}
      tagTone={tagTone}
      dimmed={!isAvailable}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
