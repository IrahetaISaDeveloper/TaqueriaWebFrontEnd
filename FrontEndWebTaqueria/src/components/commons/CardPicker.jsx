// src/components/commons/CardPicker.jsx
import React, { useMemo, useState } from 'react';
import FAIcon from './FAIcon';
import Select from './Select';
import { usePagination } from '../../hooks/usePagination';

const PLACEHOLDER_IMAGE = 'https://placehold.co/300x200/f3f0eb/9ca3af?text=Sin+imagen';

// Selector genérico por tarjetas: imagen + nombre + precio, con búsqueda,
// filtro por categoría y paginación de 4 en 4. Se usa tanto para elegir
// platillos como bebidas al armar un combo.
const CardPicker = ({ items, selectedIds, onToggle, categories = [] }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const itemName = item.name || item.title || '';
      const matchesSearch = itemName.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = category === 'all' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, category]);

  const { page, totalPages, paginatedItems, next, prev } = usePagination(filtered, 4);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <FAIcon icon="magnifying-glass" size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-2 bg-surface border border-line rounded-none text-sm text-inkalt placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acline"
          />
        </div>
        {categories.length > 0 && (
          <Select className="w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Todas las categorías</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {paginatedItems.map((item) => {
          const itemId = item._id || item.id;
          const isSelected = selectedIds.includes(itemId);
          const itemName = item.name || item.title || '';
          return (
            <button
              type="button"
              key={itemId}
              onClick={() => onToggle(itemId)}
              className={`relative rounded-none overflow-hidden border-2 text-left transition-all ${
                isSelected ? 'border-ac' : 'border-line hover:border-line'
              }`}
            >
              <div className="relative h-16">
                <img src={item.image || PLACEHOLDER_IMAGE} alt={itemName} className="w-full h-full object-cover" />
                {isSelected && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ac text-white flex items-center justify-center">
                    <FAIcon icon="check" size="xs" />
                  </span>
                )}
              </div>
              <div className="p-1.5 bg-surface">
                <p className="text-[11px] font-display font-semibold text-ink line-clamp-1">{itemName}</p>
                <p className="text-[11px] text-ac font-semibold">${parseFloat(item.price || 0).toFixed(2)}</p>
              </div>
            </button>
          );
        })}
        {paginatedItems.length === 0 && (
          <p className="col-span-full text-center text-xs text-muted py-4">Sin resultados</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={prev} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded-none bg-surface border border-line disabled:opacity-40">
            <FAIcon icon="chevron-left" size="xs" />
          </button>
          <span className="text-xs text-muted">{page}/{totalPages}</span>
          <button type="button" onClick={next} disabled={page === totalPages} className="w-7 h-7 flex items-center justify-center rounded-none bg-surface border border-line disabled:opacity-40">
            <FAIcon icon="chevron-right" size="xs" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CardPicker;
