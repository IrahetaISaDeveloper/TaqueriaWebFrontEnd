// src/components/dashboard/ComboCard.jsx
import React from 'react';
import MenuItemCard from '../menu/MenuItemCard';

const CATEGORY_LABELS = {
  familiar: 'Familiar',
  duo: 'Duo',
  individual: 'Individual',
};

const ComboCard = ({
  image,
  title,
  price,
  category,
  selective = false,
  itemsCount = 0,
  isMostSold = false,
  isAvailable = true,
  onEdit,
  onDelete,
  onView,
}) => {
  // "FAMILIAR · 4 PLATILLOS" / "DUO · SELECTIVO"
  const meta = [
    CATEGORY_LABELS[category] || category,
    selective ? 'Selectivo' : itemsCount > 0 ? `${itemsCount} platillo${itemsCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  let tag = null;
  let tagTone = 'muted';
  if (isMostSold) { tag = 'Más vendido'; tagTone = 'ac'; }
  else if (!image) { tag = 'Falta imagen'; tagTone = 'warn'; }

  return (
    <MenuItemCard
      image={image}
      name={title}
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
};

export default ComboCard;
