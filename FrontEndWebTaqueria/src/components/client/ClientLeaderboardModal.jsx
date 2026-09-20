// src/components/client/ClientLeaderboardModal.jsx
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import PeriodSelector from '../commons/PeriodSelector';

// Etiquetas base de cada pestaña. El paréntesis con el período se agrega
// dinámicamente (ver periodLabelFor) solo mientras no hay un filtro
// explícito, para no decir "(7 días)" cuando el usuario ya eligió "Año".
const TABS = [
  { id: 'mostActive', label: 'Más activos', icon: 'bolt', defaultHint: '7 días' },
  { id: 'topSpenders', label: 'Mayor gasto total', icon: 'sack-dollar', defaultHint: null },
  { id: 'priciestWeek', label: 'Compras más caras', icon: 'receipt', defaultHint: 'semana' },
];

const PERIOD_HINTS = {
  day: 'hoy', week: 'semana', month: 'mes', year: 'año', all: 'todo', custom: 'rango elegido',
};

const clientName = (customer) =>
  `${customer?.personalInfo?.name || ''} ${customer?.personalInfo?.lastname || ''}`.trim() || 'Cliente';

const Row = ({ rank, name, email, primary, secondary }) => (
  <div className="flex items-center gap-3 bg-surface rounded-none border border-line p-3">
    <span className="w-7 h-7 rounded-full bg-ac text-white text-xs font-display font-bold flex items-center justify-center shrink-0">
      {rank}
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-display font-semibold text-ink text-sm truncate">{name}</p>
      <p className="text-xs text-muted truncate">{email}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="font-display font-bold text-ac text-sm">{primary}</p>
      {secondary && <p className="text-xs text-muted">{secondary}</p>}
    </div>
  </div>
);

const ClientLeaderboardModal = ({
  isOpen, onClose, mostActive, topSpenders, priciestWeek, loading, onOpen,
  period, onPeriodChange, customRange, onCustomRangeChange,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none border border-line max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-white font-display font-bold text-lg">Clientes destacados</h3>
            <p className="text-white/80 text-xs">Rankings basados en pedidos en línea entregados</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10">
            <FAIcon icon="times" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Filtro de período: aplica a las tres pestañas a la vez. Sin
              tocarlo, cada pestaña sigue usando el mismo rango de siempre
              (7 días para "más activos", histórico para "mayor gasto",
              semana en curso para "compras más caras") — el backend decide
              esos valores por defecto cuando no se manda "period". */}
          <div className="mb-4">
            <PeriodSelector
              value={period}
              onChange={handlePeriodChange}
              customRange={customRange}
              onCustomRangeChange={handleCustomRangeChange}
            />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
                  tab === t.id ? 'bg-ac text-white' : 'bg-surfalt text-inkalt hover:bg-line'
                }`}
              >
                <FAIcon icon={t.icon} size="xs" />
                {t.label}
                {period ? ` (${PERIOD_HINTS[period] || period})` : (t.defaultHint ? ` (${t.defaultHint})` : '')}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted text-center py-8">Cargando ranking...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Todavía no hay suficientes pedidos para este ranking</p>
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
                      secondary={row.createdAt ? new Date(row.createdAt).toLocaleDateString('es-SV') : ''}
                    />
                  );
                }
                return (
                  <Row
                    key={row.customer?._id || idx}
                    rank={idx + 1}
                    name={clientName(row.customer)}
                    email={row.customer?.loginInfo?.email}
                    primary={tab === 'mostActive' ? `${row.orderCount} pedidos` : `$${Number(row.totalSpent || 0).toFixed(2)}`}
                    secondary={tab === 'mostActive' ? `$${Number(row.totalSpent || 0).toFixed(2)} gastado` : `${row.orderCount} pedidos`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientLeaderboardModal;
