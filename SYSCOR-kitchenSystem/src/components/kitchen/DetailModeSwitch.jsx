// components/kitchen/DetailModeSwitch.jsx
//
// Interruptor global de los tickets, en un solo botón:
//   - Sin detalles: solo el platillo ("2× Burrito al pastor").
//   - Con detalles: además, la receta de cada producto, para cocineros nuevos.
// Se ve en el color de acento cuando los detalles están activos.
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { DETAIL_MODES } from '../../constants/kitchenStatus';

export default function DetailModeSwitch({ mode, onChange }) {
  const detailed = mode === DETAIL_MODES.detailed;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={detailed}
      onClick={() => onChange(detailed ? DETAIL_MODES.simple : DETAIL_MODES.detailed)}
      title={detailed ? 'Ocultar las recetas de los tickets' : 'Mostrar la receta de cada producto'}
      className={`inline-flex items-center gap-2 px-2 py-1.5 text-sm font-medium shrink-0 transition-colors cursor-pointer ${
        detailed ? 'text-ac' : 'text-muted hover:text-ink'
      }`}
    >
      <FAIcon icon={detailed ? 'list-check' : 'list'} size="sm" />
      {/* En el teléfono solo el ícono: el rótulo no cabe junto a los filtros */}
      <span className="sr-only sm:not-sr-only">{detailed ? 'Con detalles' : 'Sin detalles'}</span>
    </button>
  );
}
