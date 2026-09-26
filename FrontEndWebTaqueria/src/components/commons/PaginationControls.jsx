// src/components/commons/PaginationControls.jsx
import React from 'react';
import FAIcon from './FAIcon';

const PaginationControls = ({ page, totalPages, onPrev, onNext, onGoTo, compact = false }) => {
  if (totalPages <= 1) return null;

  // Versión corta "‹ 1/4 ›" de las pantallas del catálogo.
  if (compact) {
    const arrow = 'w-8 h-8 flex items-center justify-center border border-line text-inkalt hover:border-ac hover:text-ac disabled:opacity-40 disabled:hover:border-line disabled:hover:text-inkalt transition-colors cursor-pointer';
    return (
      <div className="flex items-center justify-center gap-3 mt-7">
        <button onClick={onPrev} disabled={page === 1} className={arrow} aria-label="Página anterior">
          <FAIcon icon="chevron-left" size="sm" />
        </button>
        <span className="num text-xs text-muted">{page}/{totalPages}</span>
        <button onClick={onNext} disabled={page === totalPages} className={arrow} aria-label="Página siguiente">
          <FAIcon icon="chevron-right" size="sm" />
        </button>
      </div>
    );
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
      <button
        onClick={onPrev}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-none bg-surface text-inkalt border border-line disabled:opacity-40 hover:bg-surfalt transition-colors"
        aria-label="Página anterior"
      >
        <FAIcon icon="chevron-left" size="sm" />
      </button>

      <span className="flex sm:hidden items-center justify-center px-3 h-9 text-sm font-display font-semibold text-inkalt">
        Página {page} de {totalPages}
      </span>

      {pages.map((n) => (
        <button
          key={n}
          onClick={() => onGoTo(n)}
          className={`hidden sm:flex w-9 h-9 items-center justify-center rounded-none text-sm font-display font-semibold transition-colors ${
            n === page
              ? 'bg-ac text-white'
              : 'bg-surface text-inkalt border border-line hover:bg-surfalt'
          }`}
        >
          {n}
        </button>
      ))}

      <button
        onClick={onNext}
        disabled={page === totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-none bg-surface text-inkalt border border-line disabled:opacity-40 hover:bg-surfalt transition-colors"
        aria-label="Página siguiente"
      >
        <FAIcon icon="chevron-right" size="sm" />
      </button>
    </div>
  );
};

export default PaginationControls;
