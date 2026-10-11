// src/pages/Payroll.jsx
import React, { useState, useMemo } from 'react';
import PageShell from '../components/commons/PageShell';
import { useAdminTabs } from '../hooks/useSectionTabs';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import PaginationControls from '../components/commons/PaginationControls';
import usePayroll, { formatPeriodLabel, getCurrentPeriod } from '../hooks/usePayroll';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider } from '@syscor/web-shared/src/components/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import { payrollReportColumns } from '../constants/reportConfigs';
import PayslipModal from '../components/payroll/PayslipModal';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const formatDate = (d) => new Date(d).toLocaleDateString('es-SV', { day: 'numeric', month: 'short' });

// Los últimos 12 meses como opciones del selector de período. Se generan
// desde la fecha actual en vez de tener una lista fija, para que la pantalla
// no quede desactualizada con el paso del tiempo.
const buildPeriodOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: formatPeriodLabel(value) });
  }
  return options;
};

const getInitials = (name) => {
  if (!name) return 'E';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

// Cifra secundaria del resumen superior.
const Stat = ({ label, value }) => (
  <div className="border-t border-line pt-2.5 min-w-[120px] sm:min-w-[140px]">
    <p className="kick text-muted mb-1.5">{label}</p>
    <p className="num text-2xl sm:text-3xl text-ink font-light">{value}</p>
  </div>
);

function PayrollContent() {
  const [activeMenu] = useState('payroll');
  const adminTabs = useAdminTabs('payroll');
  const [searchTerm, setSearchTerm] = useState('');

  // Una sola planilla: salario, descuentos de ley, bono y total a pagar.
  const payroll = usePayroll(getCurrentPeriod());
  const { rows, totals, loading, error, period } = payroll;

  // Boleta individual: se abre desde la fila del empleado.
  const [payslipTarget, setPayslipTarget] = useState(null);

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) => row.name.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredRows, 10);

  // Formato para el Hero Stat: entero y centavos por separado.
  const [netPayInt, netPayDec] = useMemo(() => {
    const formatted = Number(totals?.netPay || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const parts = formatted.split('.');
    return [parts[0], parts[1] || '00'];
  }, [totals?.netPay]);

  return (
    <>
      <PageShell
        activeMenu={activeMenu}
        title="Administración"
        subtitle="Salarios, bonos, retenciones de ley y liquidaciones del personal por período."
        tabs={adminTabs}
        tabsLabel="Secciones de administración"
        actions={
          <ReportButton
            compact
            label="Exportar"
            title={`Planilla ${formatPeriodLabel(period)}`}
            columns={payrollReportColumns}
            rows={filteredRows}
            getImageUrl={(r) => r.image}
            itemTag="empleado"
            summary={totals ? [
              { label: 'Empleados', value: rows.length },
              { label: 'Salario bruto', value: money(totals.grossSalary) },
              { label: 'Bonos', value: money(totals.bonus) },
              { label: 'Descuentos', value: money(totals.totalDeductions) },
              { label: 'Total a pagar', value: money(totals.netPay) },
            ] : undefined}
          />
        }
      >

        {/* Resumen Hero de cifras principales */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-2">
          <div className="min-w-0">
            <p className="kick text-ac mb-2">
              {`TOTAL A PAGAR · ${formatPeriodLabel(period).toUpperCase()}`}
            </p>
            <div className="num text-4xl sm:text-5xl text-ink mb-2 flex items-baseline font-light">
              <span>${netPayInt}</span>
              <span className="num text-2xl text-muted ml-0.5 font-light">.{netPayDec}</span>
            </div>
            <p className="text-xs text-muted max-w-md leading-relaxed">
              Salarios netos tras las deducciones de ley (AFP, ISSS y Renta), más los bonos vigentes del período, que se pagan íntegros.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-8 sm:gap-12 shrink-0">
            <Stat label="EMPLEADOS EN PLANILLA" value={loading ? '—' : rows.length} />
            <Stat label="SALARIO BRUTO" value={loading ? '—' : money(totals?.grossSalary)} />
            <Stat
              label={`BONOS (${loading ? '—' : (totals?.employeesWithBonus ?? 0)})`}
              value={loading ? '—' : money(totals?.bonus)}
            />
            <Stat label="TOTAL RETENCIONES" value={loading ? '—' : money(totals?.totalDeductions)} />
          </div>
        </div>

        {/* Cabecera de la tabla */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-base font-bold text-ink">
            Detalle de planilla · {formatPeriodLabel(period)}
          </h2>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink placeholder:text-muted w-full sm:w-56"
            />

            <select
              value={period}
              onChange={(e) => payroll.setPeriod(e.target.value)}
              className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink cursor-pointer"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={payroll.status}
              onChange={(e) => payroll.setStatus(e.target.value)}
              className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink cursor-pointer"
            >
              <option value="active">Solo activos</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        {/* Tabla de planilla */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted text-sm">Calculando planilla...</div>
          ) : error ? (
            <div className="p-8 text-center text-ac text-sm">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              No hay empleados en la planilla de este período.
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              Ningún empleado coincide con la búsqueda.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="kick text-muted border-b border-line">
                  <th className="py-3 pr-4">EMPLEADO</th>
                  <th className="py-3 px-4">PUESTO</th>
                  <th className="py-3 px-4 text-right">SALARIO BASE</th>
                  <th className="py-3 px-4 text-right">BONO</th>
                  <th className="py-3 px-4 text-right">AFP (7.25%)</th>
                  <th className="py-3 px-4 text-right">ISSS (3%)</th>
                  <th className="py-3 px-4 text-right">RENTA</th>
                  <th className="py-3 px-4 text-right">TOTAL A PAGAR</th>
                  <th className="py-3 pl-4 text-center">BOLETA</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line/60 text-sm">
                {paginatedItems.map((row) => {
                  const isInactive = row.status !== 'active';
                  const initials = getInitials(row.name);

                  return (
                    <tr
                      key={row.employeeId}
                      className={`hover:bg-surfalt/40 transition-colors ${isInactive ? 'opacity-50' : ''}`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          {row.image ? (
                            <img
                              src={row.image}
                              alt={row.name}
                              className="w-7 h-7 object-cover border border-line shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="w-7 h-7 bg-surfalt border border-line flex items-center justify-center text-[10px] font-bold text-muted shrink-0"
                            style={{ display: row.image ? 'none' : 'flex' }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-ink text-[13.5px]">{row.name}</div>
                            {isInactive && (
                              <div className="text-[11px] text-ac font-medium">Inactivo</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[13px] text-inkalt">
                        {row.typeLabel || 'Empleado'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-ink num text-[13.5px]">
                        {money(row.grossSalary)}
                      </td>
                      <td className="py-3.5 px-4 text-right num text-[13px]">
                        {row.bonus > 0 ? (
                          <>
                            <div className="text-ok font-medium">+{money(row.bonus)}</div>
                            {row.bonusEndsAt && (
                              <div className="text-[10.5px] text-muted">hasta {formatDate(row.bonusEndsAt)}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted num text-[13px]">
                        -{money(row.afp)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted num text-[13px]">
                        -{money(row.isss)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted num text-[13px]">
                        -{money(row.isr)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-ink num text-[13.5px] font-bold">
                        {money(row.netPay)}
                      </td>
                      <td className="py-3.5 pl-4 text-center">
                        <button
                          type="button"
                          onClick={() => setPayslipTarget({ id: row.employeeId, name: row.name })}
                          title={`Ver boleta de pago de ${row.name}`}
                          aria-label={`Ver boleta de pago de ${row.name}`}
                          className="inline-flex items-center justify-center w-7 h-7 border border-line text-muted hover:border-ac hover:text-ac transition-colors"
                        >
                          <FAIcon icon="receipt" size="xs" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totales del período */}
              {totals && (
                <tfoot>
                  <tr className="border-t-2 border-line text-sm font-display font-bold text-ink">
                    <td className="py-3.5 pr-4 kick" colSpan={2}>
                      TOTALES DEL PERÍODO ({rows.length})
                    </td>
                    <td className="py-3.5 px-4 text-right num text-ink font-bold">
                      {money(totals.grossSalary)}
                    </td>
                    <td className="py-3.5 px-4 text-right num text-ok font-bold">
                      +{money(totals.bonus)}
                    </td>
                    <td className="py-3.5 px-4 text-right num text-muted font-normal">
                      -{money(totals.afp)}
                    </td>
                    <td className="py-3.5 px-4 text-right num text-muted font-normal">
                      -{money(totals.isss)}
                    </td>
                    <td className="py-3.5 px-4 text-right num text-muted font-normal">
                      -{money(totals.isr)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-ac num font-bold">
                      {money(totals.netPay)}
                    </td>
                    <td className="py-3.5 pl-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Paginación */}
        {filteredRows.length > 0 && totalPages > 1 && (
          <div className="pt-4 mt-2">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={prev}
              onNext={next}
              onGoTo={goTo}
            />
          </div>
        )}

        {/* Nota institucional al pie */}
        <p className="text-xs text-muted mt-6 leading-relaxed">
          AFP (7.25%), ISSS (3%, con tope de $30) y Renta de ley se calculan solo sobre el salario base de cada empleado en Taquería El Corral. El bono es una gratificación discrecional que no forma parte del salario ordinario: se suma íntegro al total a pagar mientras esté vigente, sin retenciones de ley.
        </p>
      </PageShell>

      <PayslipModal
        isOpen={Boolean(payslipTarget)}
        onClose={() => setPayslipTarget(null)}
        employeeId={payslipTarget?.id}
        employeeName={payslipTarget?.name}
        period={period}
        fetchPayslip={payroll.fetchPayslip}
      />
    </>
  );
}

// Igual que las demás pantallas con acciones, el contenido va envuelto en el
// proveedor de avisos para poder mostrar el resultado de la exportación.
export default function Payroll() {
  return (
    <ToastProvider>
      <PayrollContent />
    </ToastProvider>
  );
}
