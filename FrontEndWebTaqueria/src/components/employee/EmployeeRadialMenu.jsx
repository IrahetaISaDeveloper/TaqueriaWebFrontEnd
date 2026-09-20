// src/components/employee/EmployeeRadialMenu.jsx
// Menú de acciones tipo radial: al abrirse, difumina el resto del sistema y
// deja nítida solo la fila del empleado seleccionado (eso lo controla el
// componente padre, aplicando z-index a esa fila por encima de este overlay).
import React from 'react';
import FAIcon from '../commons/FAIcon';

// Ángulos en coordenadas de pantalla (0°=derecha, 90°=abajo, sin() crece hacia
// abajo). Un abanico simétrico "hacia arriba" tiene que quedar centrado en
// 270° (arriba), no recostado a la izquierda como antes (200°/235°/270° dejaba
// dos de los tres botones casi horizontales en vez de sobre el botón de "⋮").
const OPTIONS = [
  { id: 'view', label: 'Ver info', icon: 'eye', angle: 225 },
  { id: 'edit', label: 'Editar', icon: 'pen', angle: 270 },
  { id: 'baja', label: 'Dar de baja', icon: 'user-slash', angle: 315 },
];

const RADIUS = 74;

const EmployeeRadialMenu = ({ isOpen, anchor, onClose, onSelect, isActive }) => {
  if (!isOpen || !anchor) return null;

  // Si el botón que abrió el menú está muy arriba en la pantalla, dejamos que
  // el abanico se abra hacia abajo en vez de salirse por encima del viewport.
  const openDownward = anchor.y < RADIUS + 60;

  return (
    <div className="fixed inset-0 z-40 backdrop-blur-md bg-black/10" onClick={onClose}>
      {OPTIONS.map((opt) => {
        if (opt.id === 'baja' && !isActive) {
          // Ya está inactivo: la opción se convierte en "Reactivar"
          opt = { ...opt, id: 'reactivar', label: 'Reactivar', icon: 'user-check' };
        }
        // Reflejar el ángulo sobre el eje horizontal abre el mismo abanico
        // hacia abajo en vez de hacia arriba (225/270/315 -> 135/90/45).
        const angle = openDownward ? (360 - opt.angle) % 360 : opt.angle;
        const rad = (angle * Math.PI) / 180;
        const x = anchor.x + RADIUS * Math.cos(rad);
        const y = anchor.y + RADIUS * Math.sin(rad);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(opt.id);
            }}
            title={opt.label}
            style={{ left: x, top: y }}
            className={`fixed z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group`}
          >
            <span
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-transform group-hover:scale-110 ${
                opt.id === 'baja' ? 'bg-ac' : opt.id === 'reactivar' ? 'bg-ok' : 'bg-ink'
              }`}
            >
              <FAIcon icon={opt.icon} size="sm" />
            </span>
            <span className="px-2 py-0.5 rounded-full bg-ink text-white text-[10px] font-display font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {opt.label}
            </span>
          </button>
        );
      })}

      {/* Botón central de cierre, marca visual del "centro" del radial */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ left: anchor.x, top: anchor.y }}
        className="fixed z-50 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface text-muted flex items-center justify-center"
      >
        <FAIcon icon="times" size="xs" />
      </button>
    </div>
  );
};

export default EmployeeRadialMenu;
