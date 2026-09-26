// src/components/dishes/DishCard.jsx
import React from 'react';
import CatalogCard from '../menu/CatalogCard';

export default function DishCard({
  image,
  name,
  description,
  category,
  subcategory,
  quantity,
  price,
  status,
  recipeCount = 0,
  index,
  isMostSold = false,
  onEdit,
  onDelete,
  onView,
}) {
  // "Orden de 3" solo tiene sentido en los tacos; el resto muestra la subcategoría.
  const eyebrow = category === 'Tacos' && quantity ? `Orden de ${quantity}` : subcategory;

  return (
    <CatalogCard
      image={image}
      name={name}
      description={description}
      category={category}
      eyebrow={eyebrow}
      price={price}
      available={status === 'Activo'}
      index={index}
      highlight={isMostSold}
      flags={isMostSold ? [{ label: 'Más vendido', icon: 'star', tone: 'ac' }] : []}
      meta={[
        recipeCount > 0
          ? { icon: 'list-check', label: `${recipeCount} ingr.`, title: `${recipeCount} ingredientes en la receta` }
          : { icon: 'list-check', label: 'Sin receta', tone: 'warn', title: 'Sin receta registrada' },
      ]}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
