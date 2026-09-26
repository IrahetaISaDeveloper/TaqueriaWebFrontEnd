// src/components/menu/CatalogToolbar.jsx
//
// Barra de filtros del catálogo: buscador y desplegables arriba, pestañas de
// categoría con su conteo abajo, y bajo la barra la línea "Mostrando X de Y"
// con el enlace para limpiar filtros cuando hay alguno puesto.
import React from 'react';
import Select from '../commons/Select';
import FAIcon from '../commons/FAIcon';

const CatalogToolbar = ({
  search,
  onSearch,
  searchPlaceholder = 'Buscar por nombre...',
  selects = [],
  tabs = [],
  tabValue,
  onTab,
  tabsLabel = 'Categorías',
  loading = false,
  shown,
  total,
  noun = 'elementos',
  hasActiveFilters = false,
  onClear,
}) => {
  const visibleSelects = selects.filter((s) => s.options && s.options.length > 1);

  return (
    <>
      <div className="border border-line mb-5">
        <div className={`flex flex-col md:flex-row md:items-center gap-2 p-3 bg-surfalt/40 ${tabs.length ? 'border-b border-line' : ''}`}>
          <div className="relative flex-1 md:max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <FAIcon icon="magnifying-glass" size="xs" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-surface border border-line focus:border-ac focus:outline-none text-ink placeholder:text-muted transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ac cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <FAIcon icon="times" size="xs" />
              </button>
            )}
          </div>

          {visibleSelects.length > 0 && (
            <div className="flex flex-wrap gap-2 md:ml-auto">
              {visibleSelects.map((s) => (
                <Select
                  key={s.label}
                  size="sm"
                  className={`w-auto ${s.minWidth || 'min-w-[150px]'}`}
                  value={s.value}
                  onChange={(e) => s.onChange(e.target.value)}
                >
                  {s.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              ))}
            </div>
          )}
        </div>

        {tabs.length > 0 && (
          <nav className="flex gap-1 overflow-x-auto px-3" aria-label={tabsLabel}>
            {tabs.map((tab) => {
              const active = tabValue === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTab(tab.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 px-3 py-2.5 -mb-px border-b-2 text-[13px] whitespace-nowrap transition-colors cursor-pointer ${
                    active ? 'border-ac text-ink font-medium' : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`num text-[10.5px] px-1.5 py-0.5 leading-none ${
                        active ? 'bg-ac text-white' : 'bg-surfalt text-muted'
                      }`}
                    >
                      {loading ? '·' : tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {!loading && (
        <div className="flex items-center justify-between gap-3 mb-4 text-xs text-muted">
          <p>
            Mostrando <span className="num text-ink">{shown}</span> de{' '}
            <span className="num text-ink">{total}</span> {noun}
          </p>
          {hasActiveFilters && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 text-ac hover:underline underline-offset-2 cursor-pointer"
            >
              <FAIcon icon="times" size="xs" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default CatalogToolbar;
