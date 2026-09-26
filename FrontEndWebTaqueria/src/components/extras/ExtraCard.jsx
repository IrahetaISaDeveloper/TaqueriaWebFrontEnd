// src/components/extras/ExtraCard.jsx
import MenuItemCard from '../menu/MenuItemCard';

export default function ExtraCard({
  title,
  name,
  category,
  price,
  image,
  status = 'DISPONIBLE',
  isCompound = false,
  isMostSold = false,
  onEdit,
  onDelete,
  onView,
}) {
  const itemName = title || name || 'Extra';
  const isAvailable = status === 'DISPONIBLE' || status === 'Activo';

  const numPrice = typeof price === 'number'
    ? price
    : parseFloat(String(price || '0').replace('$', ''));
  const formattedPrice = isNaN(numPrice) ? '$0.00' : `$${numPrice.toFixed(2)}`;

  const meta = [
    category,
    isCompound ? 'Compuesto' : null,
  ].filter(Boolean).join(' · ');

  let tag = null;
  let tagTone = 'muted';
  if (isMostSold) {
    tag = 'Más pedido';
    tagTone = 'ac';
  } else if (!image) {
    tag = 'Falta imagen';
    tagTone = 'warn';
  } else if (isCompound) {
    tag = 'Con receta';
    tagTone = 'info';
  }

  return (
    <MenuItemCard
      image={image}
      name={itemName}
      price={formattedPrice}
      meta={meta}
      status={isAvailable ? 'Disponible' : 'Agotado'}
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