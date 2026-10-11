// Boleta de pago individual (nómina de un empleado).
//
// A diferencia de payrollPdf.js, que saca la planilla completa en formato
// tabla, esto es el comprobante que se le entrega a UNA persona: lleva sus
// datos de identificación, el desglose de lo devengado contra lo deducido,
// el neto en grande y espacio para firma.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPeriodLabel } from '../hooks/usePayroll';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const DAY_ABBR = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};

/**
 * @param {Object} payslip La respuesta de /users/payroll/employee/:id
 */
export const exportPayslipToPdf = (payslip) => {
  if (!payslip) return;

  const { employee, earnings, deductions, netPay, period } = payslip;

  // Vertical: es un comprobante de una sola persona, no un listado.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const periodLabel = formatPeriodLabel(period);

  // --- Encabezado ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Taquería El Corral', 40, 50);

  doc.setFontSize(14);
  doc.text('Boleta de pago', 40, 72);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(`Período: ${periodLabel}`, 40, 90);
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text(
    `Emitida el ${new Date().toLocaleString('es-SV', { dateStyle: 'long', timeStyle: 'short' })}`,
    pageWidth - 40,
    90,
    { align: 'right' }
  );
  doc.setTextColor(0);

  // Línea separadora bajo el encabezado
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(2);
  doc.line(40, 100, pageWidth - 40, 100);

  // --- Datos del empleado ---
  const workDaysLabel = (employee.workDays || []).map((d) => DAY_ABBR[d] || d).join(', ');

  autoTable(doc, {
    startY: 118,
    head: [['Datos del empleado', '']],
    body: [
      ['Nombre', employee.name],
      ['Puesto', employee.typeLabel],
      ['DUI / NIT', employee.duiNit || '—'],
      ['Correo', employee.email || '—'],
      ['Horario', employee.schedule || '—'],
      ['Días de trabajo', workDaysLabel || '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [107, 114, 128], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 140, fillColor: [250, 250, 250] },
    },
  });

  // --- Devengado vs. deducido ---
  // Se muestran en una sola tabla, con el signo del monto marcando de qué
  // lado está cada concepto: es como se lee una boleta de pago real.
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Concepto', 'Monto']],
    body: [
      [{ content: 'INGRESOS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }],
      ['Salario base', money(earnings.salary)],
      ['Bono (exento de descuentos de ley)', money(earnings.bonus)],
      [
        { content: 'Total devengado', styles: { fontStyle: 'bold' } },
        { content: money(earnings.total), styles: { fontStyle: 'bold' } },
      ],

      [{ content: 'DEDUCCIONES DE LEY', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [153, 27, 27] } }],
      ['AFP (7.25% del salario base)', `- ${money(deductions.afp)}`],
      ['ISSS (3% del salario base, tope $30)', `- ${money(deductions.isss)}`],
      [`Renta / ISR (base gravada ${money(deductions.taxableBase)})`, `- ${money(deductions.isr)}`],
      [
        { content: 'Total deducciones', styles: { fontStyle: 'bold' } },
        { content: `- ${money(deductions.total)}`, styles: { fontStyle: 'bold' } },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 120 },
    },
  });

  // --- Total a pagar (salario neto + bono), destacado ---
  const netY = doc.lastAutoTable.finalY + 20;
  doc.setFillColor(243, 240, 235);
  doc.rect(40, netY, pageWidth - 80, 44, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('TOTAL A PAGAR', 56, netY + 27);

  doc.setFontSize(18);
  doc.setTextColor(220, 38, 38);
  doc.text(money(netPay), pageWidth - 56, netY + 28, { align: 'right' });
  doc.setTextColor(0);

  // --- Firmas ---
  const signY = netY + 110;
  doc.setDrawColor(150);
  doc.setLineWidth(0.5);

  doc.line(60, signY, 260, signY);
  doc.line(pageWidth - 260, signY, pageWidth - 60, signY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Firma del empleado', 160, signY + 14, { align: 'center' });
  doc.text('Firma y sello del patrono', pageWidth - 160, signY + 14, { align: 'center' });

  // --- Nota al pie ---
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(
    'AFP, ISSS e ISR se calculan solo sobre el salario base. El bono es un pago discrecional del '
    + 'patrono y se suma íntegro al total a pagar, sin descuentos de ley.',
    40,
    signY + 50,
    { maxWidth: pageWidth - 80 }
  );
  doc.setTextColor(0);

  const safeName = employee.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  doc.save(`boleta-${safeName}-${period}.pdf`);
};

export default { exportPayslipToPdf };
