// src/components/recipes/RecipeBookSheet.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FAIcon from '../commons/FAIcon';
import { UNIT_LABELS } from '../../constants/units';

export default function RecipeBookSheet({
  recipes = [],
  currentIndex = 0,
  onSelectIndex,
  editRoute,
  activeBook,
}) {
  const [indexSearch, setIndexSearch] = useState('');

  const current = recipes[currentIndex] || null;

  // Filtrado del índice lateral
  const filteredIndexRecipes = recipes.map((r, originalIdx) => ({ r, originalIdx })).filter(({ r }) => {
    const term = indexSearch.toLowerCase().trim();
    if (!term) return true;
    const name = (r.title || r.name || '').toLowerCase();
    const cat = (r.subcategory || r.category || '').toLowerCase();
    const hasIng = (r.recipe || []).some((ing) => ing.name?.toLowerCase().includes(term));
    return name.includes(term) || cat.includes(term) || hasIng;
  });

  // Soporte de navegación por teclado (flecha izquierda y derecha)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onSelectIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < recipes.length - 1) {
        onSelectIndex(currentIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, recipes.length, onSelectIndex]);

  if (recipes.length === 0) {
    return (
      <div className="border border-line bg-surface p-10 text-center">
        <div className="w-12 h-12 mx-auto flex items-center justify-center bg-surfalt border border-line text-muted mb-3">
          <FAIcon icon="feather" size="xl" />
        </div>
        <h3 className="font-display font-bold text-lg text-ink mb-1">
          Este libro no tiene recetas con los filtros actuales
        </h3>
        <p className="text-sm text-muted max-w-md mx-auto">
          Prueba cambiando la categoría o restablece el buscador para ver las demás páginas del libro.
        </p>
      </div>
    );
  }

  const recipeName = current ? (current.title || current.name || 'Sin nombre') : '';
  const recipeCategory = current ? (current.subcategory || current.category || 'General') : '';
  const recipePrice = current?.price ? `$${parseFloat(current.price).toFixed(2)}` : null;
  const ingredients = current?.recipe || [];
  const trackedCount = ingredients.filter((i) => i.tracked).length;

  return (
    <div className="border border-line bg-surface flex flex-col lg:flex-row min-h-[580px] shadow-xs">
      {/* Columna Izquierda: Índice del Libro */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-line bg-surfalt/40 flex flex-col">
        <div className="p-3.5 border-b border-line bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="kick text-ac font-bold">Índice del Libro</span>
            <span className="num text-xs text-muted font-semibold">
              {recipes.length} {recipes.length === 1 ? 'página' : 'páginas'}
            </span>
          </div>
          <div className="relative">
            <FAIcon icon="magnifying-glass" size="xs" className="absolute left-2.5 top-2.5 text-muted" />
            <input
              type="text"
              placeholder="Buscar en el índice..."
              value={indexSearch}
              onChange={(e) => setIndexSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surfalt border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-ac"
            />
          </div>
        </div>

        {/* Lista de recetas en el índice */}
        <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[520px] divide-y divide-line/60">
          {filteredIndexRecipes.map(({ r, originalIdx }) => {
            const isSelected = originalIdx === currentIndex;
            const rName = r.title || r.name;
            const rCat = r.subcategory || r.category;
            const ingCount = (r.recipe || []).length;

            return (
              <button
                key={originalIdx}
                type="button"
                onClick={() => onSelectIndex(originalIdx)}
                className={`w-full text-left px-3.5 py-3 transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-surface border-l-3 border-ac text-ink font-semibold shadow-xs'
                    : 'text-inkalt hover:bg-surface/80 hover:text-ink'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="num text-[10px] text-muted">#{originalIdx + 1}</span>
                    <span className="kick text-[9px] text-muted truncate">{rCat}</span>
                  </div>
                  <p className="text-xs truncate font-display font-medium leading-snug">
                    {rName}
                  </p>
                </div>
                <span className="num text-[10px] text-muted shrink-0 pt-1">
                  {ingCount} ins.
                </span>
              </button>
            );
          })}

          {filteredIndexRecipes.length === 0 && (
            <div className="p-4 text-center text-xs text-muted italic">
              No hay coincidencias en este libro
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Ficha Técnica Editorial de la Receta */}
      <div className="flex-1 flex flex-col justify-between p-5 sm:p-7 lg:p-8 bg-surface">
        <div>
          {/* Encabezado de la Ficha Técnica */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-line">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="kick text-ac font-bold tracking-widest">
                  FICHA TÉCNICA · PÁGINA {currentIndex + 1} DE {recipes.length}
                </span>
                <span className="text-muted text-xs">•</span>
                <span className="kick text-inkalt px-2 py-0.5 border border-line bg-surfalt font-semibold">
                  {recipeCategory}
                </span>
                {recipePrice && (
                  <span className="num text-xs font-bold text-ink px-2 py-0.5 border border-line bg-surface">
                    Precio: {recipePrice}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink leading-tight">
                {recipeName}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {editRoute && (
                <Link
                  to={editRoute.path}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ac text-ac bg-surface text-xs font-display font-semibold hover:bg-ac hover:text-white transition-colors"
                  title={editRoute.label}
                >
                  <FAIcon icon="pen" size="xs" />
                  Editar en {activeBook.shortLabel}
                </Link>
              )}
            </div>
          </div>

          {/* Información y estadísticas rápidas de la receta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 py-3 px-4 bg-surfalt/60 border border-line">
            <div>
              <p className="kick text-[9.5px] text-muted mb-0.5">Total Insumos</p>
              <p className="num text-lg font-bold text-ink">{ingredients.length}</p>
            </div>
            <div>
              <p className="kick text-[9.5px] text-muted mb-0.5">Control de Stock</p>
              <p className="num text-lg font-bold text-ok">{trackedCount} activos</p>
            </div>
            <div>
              <p className="kick text-[9.5px] text-muted mb-0.5">Libro</p>
              <p className="text-sm font-semibold text-ink truncate">{activeBook.label}</p>
            </div>
            <div>
              <p className="kick text-[9.5px] text-muted mb-0.5">Descuento</p>
              <p className="text-xs text-ok font-medium mt-1">Por orden vendida</p>
            </div>
          </div>

          {/* Tabla de Insumos y Dosificación */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                <FAIcon icon="list-check" size="sm" className="text-ac" />
                Composición de Ingredientes y Dosis
              </h3>
              <span className="text-[11px] text-muted">
                Unidades según catálogo de inventario
              </span>
            </div>

            {ingredients.length === 0 ? (
              <div className="p-6 border border-dashed border-line text-center text-sm text-muted">
                Esta receta todavía no tiene insumos asignados en el catálogo.
              </div>
            ) : (
              <div className="border border-line overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surfalt border-b border-line">
                      <th className="kick text-muted py-2.5 px-3.5 font-bold">Insumo / Ingrediente</th>
                      <th className="kick text-muted py-2.5 px-3.5 font-bold text-right">Cantidad / Dosis</th>
                      <th className="kick text-muted py-2.5 px-3.5 font-bold text-center">Control en Stock</th>
                      <th className="kick text-muted py-2.5 px-3.5 font-bold text-center">Modificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ingredients.map((item, idx) => {
                      const unitLabel = UNIT_LABELS[item.unit] || item.unit || '';
                      return (
                        <tr key={idx} className="hover:bg-surfalt/50 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-ink flex items-center gap-2">
                            <FAIcon
                              icon={item.tracked ? 'box' : 'circle-info'}
                              size="xs"
                              className={item.tracked ? 'text-ok' : 'text-muted'}
                            />
                            <span>{item.name}</span>
                          </td>
                          <td className="py-2.5 px-3.5 num font-semibold text-ink text-right">
                            {item.quantity ? `${item.quantity} ${unitLabel}` : unitLabel}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            {item.tracked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-ok font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                                Vinculado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                                Libre
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            {item.removable ? (
                              <span className="px-2 py-0.5 bg-warnsoft text-warn text-[10px] font-semibold border border-warn/30">
                                Quitable
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted">Fijo</span>
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

        {/* Pie de página con Controles de Navegación del Libro */}
        <div className="mt-8 pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-line bg-surface text-xs font-display font-semibold text-ink hover:border-ac hover:text-ac disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink transition-colors cursor-pointer"
          >
            <FAIcon icon="chevron-left" size="xs" />
            Receta anterior
          </button>

          <div className="text-center">
            <p className="num text-xs font-bold text-ink">
              Página {currentIndex + 1} de {recipes.length}
            </p>
            <p className="text-[10px] text-muted mt-0.5">
              Tip: Puedes navegar con las teclas ← y → del teclado
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectIndex(Math.min(recipes.length - 1, currentIndex + 1))}
            disabled={currentIndex === recipes.length - 1}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-line bg-surface text-xs font-display font-semibold text-ink hover:border-ac hover:text-ac disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink transition-colors cursor-pointer"
          >
            Receta siguiente
            <FAIcon icon="chevron-right" size="xs" />
          </button>
        </div>
      </div>
    </div>
  );
}
