// src/pages/Payroll.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import FAIcon from '../components/commons/FAIcon';
import PaginationControls from '../components/commons/PaginationControls';
import usePayroll, { formatPeriodLabel, getCurrentPeriod } from '../hooks/usePayroll';
import useBonusPayroll from '../hooks/useBonusPayroll';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider } from '../components/commons/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import { payrollReportColumns, bonusPayrollReportColumns } from '../constants/reportConfigs';
import PayslipModal from '../components/payroll/PayslipModal';
import AdminTabs from '../components/commons/AdminTabs';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

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


function PayrollContent() {
  const [activeMenu] = useState('payroll');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

  // Identificar pestaña activa según query param
  const tabQuery = searchParams.get('tab');
  const tab = tabQuery === 'bonuses' ? 'bonuses' : 'general';
  const currentTabId = tab === 'bonuses' ? 'payroll_bonuses' : 'payroll_general';

  const general = usePayroll(getCurrentPeriod());
  const bonuses = useBonusPayroll(general.period);

  // Boleta individual: se abre desde la fila del empleado, solo en la
  // planilla general (la de bonos no lleva descuentos que documentar).
  const [payslipTarget, setPayslipTarget] = useState(null);

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  // Al cambiar de pestaña se limpia el término de búsqueda
  useEffect(() => {
    setSearchTerm('');
  }, [tab]);

  // Cada pestaña filtra sobre su propia fuente de datos, pero comparten
  // período y estado: cambiarlos en una pestaña afecta a ambas.
  const active = tab === 'general' ? general : bonuses;

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return active.rows;
    const term = searchTerm.toLowerCase();
    return active.rows.filter((row) => row.name.toLowerCase().includes(term));
  }, [active.rows, searchTerm]);

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredRows, 10);

  // Formato para el Hero Stat de Planilla General
  const [netSalaryInt, netSalaryDec] = useMemo(() => {
    const val = Number(general.totals?.netSalary || 0);
    const formatted = val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const parts = formatted.split('.');
    return [parts[0], parts[1] || '00'];
  }, [general.totals?.netSalary]);

  // Formato para el Hero Stat de Planilla de Bonos
  const [totalBonusInt, totalBonusDec] = useMemo(() => {
    const val = Number(bonuses.totals?.totalBonus || 0);
    const formatted = val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const parts = formatted.split('.');
    return [parts[0], parts[1] || '00'];
  }, [bonuses.totals?.totalBonus]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-surface border border-line p-5 sm:p-7 lg:p-8">
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                    Personal
                  </h1>
                  <p className="text-sm text-muted">
                    {tab === 'general'
                      ? 'Salarios, retenciones de ley y liquidaciones del personal por período.'
                      : 'Bonificaciones extraordinarias y reconocimientos monetarios asignados.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {tab === 'general' ? (
                    <ReportButton
                      title={`Planilla ${formatPeriodLabel(general.period)}`}
                      columns={payrollReportColumns}
                      rows={filteredRows}
                      getImageUrl={(r) => r.image}
                      itemTag="empleado"
                      summary={general.totals ? [
                        { label: 'Empleados', value: general.rows.length },
                        { label: 'Salario bruto', value: money(general.totals.grossSalary) },
                        { label: 'Descuentos', value: money(general.totals.totalDeductions) },
                        { label: 'Total a pagar', value: money(general.totals.netSalary) },
                      ] : undefined}
                    />
                  ) : (
                    <ReportButton
                      title={`Planilla de bonos ${formatPeriodLabel(bonuses.period)}`}
                      columns={bonusPayrollReportColumns}
                      rows={filteredRows}
                      getImageUrl={(r) => r.image}
                      itemTag="empleado"
                      summary={bonuses.totals ? [
                        { label: 'Empleados', value: bonuses.totals.employeeCount },
                        { label: 'Con bono asignado', value: bonuses.totals.employeesWithBonus },
                        { label: 'Total en bonos', value: money(bonuses.totals.totalBonus) },
                      ] : undefined}
                    />
                  )}
                </div>
              </div>

              {/* Pestañas de navegación de Administración */}
              <AdminTabs activeTab={currentTabId} />

              {/* Resumen Hero de cifras principales */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-2">
                <div className="min-w-0">
                  <p className="kick text-[10.5px] font-bold text-ac tracking-wider mb-2">
                    {tab === 'general'
                      ? `TOTAL A PAGAR · ${formatPeriodLabel(general.period).toUpperCase()}`
                      : `TOTAL EN BONOS · ${formatPeriodLabel(bonuses.period).toUpperCase()}`}
                  </p>
                  <div className="text-4xl sm:text-5xl font-light text-ink tracking-tight mb-2 flex items-baseline">
                    <span>${tab === 'general' ? netSalaryInt : totalBonusInt}</span>
                    <span className="text-2xl text-muted font-normal ml-0.5">
                      .{tab === 'general' ? netSalaryDec : totalBonusDec}
                    </span>
                  </div>
                  <p className="text-xs text-muted max-w-md leading-relaxed">
                    {tab === 'general'
                      ? 'Suma de salarios netos a desembolsar tras aplicar deducciones de ley (AFP, ISSS y Renta). Los bonos no afectan estos cálculos.'
                      : 'Gratificaciones y estímulos económicos extraordinarios otorgados al personal durante el período, exentos de retenciones de ley.'}
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-8 sm:gap-12 shrink-0">
                  {tab === 'general' ? (
                    <>
                      <div className="border-t border-line pt-2.5 min-w-[120px] sm:min-w-[140px]">
                        <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                          EMPLEADOS EN PLANILLA
                        </p>
                        <p className="text-2xl sm:text-3xl font-light text-ink">
                          {general.loading ? '—' : general.rows.length}
                        </p>
                      </div>

                      <div className="border-t border-line pt-2.5 min-w-[120px] sm:min-w-[140px]">
                        <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                          SALARIO BRUTO
                        </p>
                        <p className="text-2xl sm:text-3xl font-light text-ink">
                          {general.loading ? '—' : money(general.totals?.grossSalary)}
                        </p>
                      </div>

                      <div className="border-t border-line pt-2.5 min-w-[120px] sm:min-w-[140px]">
                        <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                          TOTAL RETENCIONES
                        </p>
                        <p className="text-2xl sm:text-3xl font-light text-ink">
                          {general.loading ? '—' : money(general.totals?.totalDeductions)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="border-t border-line pt-2.5 min-w-[120px] sm:min-w-[140px]">
                        <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                          EMPLEADOS EN LISTA
                        </p>
                        <p className="text-2xl sm:text-3xl font-light text-ink">
                          {bonuses.loading ? '—' : (bonuses.totals?.employeeCount ?? bonuses.rows.length)}
                        </p>
                      </div>

                      <div className="border-t border-line pt-2.5 min-w-[120px] sm:min-w-[140px]">
                        <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                          CON BONO ASIGNADO
                        </p>
                        <p className="text-2xl sm:text-3xl font-light text-ink">
                          {bonuses.loading ? '—' : (bonuses.totals?.employeesWithBonus ?? 0)}
                        </p>
                      </div>

                      <div className="border-t border-line pt-2.5 min-w-[120px] sm:min-w-[140px]">
                        <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                          PROMEDIO POR BONO
                        </p>
                        <p className="text-2xl sm:text-3xl font-light text-ink">
                          {bonuses.loading || !bonuses.totals?.employeesWithBonus
                            ? '—'
                            : money(bonuses.totals.totalBonus / bonuses.totals.employeesWithBonus)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Cabecera de la tabla */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-base font-bold text-ink">
                  {tab === 'general' ? 'Detalle de planilla' : 'Detalle de bonos'} · {formatPeriodLabel(active.period)}
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
                    value={general.period}
                    onChange={(e) => {
                      general.setPeriod(e.target.value);
                      bonuses.setPeriod(e.target.value);
                    }}
                    className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink cursor-pointer"
                  >
                    {periodOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <select
                    value={general.status}
                    onChange={(e) => {
                      general.setStatus(e.target.value);
                      bonuses.setStatus(e.target.value);
                    }}
                    className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink cursor-pointer"
                  >
                    <option value="active">Solo activos</option>
                    <option value="all">Todos</option>
                  </select>
                </div>
              </div>

              {/* Tabla de planilla */}
              <div className="overflow-x-auto">
                {active.loading ? (
                  <div className="p-8 text-center text-muted text-sm">Calculando planilla...</div>
                ) : active.error ? (
                  <div className="p-8 text-center text-ac text-sm">{active.error}</div>
                ) : active.rows.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">
                    No hay empleados en la planilla de este período.
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">
                    Ningún empleado coincide con la búsqueda.
                  </div>
                ) : tab === 'general' ? (
                  <table className="w-full text-left border-collapse min-w-[860px]">
                    <thead>
                      <tr className="text-[10.5px] kick font-bold text-muted tracking-wider border-b border-line">
                        <th className="py-3 pr-4">EMPLEADO</th>
                        <th className="py-3 px-4">PUESTO</th>
                        <th className="py-3 px-4 text-right">SALARIO BASE</th>
                        <th className="py-3 px-4 text-right">AFP (7.25%)</th>
                        <th className="py-3 px-4 text-right">ISSS (3%)</th>
                        <th className="py-3 px-4 text-right">RENTA</th>
                        <th className="py-3 px-4 text-right">NETO A PAGAR</th>
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
                            <td className="py-3.5 px-4 text-right text-muted num text-[13px]">
                              -{money(row.afp)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-muted num text-[13px]">
                              -{money(row.isss)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-muted num text-[13px]">
                              -{money(row.isr)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-ink num text-[13.5px] font-bold">
                              {money(row.netSalary)}
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
                    {general.totals && (
                      <tfoot>
                        <tr className="border-t-2 border-line text-sm font-display font-bold text-ink">
                          <td className="py-3.5 pr-4 kick text-[10.5px] tracking-wider" colSpan={2}>
                            TOTALES DEL PERÍODO ({general.rows.length})
                          </td>
                          <td className="py-3.5 px-4 text-right num text-ink font-bold">
                            {money(general.totals.grossSalary)}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted font-normal">
                            -{money(general.totals.afp)}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted font-normal">
                            -{money(general.totals.isss)}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted font-normal">
                            -{money(general.totals.isr)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-ac num font-bold">
                            {money(general.totals.netSalary)}
                          </td>
                          <td className="py-3.5 pl-4" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[620px]">
                    <thead>
                      <tr className="text-[10.5px] kick font-bold text-muted tracking-wider border-b border-line">
                        <th className="py-3 pr-4">EMPLEADO</th>
                        <th className="py-3 px-4">PUESTO</th>
                        <th className="py-3 px-4">ESTADO</th>
                        <th className="py-3 pl-4 text-right">BONO ASIGNADO</th>
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

                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${!isInactive ? 'text-ok' : 'text-muted'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${!isInactive ? 'bg-ok' : 'bg-muted'}`} />
                                {!isInactive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>

                            <td className="py-3.5 pl-4 text-right font-medium text-ink num text-[13.5px]">
                              {row.bonus > 0 ? (
                                <span className="font-bold text-ink">{money(row.bonus)}</span>
                              ) : (
                                <span className="text-muted text-xs">Sin bono</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {bonuses.totals && (
                      <tfoot>
                        <tr className="border-t-2 border-line text-sm font-display font-bold text-ink">
                          <td className="py-3.5 pr-4 kick text-[10.5px] tracking-wider" colSpan={3}>
                            TOTALES DEL PERÍODO ({bonuses.totals.employeeCount ?? bonuses.rows.length})
                          </td>
                          <td className="py-3.5 pl-4 text-right text-ac num font-bold">
                            {money(bonuses.totals.totalBonus)}
                          </td>
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
                {tab === 'general' ? (
                  <>
                    AFP (7.25%), ISSS (3%, con tope de $30) y Renta de ley se calculan sobre el salario base de cada empleado en Taquería El Corral. Las asignaciones de bonos no sufren retenciones y se administran en la pestaña de Planilla de Bonos.
                  </>
                ) : (
                  <>
                    El bono es una gratificación discrecional mensual que no forma parte del salario ordinario ni devenga retenciones legales (AFP, ISSS, Renta). Para consultar el salario y deducciones de ley, diríjase a Planilla General.
                  </>
                )}
              </p>
            </div>
          </div>
        </main>
      </div>

      <PayslipModal
        isOpen={Boolean(payslipTarget)}
        onClose={() => setPayslipTarget(null)}
        employeeId={payslipTarget?.id}
        employeeName={payslipTarget?.name}
        period={general.period}
        fetchPayslip={general.fetchPayslip}
      />
    </div>
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
