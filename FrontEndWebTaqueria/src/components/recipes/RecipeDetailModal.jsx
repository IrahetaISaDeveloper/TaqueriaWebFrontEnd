// src/components/recipes/RecipeDetailModal.jsx
import { Link } from 'react-router-dom';
import FAIcon from '../commons/FAIcon';
import { UNIT_LABELS } from '../../constants/units';

export default function RecipeDetailModal({
  isOpen,
  onClose,
  recipe,
  editRoute,
  bookLabel,
}) {
  if (!isOpen || !recipe) return null;

  const name = recipe.title || recipe.name || 'Sin nombre';
  const category = recipe.subcategory || recipe.category || 'General';
  const price = recipe.price ? `$${parseFloat(recipe.price).toFixed(2)}` : null;
  const ingredients = recipe.recipe || [];
  const image = recipe.image;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-surface border border-line w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-lg animate-[fadeIn_0.15s_ease-out]">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b-2 border-ac bg-surface">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="kick text-ac font-bold">Ficha Técnica</span>
              <span className="text-muted text-xs">•</span>
              <span className="kick text-muted">{bookLabel}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-ink truncate">
              {name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-ac border border-transparent hover:border-line hover:bg-surfalt transition-colors shrink-0 cursor-pointer"
            aria-label="Cerrar"
          >
            <FAIcon icon="times" size="base" />
          </button>
        </div>

        {/* Imagen opcional */}
        {image && (
          <div className="h-44 sm:h-52 w-full bg-surfalt border-b border-line overflow-hidden shrink-0">
            <img src={image} alt={name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Contenido con scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-line">
            <span className="kick text-xs px-2.5 py-1 bg-surfalt border border-line text-ink font-semibold">
              Categoría: {category}
            </span>
            {price && (
              <span className="num text-xs px-2.5 py-1 bg-surfalt border border-line text-ink font-semibold">
                Precio venta: {price}
              </span>
            )}
            <span className="kick text-xs px-2.5 py-1 bg-oksoft border border-ok/30 text-ok font-semibold">
              {ingredients.filter((i) => i.tracked).length} de {ingredients.length} insumos controlados
            </span>
          </div>

          {/* Tabla de ingredientes */}
          <div>
            <h3 className="font-display font-bold text-sm text-ink mb-3 flex items-center gap-2">
              <FAIcon icon="list" size="sm" className="text-ac" />
              Lista de Insumos y Dosificación
            </h3>

            {ingredients.length === 0 ? (
              <p className="text-sm text-muted italic py-4 text-center border border-dashed border-line">
                No hay ingredientes asignados a esta receta.
              </p>
            ) : (
              <div className="border border-line overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surfalt border-b border-line">
                      <th className="kick text-muted py-2 px-3 font-bold">Insumo</th>
                      <th className="kick text-muted py-2 px-3 font-bold text-right">Cantidad</th>
                      <th className="kick text-muted py-2 px-3 font-bold text-center">Inventario</th>
                      <th className="kick text-muted py-2 px-3 font-bold text-center">Quitable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ingredients.map((item, idx) => {
                      const unitLabel = UNIT_LABELS[item.unit] || item.unit || '';
                      return (
                        <tr key={idx} className="hover:bg-surfalt/50">
                          <td className="py-2.5 px-3 font-medium text-ink flex items-center gap-2">
                            <FAIcon
                              icon={item.tracked ? 'box' : 'circle-info'}
                              size="xs"
                              className={item.tracked ? 'text-ok' : 'text-muted'}
                            />
                            <span>{item.name}</span>
                          </td>
                          <td className="py-2.5 px-3 num font-semibold text-ink text-right">
                            {item.quantity ? `${item.quantity} ${unitLabel}` : unitLabel}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.tracked ? (
                              <span className="text-[11px] text-ok font-medium">Vinculado</span>
                            ) : (
                              <span className="text-[11px] text-muted">Libre</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.removable ? (
                              <span className="px-1.5 py-0.5 bg-warnsoft text-warn text-[10px] font-semibold">
                                Sí
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pie del modal con acciones */}
        <div className="p-4 sm:p-5 border-t border-line bg-surfalt/30 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-line bg-surface text-xs font-display font-semibold text-inkalt hover:bg-surfalt transition-colors cursor-pointer"
          >
            Cerrar ficha
          </button>

          {editRoute && (
            <Link
              to={editRoute.path}
              className="inline-flex items-center gap-2 px-4 py-2 border border-ac bg-ac text-white text-xs font-display font-semibold hover:bg-ac/90 transition-colors"
            >
              <FAIcon icon="pen" size="xs" />
              Editar receta
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
