// src/components/commons/DetailRow.jsx
// Fila simple label/valor reutilizada dentro de las secciones de ViewDetailsModal
import React from 'react';

const DetailRow = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-line last:border-0">
      <span className="kick text-muted shrink-0">
        {label}
      </span>
      <span className="text-sm text-ink text-right">{value}</span>
    </div>
  );
};

export default DetailRow;
