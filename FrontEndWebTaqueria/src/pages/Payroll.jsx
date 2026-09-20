// src/pages/Payroll.jsx
import React, { useState, useMemo } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import FAIcon from '../components/commons/FAIcon';
import Select from '../components/commons/Select';
import ComboStats from '../components/dashboard/ComboStats';
import PaginationControls from '../components/commons/PaginationControls';
import usePayroll, { formatPeriodLabel, getCurrentPeriod } from '../hooks/usePayroll';
import useBonusPayroll from '../hooks/useBonusPayroll';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider } from '../components/commons/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import { payrollReportColumns, bonusPayrollReportColumns } from '../constants/reportConfigs';
import PayslipModal from '../components/payroll/PayslipModal';

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

const BADGE_BY_TYPE = {
  Gerente: 'bg-surfalt text-inkalt border border-line',
  Cocina: 'bg-infosoft text-info border border-info',
  Cajero: 'bg-infosoft text-info border border-info',
};

// Las dos planillas del apartado. Van separadas porque el bono es un pago
// discrecional del dueño (una gratificación puntual, no una comisión ni
// bonificación pactada), así que no forma parte del salario cotizable: no
// debe arrastrar renta, AFP ni ISSS a nadie solo por recibirlo.
const TABS = [
  { id: 'general', label: 'Planilla general', icon: 'money-bill' },
  { id: 'bonuses', label: 'Planilla de bonos', icon: 'gift' },
];

function PayrollContent() {
  const [activeMenu] = useState('payroll');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');

  const general = usePayroll(getCurrentPeriod());
  const bonuses = useBonusPayroll(general.period);

  // Boleta individual: se abre desde la fila del empleado, solo en la
  // planilla general (la de bonos no lleva descuentos que documentar).
  const [payslipTarget, setPayslipTarget] = useState(null);

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  // Cada pestaña filtra sobre su propia fuente de datos, pero comparten
  // período y estado: cambiarlos en una pestaña afecta a ambas, para que no
  // se puedan desincronizar (ej. ver septiembre en una y agosto en la otra).
  const active = tab === 'general' ? general : bonuses;

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return active.rows;
    const term = searchTerm.toLowerCase();
    return active.rows.filter((row) => row.name.toLowerCase().includes(term));
  }, [active.rows, searchTerm]);

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredRows, 8);

  // Al cambiar de pestaña se limpia la búsqueda; usePagination ya reajusta
  // la página sola si la nueva lista es más corta que la página actual.
  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                  Planilla
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  {tab === 'general'
                    ? 'Salarios y descuentos de ley del personal por período.'
                    : 'Bonos asignados al personal por período, sin descuentos de ley.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {tab === 'general' ? (
                  <ReportButton
                    title={`Planilla ${formatPeriodLabel(general.period)}`}
                    columns={payrollReportColumns}
                    rows={general.rows}
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
                    rows={bonuses.rows}
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

            {/* Selector de planilla */}
            <div className="flex gap-2 mb-6 sm:mb-8">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-none text-sm font-display font-semibold transition-colors ${
                    tab === t.id
                      ? 'bg-ac text-white'
                      : 'bg-surface text-inkalt border border-line hover:bg-surfalt'
                  }`}
                >
                  <FAIcon icon={t.icon} size="sm" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Resumen del período */}
            {tab === 'general' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
                <ComboStats
                  icon="users"
                  title="EMPLEADOS"
                  value={general.loading ? '—' : String(general.rows.length)}
                  label={`En la planilla de ${formatPeriodLabel(general.period)}`}
                />
                <ComboStats
                  icon="money-bill"
                  title="SALARIO BRUTO"
                  value={general.loading ? '—' : money(general.totals?.grossSalary)}
                  label="Suma de los salarios base"
                />
                <ComboStats
                  icon="scissors"
                  title="DESCUENTOS"
                  value={general.loading ? '—' : money(general.totals?.totalDeductions)}
                  label="AFP + ISSS + Renta"
                />
                <ComboStats
                  icon="hand-holding-dollar"
                  title="TOTAL A PAGAR"
                  value={general.loading ? '—' : money(general.totals?.netSalary)}
                  label="Salario neto, sin bonos"
                  highlighted={true}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
                <ComboStats
                  icon="users"
                  title="EMPLEADOS"
                  value={bonuses.loading ? '—' : String(bonuses.totals?.employeeCount ?? bonuses.rows.length)}
                  label={`En la planilla de ${formatPeriodLabel(bonuses.period)}`}
                />
                <ComboStats
                  icon="gift"
                  title="CON BONO ASIGNADO"
                  value={bonuses.loading ? '—' : String(bonuses.totals?.employeesWithBonus ?? 0)}
                  label="Empleados que reciben bono este período"
                />
                <ComboStats
                  icon="hand-holding-dollar"
                  title="TOTAL EN BONOS"
                  value={bonuses.loading ? '—' : money(bonuses.totals?.totalBonus)}
                  label="Sin descuentos de ley"
                  highlighted={true}
                />
              </div>
            )}

            {/* Tabla de planilla */}
            <div className="bg-surface rounded-none border border-line overflow-hidden">
              <div className="p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line">
                <h2 className="text-lg font-display font-bold text-ink">
                  {tab === 'general' ? 'Detalle de' : 'Bonos de'} {formatPeriodLabel(active.period)}
                </h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline text-sm text-inkalt placeholder:text-muted"
                  />

                  <Select
                    value={general.period}
                    onChange={(e) => {
                      general.setPeriod(e.target.value);
                      bonuses.setPeriod(e.target.value);
                    }}
                  >
                    {periodOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>

                  <Select
                    value={general.status}
                    onChange={(e) => {
                      general.setStatus(e.target.value);
                      bonuses.setStatus(e.target.value);
                    }}
                  >
                    <option value="active">Solo activos</option>
                    <option value="all">Todos</option>
                  </Select>
                </div>
              </div>

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
                      <tr className="bg-surfalt/80 text-xs font-display font-semibold text-muted uppercase tracking-wider border-b border-line">
                        <th className="p-3 sm:p-4 pl-4 sm:pl-6">Empleado</th>
                        <th className="p-3 sm:p-4">Puesto</th>
                        <th className="p-3 sm:p-4 text-right">Salario base</th>
                        <th className="p-3 sm:p-4 text-right">AFP</th>
                        <th className="p-3 sm:p-4 text-right">ISSS</th>
                        <th className="p-3 sm:p-4 text-right">Renta</th>
                        <th className="p-3 sm:p-4 text-right">Neto a pagar</th>
                        <th className="p-3 sm:p-4 pr-4 sm:pr-6 text-center">Boleta</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-line text-sm text-inkalt">
                      {paginatedItems.map((row) => {
                        const isInactive = row.status !== 'active';

                        return (
                          <tr
                            key={row.employeeId}
                            className={`hover:bg-surfalt/80 transition-colors ${isInactive ? 'opacity-60 bg-surfalt/30' : ''}`}
                          >
                            <td className="p-3 sm:p-4 pl-4 sm:pl-6">
                              <div className="flex items-center gap-3">
                                {row.image ? (
                                  <img src={row.image} alt={row.name} className="w-9 h-9 rounded-none object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-none bg-surfalt flex items-center justify-center text-muted">
                                    <FAIcon icon="user" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-display font-bold text-ink">{row.name}</div>
                                  {isInactive && (
                                    <div className="text-xs text-ac font-medium">Inactivo</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3 sm:p-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-semibold ${BADGE_BY_TYPE[row.typeLabel] || 'bg-warnsoft text-warn border border-warn'}`}>
                                {row.typeLabel}
                              </span>
                            </td>

                            <td className="p-3 sm:p-4 text-right font-medium">{money(row.grossSalary)}</td>
                            <td className="p-3 sm:p-4 text-right text-muted">-{money(row.afp)}</td>
                            <td className="p-3 sm:p-4 text-right text-muted">-{money(row.isss)}</td>
                            {/* Siempre se muestra el monto, aunque sea $0: un
                                "—" aquí se podía confundir con que la renta no
                                se estaba calculando en absoluto. */}
                            <td className="p-3 sm:p-4 text-right text-muted">-{money(row.isr)}</td>
                            <td className="p-3 sm:p-4 text-right font-display font-bold text-ink">
                              {money(row.netSalary)}
                            </td>
                            <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-center">
                              <button
                                type="button"
                                onClick={() => setPayslipTarget({ id: row.employeeId, name: row.name })}
                                title={`Ver boleta de pago de ${row.name}`}
                                aria-label={`Ver boleta de pago de ${row.name}`}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-none border border-line text-muted hover:bg-surfalt hover:text-ac transition-colors"
                              >
                                <FAIcon icon="receipt" size="sm" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Totales del período: siempre sobre la planilla completa,
                        no sobre lo que quedó visible tras filtrar o paginar. */}
                    {general.totals && (
                      <tfoot>
                        <tr className="bg-surfalt/80 border-t-2 border-line text-sm font-display font-bold text-ink">
                          <td className="p-3 sm:p-4 pl-4 sm:pl-6" colSpan={2}>
                            TOTALES ({general.rows.length})
                          </td>
                          <td className="p-3 sm:p-4 text-right">{money(general.totals.grossSalary)}</td>
                          <td className="p-3 sm:p-4 text-right">-{money(general.totals.afp)}</td>
                          <td className="p-3 sm:p-4 text-right">-{money(general.totals.isss)}</td>
                          <td className="p-3 sm:p-4 text-right">-{money(general.totals.isr)}</td>
                          <td className="p-3 sm:p-4 text-right text-ac">
                            {money(general.totals.netSalary)}
                          </td>
                          <td className="p-3 sm:p-4 pr-4 sm:pr-6" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[560px]">
                    <thead>
                      <tr className="bg-surfalt/80 text-xs font-display font-semibold text-muted uppercase tracking-wider border-b border-line">
                        <th className="p-3 sm:p-4 pl-4 sm:pl-6">Empleado</th>
                        <th className="p-3 sm:p-4">Puesto</th>
                        <th className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">Bono asignado</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-line text-sm text-inkalt">
                      {paginatedItems.map((row) => {
                        const isInactive = row.status !== 'active';

                        return (
                          <tr
                            key={row.employeeId}
                            className={`hover:bg-surfalt/80 transition-colors ${isInactive ? 'opacity-60 bg-surfalt/30' : ''}`}
                          >
                            <td className="p-3 sm:p-4 pl-4 sm:pl-6">
                              <div className="flex items-center gap-3">
                                {row.image ? (
                                  <img src={row.image} alt={row.name} className="w-9 h-9 rounded-none object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-none bg-surfalt flex items-center justify-center text-muted">
                                    <FAIcon icon="user" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-display font-bold text-ink">{row.name}</div>
                                  {isInactive && (
                                    <div className="text-xs text-ac font-medium">Inactivo</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3 sm:p-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-semibold ${BADGE_BY_TYPE[row.typeLabel] || 'bg-warnsoft text-warn border border-warn'}`}>
                                {row.typeLabel}
                              </span>
                            </td>

                            <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-right font-display font-bold text-ink">
                              {row.bonus > 0 ? money(row.bonus) : <span className="text-muted font-normal">Sin bono</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {bonuses.totals && (
                      <tfoot>
                        <tr className="bg-surfalt/80 border-t-2 border-line text-sm font-display font-bold text-ink">
                          <td className="p-3 sm:p-4 pl-4 sm:pl-6" colSpan={2}>
                            TOTALES ({bonuses.totals.employeeCount})
                          </td>
                          <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-right text-ac">
                            {money(bonuses.totals.totalBonus)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>

              {totalPages > 1 && (
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  onPrev={prev}
                  onNext={next}
                  onGoTo={goTo}
                />
              )}
            </div>

            <p className="mt-4 text-xs text-muted">
              {tab === 'general' ? (
                <>
                  AFP (7.25%), ISSS (3%, con tope de $30) y renta se calculan solo sobre el salario base
                  del empleado. Los bonos no afectan esta planilla ni sus descuentos: se documentan
                  aparte, en la Planilla de bonos.
                </>
              ) : (
                <>
                  El bono es un pago discrecional del dueño (una gratificación puntual, no una comisión
                  ni una bonificación pactada como parte regular del contrato), así que no forma parte
                  del salario cotizable: no lleva AFP, ISSS ni renta.
                </>
              )}
            </p>
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
