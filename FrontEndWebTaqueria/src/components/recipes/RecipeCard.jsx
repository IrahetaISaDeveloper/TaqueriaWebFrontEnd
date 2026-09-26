// src/components/recipes/RecipeCard.jsx
import { Link } from 'react-router-dom';
import FAIcon from '../commons/FAIcon';
import { UNIT_LABELS } from '../../constants/units';

export default function RecipeCard({ recipeItem, editRoute, bookIcon = 'utensils', onViewDetail }) {
  const name = recipeItem.title || recipeItem.name || 'Sin nombre';
  const category = recipeItem.subcategory || recipeItem.category || 'General';
  const price = recipeItem.price ? `$${parseFloat(recipeItem.price).toFixed(2)}` : null;
  const ingredients = recipeItem.recipe || [];
  const trackedCount = ingredients.filter((i) => i.tracked).length;
  const image = recipeItem.image;

  return (
    <div className="group bg-surface border border-line flex flex-col h-full transition-colors hover:border-ac">
      {/* Cabecera / Imagen o banner culinario */}
      <div className="relative h-36 sm:h-40 bg-surfalt overflow-hidden border-b border-line flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-surfalt to-line/30 p-4 text-center">
            <div className="w-10 h-10 flex items-center justify-center border border-linealt bg-surface/80 text-muted mb-1.5 shadow-sm">
              <FAIcon icon={bookIcon} size="lg" />
            </div>
            <span className="kick text-[9.5px] text-muted tracking-wider">Ficha culinaria</span>
          </div>
        )}

        {/* Badge de categoría */}
        <span className="absolute top-2.5 left-2.5 kick text-[10px] px-2 py-0.5 bg-surface/90 border border-line text-inkalt backdrop-blur-xs font-semibold shadow-xs">
          {category}
        </span>

        {/* Botón de editar rápido */}
        {editRoute && (
          <Link
            to={editRoute.path}
            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center bg-surface/90 border border-line text-inkalt hover:border-ac hover:text-ac transition-colors shadow-xs"
            title={editRoute.label}
            onClick={(e) => e.stopPropagation()}
          >
            <FAIcon icon="pen" size="xs" />
          </Link>
        )}
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-display font-bold text-base text-ink leading-snug line-clamp-1">
              {name}
            </h4>
            {price && <span className="num text-xs font-semibold text-ink shrink-0">{price}</span>}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="kick text-[10px] text-muted font-semibold">
              {ingredients.length} {ingredients.length === 1 ? 'insumo' : 'insumos'}
            </span>
            <span className="text-muted text-[10px]">•</span>
            <span className="kick text-[10px] text-ok font-semibold">
              {trackedCount} inventariados
            </span>
          </div>

          {/* Lista previa de ingredientes */}
          <div className="space-y-1.5 mb-4 border-t border-line/60 pt-2.5">
            {ingredients.slice(0, 3).map((item, idx) => {
              const unitLabel = UNIT_LABELS[item.unit] || item.unit || '';
              return (
                <div key={idx} className="flex items-center justify-between text-xs text-inkalt">
                  <span className="flex items-center gap-1.5 truncate pr-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.tracked ? 'bg-ok' : 'bg-muted'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="num text-[11px] text-muted shrink-0 font-medium">
                    {item.quantity ? `${item.quantity} ${unitLabel}` : unitLabel}
                  </span>
                </div>
              );
            })}

            {ingredients.length > 3 && (
              <p className="text-[11px] text-muted italic pt-0.5">
                + {ingredients.length - 3} {ingredients.length - 3 === 1 ? 'ingrediente más' : 'ingredientes más'}...
              </p>
            )}

            {ingredients.length === 0 && (
              <p className="text-xs text-muted italic py-1">Sin ingredientes asignados</p>
            )}
          </div>
        </div>

        {/* Botón de acción */}
        <div className="pt-2 border-t border-line flex items-center justify-between">
          <button
            type="button"
            onClick={() => onViewDetail(recipeItem)}
            className="w-full py-1.5 text-xs font-display font-semibold text-ink border border-line hover:border-ac hover:text-ac hover:bg-surfalt/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FAIcon icon="file-circle-check" size="xs" />
            Ver ficha técnica
          </button>
        </div>
      </div>
    </div>
  );
}
