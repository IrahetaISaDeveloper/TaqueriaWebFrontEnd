// src/components/dashboard/StatLine.jsx
// Indicador con el mismo lenguaje "editorial" del Dashboard (ver
// pages/Dashboard.jsx): una regla fina arriba en vez de una tarjeta con
// icono, la cifra mandando en tipografía tabular. Se usa en las pantallas
// de listado (Platillos, Bebidas, Conjuntos de bebidas, Combos,
// Promociones) para compartir el mismo look que el Dashboard, sin tocar el
// estilo "clay" que sigue usando ComboStats en el resto del sistema.
import React from 'react';

const StatLine = ({ title, value, label, highlighted = false, onClick, active = false }) => {
  const Tag = onClick ? 'button' : 'div';
  const isAccent = active || highlighted;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left border-t pt-3 sm:pt-4 transition-colors ${
        isAccent ? 'border-ac' : 'border-linealt'
      } ${onClick ? 'cursor-pointer hover:border-ac' : ''}`}
    >
      <p className={`kick mb-2 ${isAccent ? 'text-ac' : 'text-muted'}`}>
        {title}
      </p>
      <h3 className={`num text-2xl sm:text-3xl leading-none tracking-tight break-words line-clamp-2 ${isAccent ? 'text-ac' : 'text-ink'}`}>
        {value}
      </h3>
      {typeof label === 'string' ? (
        <p className="text-[11.5px] text-muted mt-2">{label}</p>
      ) : (
        <div className="mt-2">{label}</div>
      )}
    </Tag>
  );
};

export default StatLine;
