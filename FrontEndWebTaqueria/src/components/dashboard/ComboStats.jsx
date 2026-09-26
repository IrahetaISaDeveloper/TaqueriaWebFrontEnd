// src/components/dashboard/ComboStats.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const ComboStats = ({ icon, title, value, label, highlighted = false, onClick, active = false }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`
        w-full text-left rounded-none p-5 sm:p-6 bg-surface text-ink
        border-y border-r transition-all duration-200 hover:scale-[1.02]
        ${onClick ? 'cursor-pointer' : ''}
        ${active ? 'border-ac ring-2 ring-red-400/60 border-l-4' : highlighted ? 'border-l-4 border-l-red-500 border-line' : 'border-l border-l-white/80 border-line'}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs sm:text-sm font-display font-semibold uppercase tracking-wider ${highlighted ? 'text-ac' : 'text-muted'}`}>
          {title}
        </p>
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${highlighted ? 'bg-acsoft text-ac' : 'bg-surfalt text-muted'}
        `}>
          <FAIcon icon={icon} size="lg" />
        </div>
      </div>
      <h3 className={`text-2xl sm:text-4xl font-display font-bold mb-1 break-words line-clamp-2 ${highlighted ? 'text-ac' : 'text-ink'}`}>
        {value}
      </h3>
      <p className="text-xs sm:text-sm font-medium text-muted">
        {label}
      </p>
    </Tag>
  );
};

export default ComboStats;