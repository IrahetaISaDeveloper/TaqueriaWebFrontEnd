// src/components/drinks/DrinkCard.jsx
import React from 'react';
import CatalogCard from '../menu/CatalogCard';

const DrinkCard = (drink) => {
  const {
    id, image, title, description, price, stock, category, subcategory, recipe,
    isMostSold, isAvailable, status, lowStockThreshold = 10, index, onEdit, onDelete, onView,
  } = drink;
  const available = isAvailable !== undefined ? isAvailable : status === 'disponible';
  const isHouse = category === 'casa';
  const hasStock = !isHouse && stock !== null && stock !== undefined;
  const lowStock = hasStock && stock < lowStockThreshold;
  const recipeCount = (recipe || []).length;

  const flags = [
    isMostSold && { label: 'Más vendida', icon: 'star', tone: 'ac' },
    lowStock && { label: 'Stock bajo', icon: 'triangle-exclamation', tone: 'warn' },
  ].filter(Boolean);

  // De casa: cuántos ingredientes lleva la receta. De tercero: unidades en stock.
  const meta = isHouse
    ? [
        recipeCount > 0
          ? { icon: 'list-check', label: `${recipeCount} ingr.`, title: `${recipeCount} ingredientes en la receta` }
          : { icon: 'list-check', label: 'Sin receta', tone: 'warn', title: 'Sin receta registrada' },
      ]
    : hasStock
      ? [{ icon: 'box', label: `${stock} uds.`, tone: lowStock ? 'warn' : 'muted', title: `${stock} unidades en inventario` }]
      : [];

  return (
    <CatalogCard
      image={image}
      name={title}
      description={description}
      category={isHouse ? 'De casa' : 'De tercero'}
      eyebrow={subcategory}
      price={`$${parseFloat(price).toFixed(2)}`}
      available={available}
      index={index}
      highlight={isMostSold}
      flags={flags}
      meta={meta}
      onView={onView ? () => onView(drink) : undefined}
      onEdit={() => onEdit(drink)}
      onDelete={() => onDelete(id)}
    />
  );
};

export default DrinkCard;
