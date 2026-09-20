// src/components/dashboard/ActivityRow.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const ActivityRow = ({ id, tipo, orderType, mesa, cliente, monto, estado, hora, showType, onView }) => {
  const estadoStyles = {
    COMPLETADO: 'bg-oksoft text-ok border border-ok',
    LISTO: 'bg-infosoft text-info border border-info',
    PREPARANDO: 'bg-warnsoft text-warn border border-warn',
    PENDIENTE: 'bg-warnsoft text-warn border border-warn',
    ATRASADO: 'bg-acsoft text-ac border border-acline',
    CANCELADO: 'bg-line text-inkalt border border-linealt',
  };

  return (
    <tr className="border-b border-line hover:bg-surface transition-colors">
      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-display font-semibold text-ink whitespace-nowrap">{id}</td>
      {showType && (
        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 rounded-full text-xs font-display font-semibold ${orderType === 'online' ? 'bg-infosoft text-info' : 'bg-infosoft text-info'}`}>
            <FAIcon icon={orderType === 'online' ? 'globe' : 'store'} size="xs" />
            <span>{tipo}</span>
          </span>
        </td>
      )}
      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-inkalt whitespace-nowrap">{mesa}</td>
      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-inkalt whitespace-nowrap">{cliente}</td>
      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-display font-semibold text-ink whitespace-nowrap">{monto}</td>
      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
        <span className={`px-2 sm:px-3 py-1 text-xs font-display font-semibold rounded-full ${estadoStyles[estado] || 'bg-surfalt text-inkalt border border-line'}`}>
          {estado}
        </span>
      </td>
      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-inkalt whitespace-nowrap">{hora}</td>
      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={onView}
          className="w-7 h-7 rounded-full inline-flex items-center justify-center text-muted hover:text-ac hover:bg-acsoft transition-colors"
          title="Ver pedido"
        >
          <FAIcon icon="eye" size="xs" />
        </button>
      </td>
    </tr>
  );
};

export default ActivityRow;
