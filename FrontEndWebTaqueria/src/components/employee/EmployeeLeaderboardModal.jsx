// src/components/employee/EmployeeLeaderboardModal.jsx
import React, { useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import PeriodSelector from '../commons/PeriodSelector';

const employeeName = (emp) => `${emp?.personalInfo?.name || ''} ${emp?.personalInfo?.lastname || ''}`.trim() || 'Empleado';

const EmployeeLeaderboardModal = ({
  isOpen, onClose, topEmployees, period, loading, onOpen, onPeriodChange,
  customRange, onCustomRangeChange,
}) => {
  useEffect(() => {
    if (isOpen) onOpen?.(period, customRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePeriodChange = (nextPeriod) => onPeriodChange(nextPeriod, customRange);
  const handleCustomRangeChange = (nextRange) => {
    onCustomRangeChange(nextRange);
    // Si ambas fechas ya están puestas, se vuelve a consultar de inmediato
    // con el rango recién editado (no con el que quedó en el estado, que
    // todavía no se actualizó cuando corre este mismo callback).
    if (nextRange.from && nextRange.to) onPeriodChange('custom', nextRange);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none border border-line max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-white font-display font-bold text-lg">Empleados destacados</h3>
            <p className="text-white/80 text-xs">Empleado con más ventas (pedidos locales entregados)</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10">
            <FAIcon icon="times" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-4">
            <PeriodSelector
              value={period}
              onChange={handlePeriodChange}
              customRange={customRange}
              onCustomRangeChange={handleCustomRangeChange}
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted text-center py-8">Cargando ranking...</p>
          ) : topEmployees.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Todavía no hay ventas registradas en este periodo</p>
          ) : (
            <div className="space-y-2">
              {topEmployees.map((row, idx) => (
                <div key={row.employee?._id || idx} className="flex items-center gap-3 bg-surface rounded-none border border-line p-3">
                  <span className="w-7 h-7 rounded-full bg-ac text-white text-xs font-display font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {row.employee?.personalInfo?.image ? (
                    <img src={row.employee.personalInfo.image} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-line flex items-center justify-center text-muted text-xs font-display font-bold shrink-0">
                      {employeeName(row.employee).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-ink text-sm truncate">{employeeName(row.employee)}</p>
                    <p className="text-xs text-muted truncate">{row.orderCount} pedidos entregados</p>
                  </div>
                  <p className="font-display font-bold text-ac text-sm shrink-0">${Number(row.totalSales || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaderboardModal;
