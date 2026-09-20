// src/components/dashboard/StatCard.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';
import Card from '../commons/Card';

const StatCard = ({ icon, title, value, change, unit = '', alert = false }) => {
  return (
    <Card className={`p-4 sm:p-6 ${alert ? 'border-acline/70' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <FAIcon icon={icon} size="2xl" className="text-ac" />
        {change && (
          <span className={`text-xs font-display font-semibold ${change.includes('+') ? 'text-ok' : 'text-ac'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-inkalt text-xs sm:text-sm mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl sm:text-3xl font-display font-bold text-ink">{value}</h3>
        {unit && <span className="text-muted text-xs sm:text-sm">{unit}</span>}
      </div>
    </Card>
  );
};

export default StatCard;