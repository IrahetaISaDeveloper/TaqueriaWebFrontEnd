// src/components/menu/MenuHero.jsx
//
// Fila de indicadores de las pantallas del catálogo: una cifra grande que
// manda a la izquierda ("42 de 47 registrados") y a su lado indicadores
// secundarios con una regla fina encima, como en el Dashboard.
import React from 'react';

const TONES = {
  ac: 'text-ac',
  warn: 'text-warn',
  ok: 'text-ok',
  muted: 'text-muted',
};

const MenuHero = ({ primary, secondary = [], loading = false }) => (
  <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-6 md:gap-10 mb-7 sm:mb-8">
    <div className="min-w-0">
      <p className="kick text-muted mb-2">{primary.kick}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="num text-5xl sm:text-6xl font-light text-ink leading-none tracking-tight">
          {loading ? '—' : primary.value}
        </span>
        {primary.suffix && !loading && <span className="text-sm text-muted">{primary.suffix}</span>}
      </div>
      {primary.note && !loading && (
        <p className={`text-xs mt-3 ${TONES[primary.noteTone] || 'text-muted'}`}>{primary.note}</p>
      )}
    </div>

    {secondary.map((s) => (
      <div key={s.kick} className="min-w-0 border-t border-linealt pt-3 self-start">
        <p className={`kick mb-2 ${s.tone ? TONES[s.tone] : 'text-muted'}`}>{s.kick}</p>
        <p
          className={`text-lg sm:text-xl leading-snug break-words line-clamp-2 ${
            typeof s.value === 'number' ? 'num' : 'font-display font-semibold'
          } ${s.tone ? TONES[s.tone] : 'text-ink'}`}
        >
          {loading ? '—' : s.value}
        </p>
        {s.label && <p className="text-[11.5px] text-muted mt-1">{s.label}</p>}
      </div>
    ))}
  </div>
);

export default MenuHero;
