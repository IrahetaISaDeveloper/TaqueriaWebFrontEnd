// src/components/commons/PaginationControls.jsx
import React from 'react';
import FAIcon from './FAIcon';

const PaginationControls = ({ page, totalPages, onPrev, onNext, onGoTo }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={onPrev}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-none bg-surface text-inkalt border border-line disabled:opacity-40 hover:bg-surfalt transition-colors"
        aria-label="Página anterior"
      >
        <FAIcon icon="chevron-left" size="sm" />
      </button>

      {pages.map((n) => (
        <button
          key={n}
          onClick={() => onGoTo(n)}
          className={`w-9 h-9 flex items-center justify-center rounded-none text-sm font-display font-semibold transition-colors ${
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
