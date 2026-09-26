// src/components/commons/RecipeBuilder.jsx
// Builder de receta compartido: se usa para armar la receta de una bebida de
// casa, un platillo, un insumo compuesto de Inventario, o los ingredientes de
// un Extra. Cada fila puede buscar un insumo ya existente en Inventario, o
// crear uno nuevo al vuelo (queda "pendiente" hasta que el admin lo complete).
import React, { useState } from 'react';
import FAIcon from './FAIcon';
import Select from './Select';
import { useInventory } from '../../hooks/useInventory';
import { UNIT_LIST } from '../../constants/units';
import { createEmptyRecipeRow } from '../../utils/recipeRowUtils';

const PAGE_SIZE = 2;

const RecipeBuilder = ({ rows, setRows, categories = [], showRemovable = false, helperText, paginate = false, title = 'Receta (opcional)' }) => {
  const { insumos } = useInventory();
  // Buscador por fila (antes era un solo string compartido: dos filas con el
  // mismo texto abrían ambos dropdowns a la vez)
  const [searchByRow, setSearchByRow] = useState({});
  const [page, setPage] = useState(0);

  const totalPages = paginate ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;
  // Si se elimina una fila y la página guardada queda fuera de rango, se recalcula
  // al vuelo en vez de sincronizar con un efecto (evita el set-state-en-efecto)
  const currentPage = Math.min(page, totalPages - 1);

  const visibleRows = paginate ? rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE) : rows;

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRecipeRow()]);
    if (paginate) setPage(Math.floor(rows.length / PAGE_SIZE));
  };
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));
  const updateRow = (key, patch) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const setSearch = (key, value) => setSearchByRow((prev) => ({ ...prev, [key]: value }));

  const pickExistingInsumo = (rowKey, insumo) => {
    updateRow(rowKey, { name: insumo.name, tracked: true, inventoryId: insumo._id, isNew: false });
    setSearch(rowKey, '');
  };

  const inputClasses =
    'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt placeholder:text-muted text-sm';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-2">
        <div>
          <p className="font-display font-semibold text-ink text-sm">{title}</p>
          {helperText && <p className="text-xs text-muted mt-0.5 sm:mt-0 leading-relaxed">{helperText}</p>}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="shrink-0 self-start sm:self-auto text-xs font-display font-semibold text-ac hover:text-ac flex items-center gap-1.5 sm:gap-1 border border-acline sm:border-0 px-3 py-1.5 sm:p-0"
        >
          <FAIcon icon="plus" size="xs" /> Agregar ingrediente
        </button>
      </div>

      <div className="space-y-3">
        {visibleRows.map((row) => {
          const search = searchByRow[row.key] || '';
          const matches = search.trim()
            ? insumos.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
            : [];

          return (
            <div key={row.key} className="p-3.5 sm:p-3 bg-surface rounded-none border border-line space-y-3 sm:space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => {
                      updateRow(row.key, { name: e.target.value, inventoryId: null, tracked: false });
                      setSearch(row.key, e.target.value);
                    }}
                    placeholder="Nombre del ingrediente..."
                    className={inputClasses}
                  />
                  {search && matches.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-surface rounded-none border border-line max-h-32 overflow-y-auto">
                      {matches.map((insumo) => (
                        <button
                          type="button"
                          key={insumo._id}
                          onClick={() => pickExistingInsumo(row.key, insumo)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-surfalt"
                        >
                          {insumo.name} {insumo.pending ? '(pendiente)' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="p-2 text-muted hover:text-ac"
                  aria-label="Quitar ingrediente"
                >
                  <FAIcon icon="trash" size="sm" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="sm:hidden block text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    placeholder="Cantidad"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="sm:hidden block text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-1">
                    Unidad
                  </label>
                  <Select
                    value={row.unit}
                    onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                  >
                    {UNIT_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2 sm:gap-4 pt-1 sm:pt-0 border-t sm:border-t-0 border-line/60">
                <label className="flex items-center gap-2 sm:gap-1.5 text-xs text-inkalt font-medium py-1 sm:py-0">
                  <input
                    type="checkbox"
                    checked={row.tracked}
                    disabled={!row.isNew && Boolean(row.inventoryId)}
                    onChange={(e) => updateRow(row.key, { tracked: e.target.checked, inventoryId: e.target.checked ? row.inventoryId : null })}
                    className="accent-red-500 w-4 h-4 sm:w-auto sm:h-auto shrink-0"
                  />
                  Guardar en inventario
                </label>
                {showRemovable && (
                  <label className="flex items-center gap-2 sm:gap-1.5 text-xs text-inkalt font-medium py-1 sm:py-0">
                    <input
                      type="checkbox"
                      checked={row.removable}
                      onChange={(e) => updateRow(row.key, { removable: e.target.checked })}
                      className="accent-red-500 w-4 h-4 sm:w-auto sm:h-auto shrink-0"
                    />
                    El cliente puede quitarlo
                  </label>
                )}
              </div>

              {row.tracked && !row.inventoryId && categories.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-warnsoft sm:bg-transparent border border-warn/30 sm:border-0 px-2.5 sm:px-0 py-2 sm:py-0">
                  <p className="text-[11px] text-warn flex-1 leading-relaxed">
                    Se creará como insumo pendiente en Inventario al guardar
                  </p>
                  <Select
                    size="sm"
                    className="w-full sm:w-auto"
                    value={row.ingredientCategory || categories[0]}
                    onChange={(e) => updateRow(row.key, { ingredientCategory: e.target.value })}
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-xs text-muted text-center py-2">Sin ingredientes agregados todavía</p>
        )}
      </div>

      {paginate && rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 text-muted hover:text-ac disabled:opacity-30 disabled:hover:text-muted"
            aria-label="Página anterior"
          >
            <FAIcon icon="chevron-left" size="sm" />
          </button>
          <span className="text-xs text-muted font-medium">
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="p-2 text-muted hover:text-ac disabled:opacity-30 disabled:hover:text-muted"
            aria-label="Página siguiente"
          >
            <FAIcon icon="chevron-right" size="sm" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RecipeBuilder;
