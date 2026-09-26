// src/components/menu/MenuFilterRow.jsx
//
// Fila de filtros del catálogo: chips redondos para la categoría (el filtro
// que más se usa, a un clic) y desplegables a la derecha para el resto.
import React from 'react';
import Select from '../commons/Select';

// `extra`: controles adicionales a la derecha (p. ej. un buscador).
const MenuFilterRow = ({ label = 'Categoría', chips = [], value, onChange, filters = [], extra }) => {
  const visibleFilters = filters.filter((f) => f.options && f.options.length > 1);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
      {chips.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="kick text-muted mr-1">{label}</span>
          {chips.map((chip) => {
            const active = value === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChange(chip.id)}
                className={`px-3 py-1 rounded-full border text-xs transition-colors cursor-pointer ${
                  active
                    ? 'border-ac text-ac bg-acsoft'
                    : 'border-line text-inkalt hover:border-ac hover:text-ac'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      ) : (
        <span />
      )}

      {(visibleFilters.length > 0 || extra) && (
        <div className="flex flex-wrap gap-2">
          {extra}
          {visibleFilters.map((filter) => (
            <Select
              key={filter.label}
              size="sm"
              className="w-auto min-w-[150px]"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuFilterRow;
