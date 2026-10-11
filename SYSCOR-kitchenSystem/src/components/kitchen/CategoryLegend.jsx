// components/kitchen/CategoryLegend.jsx
// Qué significa cada color: una píldora por estación, con su cuadrito de color.
import { KITCHEN_CATEGORIES, CATEGORY_ORDER, MIXED_CATEGORY } from '../../constants/kitchenCategories';

export default function CategoryLegend({ nowrap = false }) {
  const items = [...CATEGORY_ORDER.map((key) => KITCHEN_CATEGORIES[key]), MIXED_CATEGORY];

  return (
    <ul className={`flex items-center gap-2 ${nowrap ? 'flex-nowrap w-max' : 'flex-wrap'}`} aria-label="Colores por estación">
      {items.map((category) => (
        <li
          key={category.key}
          className="kick inline-flex items-center gap-1.5 text-inkalt border border-line rounded-full px-2.5 py-1 whitespace-nowrap shrink-0"
        >
          <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: category.color }} aria-hidden="true" />
          {category.label}
        </li>
      ))}
    </ul>
  );
}
