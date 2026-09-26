// src/components/menu/CatalogEmpty.jsx
//
// Estado vacío del catálogo: si hay filtros puestos ofrece limpiarlos, si no
// ofrece crear el primer elemento.
import React from 'react';
import FAIcon from '../commons/FAIcon';
import { MENU_PRIMARY_BUTTON } from './MenuPageShell';

const CatalogEmpty = ({ hasActiveFilters, onClear, onCreate, filteredText, emptyText, createLabel }) => (
  <div className="text-center py-14 border border-dashed border-line">
    <p className="kick text-muted mb-2">Sin resultados</p>
    <p className="text-sm text-inkalt">{hasActiveFilters ? filteredText : emptyText}</p>
    {hasActiveFilters ? (
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-line text-xs text-inkalt hover:border-ac hover:text-ac transition-colors cursor-pointer"
      >
        Limpiar filtros
      </button>
    ) : (
      onCreate && (
        <button type="button" onClick={onCreate} className={`mt-4 ${MENU_PRIMARY_BUTTON}`}>
          <FAIcon icon="plus" size="xs" />
          {createLabel}
        </button>
      )
    )}
  </div>
);

export default CatalogEmpty;
