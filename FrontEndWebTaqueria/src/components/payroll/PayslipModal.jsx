// src/components/payroll/PayslipModal.jsx
//
// Boleta de pago de un empleado: el comprobante individual que se le entrega,
// con el desglose de lo devengado contra lo deducido. Se abre desde la fila
// del empleado en la pantalla de Planilla.
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import FormModal, { FormSection, ModalAvatar, ReadField, FORM_LABEL } from '../commons/FormModal';
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

  const employee = payslip?.employee;
  const workDays = new Set(employee?.workDays || []);

  return (
    <FormModal
      avatar={<ModalAvatar image={employee?.image} name={employeeName || employee?.name || ''} />}
      title="Boleta de pago"
      badge={formatPeriodLabel(period)}
      badgeTone="muted"
      subtitle={employeeName || employee?.name}
      onClose={onClose}
      cancelLabel="Cerrar"
      footerNote={payslip ? 'Documento generado desde la planilla general' : undefined}
      footerExtra={payslip && (
        <>
          <ReportButton
            title={`Boleta ${employee.name}`}
            subtitle={`Período: ${formatPeriodLabel(period)}`}
            columns={payslipReportColumns}
            rows={reportRows}
            itemTag="concepto"
            summary={[
              { label: 'Empleado', value: employee.name },
              { label: 'Puesto', value: employee.typeLabel },
              { label: 'Neto a pagar', value: money(payslip.netSalary) },
            ]}
          />
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-4 py-2 text-xs sm:text-sm font-display font-semibold text-white bg-ac hover:bg-ac/90 rounded-lg transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            <FAIcon icon="file-pdf" size="xs" />
            <span>Descargar boleta</span>
          </button>
        </>
      )}
    >
      {loading ? (
        <p className="text-sm text-muted text-center py-10">Generando boleta...</p>
      ) : error ? (
        <div className="bg-white dark:bg-surface border border-ac/30 rounded-xl p-4 text-sm text-ac flex items-center gap-2">
          <FAIcon icon="circle-exclamation" />
          {error}
        </div>
      ) : payslip ? (
        <>
          {/* SECCIÓN 1: Datos del empleado */}
          <FormSection icon="user" title="Datos del empleado">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
              <ReadField label="Nombre" value={employee.name} />
              <ReadField label="Puesto" value={employee.typeLabel} />
              <ReadField label="DUI / NIT" value={employee.duiNit} mono />
              <ReadField label="Horario" value={employee.schedule} />
              <div className="sm:col-span-2">
                <p className={FORM_LABEL}>Días que trabaja</p>
                <div className="grid grid-cols-7 gap-1.5 mt-1.5">
                  {Object.entries(DAY_ABBR).map(([day, label]) => (
                    <span
                      key={day}
                      className={`py-1.5 text-xs font-display font-semibold rounded-full border text-center ${
                        workDays.has(day) ? 'bg-ac text-white border-ac shadow-2xs' : 'bg-white dark:bg-surface text-muted border-line'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FormSection>

          {/* SECCIÓN 2: Ingresos */}
          <FormSection icon="money-bill-wave" title="Ingresos">
            <Line label="Salario base" value={payslip.earnings.salary} bold />
            <p className="text-[11px] text-muted mt-1">
              Los bonos no aparecen aquí: se documentan en la Planilla de bonos, sin descuentos de ley.
            </p>
          </FormSection>

          {/* SECCIÓN 3: Deducciones */}
          <FormSection icon="receipt" title="Deducciones de ley">
            <Line label="AFP" hint="7.25% del salario base" value={payslip.deductions.afp} negative />
            <Line label="ISSS" hint="3% del salario base, tope $30" value={payslip.deductions.isss} negative />
            <Line
              label="Renta (ISR)"
              hint={`Base gravada ${money(payslip.deductions.taxableBase)}`}
              value={payslip.deductions.isr}
              negative
            />
            <Line label="Total deducciones" value={payslip.deductions.total} negative bold />
          </FormSection>

          {/* Neto a pagar */}
          <div className="rounded-xl bg-ac text-white px-5 py-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[11px] font-semibold tracking-wide uppercase text-white/80">Neto a pagar</p>
              <p className="text-xs text-white/70 mt-0.5">Salario base menos deducciones de ley</p>
            </div>
            <span className="text-2xl font-display font-bold tabular-nums">{money(payslip.netSalary)}</span>
          </div>

          {/* Si no se le retuvo renta, conviene explicar por qué: es la
              duda más común al revisar una boleta. */}
          {payslip.deductions.isr === 0 && (
            <div className="bg-white dark:bg-surface border border-line rounded-xl p-3.5 flex items-start gap-2.5 text-[11.5px] text-muted">
              <FAIcon icon="circle-info" size="xs" className="mt-0.5 shrink-0" />
              <p>
                No se retiene renta porque la base gravada ({money(payslip.deductions.taxableBase)}) no
                supera el mínimo exento de $550 que establece la tabla de retención mensual.
              </p>
            </div>
          )}
        </>
      ) : null}
    </FormModal>
  );
};

export default PayslipModal;
