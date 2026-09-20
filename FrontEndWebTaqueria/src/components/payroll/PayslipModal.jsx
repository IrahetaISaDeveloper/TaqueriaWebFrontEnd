// src/components/payroll/PayslipModal.jsx
//
// Boleta de pago de un empleado: el comprobante individual que se le entrega,
// con el desglose de lo devengado contra lo deducido. Se abre desde la fila
// del empleado en la pantalla de Planilla.
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import ReportButton from '../commons/ReportButton';
import { exportPayslipToPdf } from '../../utils/payslipPdf';
import { formatPeriodLabel } from '../../hooks/usePayroll';
import { useToast } from '../commons/ToastProvider';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const DAY_ABBR = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};

// Fila del desglose. "negative" pinta el monto en rojo con signo, para que
// se distinga de un vistazo lo que suma de lo que resta.
const Line = ({ label, value, negative = false, bold = false, hint }) => (
  <div className={`flex items-start justify-between gap-3 py-2 ${bold ? 'border-t border-line mt-1 pt-2.5' : ''}`}>
    <div className="min-w-0">
      <p className={`text-sm ${bold ? 'font-display font-bold text-ink' : 'text-inkalt'}`}>{label}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
    <p className={`shrink-0 text-sm tabular-nums ${bold ? 'font-display font-bold' : ''} ${negative ? 'text-ac' : 'text-ink'}`}>
      {negative ? `- ${money(value)}` : money(value)}
    </p>
  </div>
);

// Columnas del reporte de la boleta en XML/JSON. Se arma como un listado de
// conceptos (una fila por línea de la boleta) porque es lo que entiende el
// motor de reportes, y además así el archivo se lee igual que el documento.
const payslipReportColumns = [
  { header: 'Concepto', value: (r) => r.concepto },
  { header: 'Tipo', value: (r) => r.tipo },
  { header: 'Monto', value: (r) => r.monto, align: 'right' },
];

const PayslipModal = ({ isOpen, onClose, employeeId, employeeName, period, fetchPayslip }) => {
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen || !employeeId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPayslip(null);

    fetchPayslip(employeeId, period).then((result) => {
      // Si cerraron el modal o abrieron la boleta de otra persona mientras
      // cargaba, se descarta la respuesta para no mostrar datos cruzados.
      if (cancelled) return;

      if (result?.success) {
        setPayslip(result.payslip);
      } else {
        setError(result?.message || 'No se pudo cargar la boleta');
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, employeeId, period, fetchPayslip]);

  if (!isOpen) return null;

  const handleExportPdf = () => {
    try {
      exportPayslipToPdf(payslip);
      addToast('Boleta de pago generada correctamente', 'success');
    } catch (err) {
      console.error('Error al generar la boleta:', err);
      addToast('No se pudo generar la boleta', 'error');
    }
  };

  // Las mismas líneas del documento, para poder exportarlas en XML/JSON
  const reportRows = payslip ? [
    { concepto: 'Salario base', tipo: 'Ingreso', monto: payslip.earnings.salary },
    { concepto: 'AFP', tipo: 'Deduccion', monto: payslip.deductions.afp },
    { concepto: 'ISSS', tipo: 'Deduccion', monto: payslip.deductions.isss },
    { concepto: 'Renta (ISR)', tipo: 'Deduccion', monto: payslip.deductions.isr },
    { concepto: 'Total deducciones', tipo: 'Subtotal', monto: payslip.deductions.total },
    { concepto: 'Neto a pagar', tipo: 'Total', monto: payslip.netSalary },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none border border-line max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="min-w-0">
            <h3 className="text-white font-display font-bold text-lg truncate">Boleta de pago</h3>
            <p className="text-white/80 text-xs truncate">
              {employeeName} · {formatPeriodLabel(period)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10 shrink-0"
            aria-label="Cerrar"
          >
            <FAIcon icon="times" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <p className="text-sm text-muted text-center py-10">Generando boleta...</p>
          ) : error ? (
            <p className="text-sm text-ac text-center py-10">{error}</p>
          ) : payslip ? (
            <>
              {/* Identificación del empleado */}
              <div className="bg-surface rounded-none border border-line p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  {payslip.employee.image ? (
                    <img
                      src={payslip.employee.image}
                      alt={payslip.employee.name}
                      className="w-12 h-12 rounded-none object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-none bg-surfalt flex items-center justify-center text-muted">
                      <FAIcon icon="user" size="lg" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink truncate">{payslip.employee.name}</p>
                    <p className="text-xs text-muted">{payslip.employee.typeLabel}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-muted">DUI / NIT</span>
                    <p className="text-inkalt font-medium">{payslip.employee.duiNit || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted">Horario</span>
                    <p className="text-inkalt font-medium">{payslip.employee.schedule || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted">Días de trabajo</span>
                    <p className="text-inkalt font-medium">
                      {(payslip.employee.workDays || []).map((d) => DAY_ABBR[d] || d).join(', ') || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ingresos */}
              <div className="bg-surface rounded-none border border-line p-4 mb-3">
                <h4 className="text-xs font-display font-bold uppercase tracking-wide text-ok mb-1">
                  Ingresos
                </h4>
                <Line label="Salario base" value={payslip.earnings.salary} bold />
                <p className="text-[11px] text-muted mt-1">
                  Los bonos no aparecen aquí: se documentan en la Planilla de bonos, sin descuentos de ley.
                </p>
              </div>

              {/* Deducciones */}
              <div className="bg-surface rounded-none border border-line p-4 mb-4">
                <h4 className="text-xs font-display font-bold uppercase tracking-wide text-ac mb-1">
                  Deducciones de ley
                </h4>
                <Line label="AFP" hint="7.25% del salario base" value={payslip.deductions.afp} negative />
                <Line label="ISSS" hint="3% del salario base, tope $30" value={payslip.deductions.isss} negative />
                <Line
                  label="Renta (ISR)"
                  hint={`Base gravada ${money(payslip.deductions.taxableBase)}`}
                  value={payslip.deductions.isr}
                  negative
                />
                <Line label="Total deducciones" value={payslip.deductions.total} negative bold />
              </div>

              {/* Neto */}
              <div className="flex items-center justify-between px-5 py-4 bg-surface rounded-none border border-line mb-4">
                <span className="text-sm font-display font-bold text-inkalt">NETO A PAGAR</span>
                <span className="text-2xl font-display font-bold text-ac tabular-nums">
                  {money(payslip.netSalary)}
                </span>
              </div>

              {/* Si no se le retuvo renta, conviene explicar por qué: es la
                  duda más común al revisar una boleta. */}
              {payslip.deductions.isr === 0 && (
                <p className="text-[11px] text-muted mb-4 bg-surface rounded-none p-3 border border-line">
                  <FAIcon icon="circle-info" size="xs" className="text-muted mr-1" />
                  No se retiene renta porque la base gravada ({money(payslip.deductions.taxableBase)}) no
                  supera el mínimo exento de $550 que establece la tabla de retención mensual.
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ac text-white rounded-none text-sm font-display font-semibold hover:bg-ac transition-colors"
                >
                  <FAIcon icon="file-pdf" />
                  Descargar boleta
                </button>

                {/* Los otros formatos, por consistencia con el resto del sistema */}
                <ReportButton
                  title={`Boleta ${payslip.employee.name}`}
                  subtitle={`Período: ${formatPeriodLabel(period)}`}
                  columns={payslipReportColumns}
                  rows={reportRows}
                  itemTag="concepto"
                  summary={[
                    { label: 'Empleado', value: payslip.employee.name },
                    { label: 'Puesto', value: payslip.employee.typeLabel },
                    { label: 'Neto a pagar', value: money(payslip.netSalary) },
                  ]}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;
