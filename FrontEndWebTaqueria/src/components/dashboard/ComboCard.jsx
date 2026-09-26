// src/components/dashboard/ComboCard.jsx
import React from 'react';
import CatalogCard from '../menu/CatalogCard';

const CATEGORY_LABELS = {
  familiar: 'Familiar',
  duo: 'Duo',
  individual: 'Individual',
};

const ComboCard = ({
  image,
  title,
  description,
  price,
  category,
  selective = false,
  selectiveMaxPicks,
  itemsCount = 0,
  hasDrink = false,
  isMostSold = false,
  isAvailable = true,
  index,
  onEdit,
  onDelete,
  onView,
}) => {
  const meta = [
    selective
      ? { icon: 'layer-group', label: selectiveMaxPicks ? `Elige ${selectiveMaxPicks}` : 'Selectivo', title: 'El cliente elige sus platillos' }
      : itemsCount > 0
        ? { icon: 'utensils', label: `${itemsCount} plat.`, title: `${itemsCount} platillo${itemsCount === 1 ? '' : 's'} incluidos` }
        : { icon: 'utensils', label: 'Sin platillos', tone: 'warn' },
    hasDrink && { icon: 'wine-glass', label: 'Bebida', title: 'Incluye bebida' },
  ].filter(Boolean);

  return (
    <CatalogCard
      image={image}
      name={title}
      description={description}
      category={CATEGORY_LABELS[category] || category}
      eyebrow={selective ? 'Combo selectivo' : 'Platillos fijos'}
      price={price}
      available={isAvailable}
      index={index}
      highlight={isMostSold}
      flags={isMostSold ? [{ label: 'Más vendido', icon: 'star', tone: 'ac' }] : []}
      meta={meta}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default ComboCard;
