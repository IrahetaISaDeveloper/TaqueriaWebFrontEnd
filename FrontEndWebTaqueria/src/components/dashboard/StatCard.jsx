import React from 'react';
import FAIcon from '../commons/FAIcon';

const StatCard = ({ icon, title, value, change, unit = '', alert = false, highlighted = true, label }) => {
  // label prevalece sobre change si se pasa
  const subtitle = label !== undefined ? label : change;

  return (
    <div
      className={`
        rounded-3xl p-5 sm:p-6
        shadow-[0_10px_40px_rgba(0,0,0,0.08),inset_1px_1px_3px_rgba(255,255,255,0.7),inset_-1px_-1px_3px_rgba(0,0,0,0.05)]
        border border-white/80
        transition-all duration-200 hover:scale-[1.02]
        ${highlighted ? 'bg-red-50/80 text-red-900' : 'bg-white text-gray-900'}
        ${alert ? 'border-red-300/70' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs sm:text-sm font-display font-semibold uppercase tracking-wider ${highlighted ? 'text-red-600/80' : 'text-gray-500'}`}>
          {title}
        </p>
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-1px_-1px_3px_rgba(255,255,255,0.6)]
            ${highlighted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}
          `}
        >
          <FAIcon icon={icon} size="lg" />
        </div>
      </div>
      <h3 className={`text-3xl sm:text-4xl font-display font-bold mb-1 ${highlighted ? 'text-red-600' : 'text-gray-900'}`}>
        {value}{unit && <span className="text-lg ml-1">{unit}</span>}
      </h3>
      {subtitle && (
        <p className={`text-xs sm:text-sm font-medium ${highlighted ? 'text-red-600/70' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;