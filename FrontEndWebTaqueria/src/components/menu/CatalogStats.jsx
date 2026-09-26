// src/components/menu/CatalogStats.jsx
//
// Franja de indicadores del catálogo (Platillos, Bebidas, Combos...): cuatro celdas del mismo peso separadas
// por reglas finas. Las celdas con `onClick` funcionan como filtro rápido
// (p. ej. "Sin imagen" muestra solo esos platillos) y se marcan en rojo
// mientras están activas.
import React from 'react';
import FAIcon from '../commons/FAIcon';

const TONES = {
  ac: 'text-ac',
  warn: 'text-warn',
  ok: 'text-ok',
};

const StatCell = ({ kick, icon, value, suffix, label, tone, progress, active, onClick, loading, isText }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`relative bg-surface text-left p-4 sm:p-5 min-w-0 flex flex-col transition-colors ${
        onClick ? 'cursor-pointer hover:bg-surfalt/60' : ''
      } ${active ? 'bg-acsoft/60 hover:bg-acsoft' : ''}`}
    >
      {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-ac" />}

      <div className="flex items-center justify-between gap-2 mb-3">
        <p className={`kick truncate ${active ? 'text-ac' : 'text-muted'}`}>{kick}</p>
        {icon && <FAIcon icon={icon} size="xs" className={active ? 'text-ac' : tone ? TONES[tone] : 'text-linealt'} />}
      </div>

      <div className="flex items-baseline gap-1.5 min-w-0">
        <span
          className={`leading-none truncate ${
            isText ? 'font-display font-semibold text-lg sm:text-xl' : 'num text-3xl sm:text-4xl font-light'
          } ${tone ? TONES[tone] : 'text-ink'}`}
        >
          {loading ? '—' : value}
        </span>
        {suffix && !loading && <span className="num text-sm text-muted">{suffix}</span>}
      </div>

      {progress !== undefined && (
        <div className="mt-3 h-1 bg-surfalt overflow-hidden">
          <div className="h-full bg-ac transition-all" style={{ width: `${loading ? 0 : progress}%` }} />
        </div>
      )}

      {label && (
        <p className={`text-[11.5px] mt-2 ${active ? 'text-ac' : 'text-muted'}`}>
          {label}
        </p>
      )}
    </Tag>
  );
};

const CatalogStats = ({ cells, loading }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line mb-6">
    {cells.map((cell) => (
      <StatCell key={cell.kick} loading={loading} {...cell} />
    ))}
  </div>
);

export default CatalogStats;
