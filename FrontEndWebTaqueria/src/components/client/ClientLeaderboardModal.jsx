// src/components/client/ClientLeaderboardModal.jsx
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import PeriodSelector from '../commons/PeriodSelector';

const TABS = [
  { id: 'mostActive', label: 'Más activos', icon: 'bolt', defaultHint: '7 días' },
  { id: 'topSpenders', label: 'Mayor gasto total', icon: 'sack-dollar', defaultHint: null },
  { id: 'priciestWeek', label: 'Compras más caras', icon: 'receipt', defaultHint: 'semana' },
];

const PERIOD_HINTS = {
  day: 'hoy',
  week: 'semana',
  month: 'mes',
  year: 'año',
  all: 'todo',
  custom: 'rango elegido',
};

const clientName = (customer) =>
  `${customer?.personalInfo?.name || ''} ${customer?.personalInfo?.lastname || ''}`.trim() || 'Cliente';

const Row = ({ rank, name, email, primary, secondary }) => (
  <div className="flex items-center gap-3.5 bg-surface rounded-none border border-line border-l-2 border-l-ac p-3.5 hover:border-acline transition-colors shadow-xs">
    <span className="w-7 h-7 bg-acsoft text-ac border border-acline/60 font-mono font-bold text-xs flex items-center justify-center shrink-0">
      {rank}
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-display font-semibold text-ink text-sm truncate">{name}</p>
      <p className="text-xs text-muted truncate font-mono">{email || 'Sin correo'}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="font-mono font-bold text-ac text-base">{primary}</p>
      {secondary && <p className="text-xs text-muted font-mono">{secondary}</p>}
    </div>
  </div>
);

const ClientLeaderboardModal = ({
  isOpen,
  onClose,
  mostActive,
  topSpenders,
  priciestWeek,
  loading,
  onOpen,
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}) => {
  const [tab, setTab] = useState('mostActive');

  useEffect(() => {
    if (isOpen) onOpen?.(period, customRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePeriodChange = (nextPeriod) => onPeriodChange(nextPeriod, customRange);
  const handleCustomRangeChange = (nextRange) => {
    onCustomRangeChange(nextRange);
    if (nextRange.from && nextRange.to) onPeriodChange('custom', nextRange);
  };

  const rows = tab === 'mostActive' ? mostActive : tab === 'topSpenders' ? topSpenders : priciestWeek;
  const isOrderList = tab === 'priciestWeek';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      {/* Contenedor del Modal con borde superior de acento rojo institucional */}
      <div className="bg-surface rounded-none border border-line border-t-4 border-t-ac max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cabecera institucional limpia */}
        <div className="bg-surface border-b border-line px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="kick text-[10px] font-bold text-ac tracking-wider mb-0.5">
              ESTADÍSTICAS Y FIDELIZACIÓN
            </p>
            <h3 className="text-lg sm:text-xl font-display font-bold text-ink leading-tight truncate">
              Clientes destacados
            </h3>
            <p className="text-xs text-muted truncate">
              Rankings basados en pedidos en línea entregados
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 flex items-center justify-center border border-line text-muted hover:text-ac hover:border-acline hover:bg-acsoft/20 transition-colors shrink-0 cursor-pointer"
          >
            <FAIcon icon="times" size="sm" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          {/* Selector de período */}
          <div className="p-3 bg-surfalt/30 border border-line border-l-2 border-l-ac">
            <PeriodSelector
              value={period}
              onChange={handlePeriodChange}
              customRange={customRange}
              onCustomRangeChange={handleCustomRangeChange}
            />
          </div>

          {/* Pestañas de métrica con acento de color activo */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold border transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-ac text-white border-ac shadow-xs'
                    : 'bg-surface text-inkalt border-line hover:border-acline hover:text-ac'
                }`}
              >
                <FAIcon icon={t.icon} size="xs" />
                <span>{t.label}</span>
                {period
                  ? ` (${PERIOD_HINTS[period] || period})`
                  : t.defaultHint
                  ? ` (${t.defaultHint})`
                  : ''}
              </button>
            ))}
          </div>

          {/* Lista de posiciones con borde rojo sutil y hover */}
          {loading ? (
            <div className="p-8 bg-surfalt/20 border border-line text-center text-xs text-muted">
              Cargando ranking de clientes...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 bg-surfalt/20 border border-line text-center text-xs text-muted">
              Todavía no hay suficientes pedidos registrados para este ranking.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row, idx) => {
                if (isOrderList) {
                  return (
                    <Row
                      key={row._id}
                      rank={idx + 1}
                      name={clientName(row.customer)}
                      email={row.customer?.loginInfo?.email}
                      primary={`$${Number(row.total || 0).toFixed(2)}`}
                      secondary={
                        row.createdAt ? new Date(row.createdAt).toLocaleDateString('es-SV') : ''
                      }
                    />
                  );
                }
                return (
                  <Row
                    key={row.customer?._id || idx}
                    rank={idx + 1}
                    name={clientName(row.customer)}
                    email={row.customer?.loginInfo?.email}
                    primary={
                      tab === 'mostActive'
                        ? `${row.orderCount} pedidos`
                        : `$${Number(row.totalSpent || 0).toFixed(2)}`
                    }
                    secondary={
                      tab === 'mostActive'
                        ? `$${Number(row.totalSpent || 0).toFixed(2)} gastado`
                        : `${row.orderCount} pedidos`
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="px-5 sm:px-6 py-3 border-t border-line bg-surface flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-display font-semibold text-inkalt hover:text-ac hover:border-acline border border-line bg-surfalt hover:bg-acsoft/20 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientLeaderboardModal;
