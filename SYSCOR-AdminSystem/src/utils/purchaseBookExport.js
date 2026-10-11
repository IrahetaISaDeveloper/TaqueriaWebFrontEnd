// Exportación del Libro de Compras.
//
// - CSV: las mismas columnas, en el mismo orden y con los mismos nombres que
//   el formato que maneja el contador (FECHA, CLASEDOC, TIPODOCUM, ...,
//   TPCOSTO), con fecha dd/mm/aa y decimales con coma, para poder pegarlo o
//   importarlo tal cual en su sistema contable.
// - PDF: el libro impreso, horizontal, con correlativo, totales por columna
//   y espacio para firma.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPeriodLabel } from '../hooks/usePayroll';
import { BUSINESS_FISCAL } from '../constants/purchaseBook';

// dd/mm/aa con el día local, como en el formato del libro.
export const bookDate = (d) => {
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)}`;
};

// 221.24 -> "221,24" (formato del libro: coma decimal, sin miles)
const bookNumber = (n) => Number(n || 0).toFixed(2).replace('.', ',');

// En un DTE, NUMDOC es el código de generación sin guiones y en mayúsculas.
const bookDocNumber = (row) =>
  row.documentClass === '4'
    ? String(row.invoiceNumber).replace(/-/g, '').toUpperCase()
    : row.invoiceNumber;

// Columnas del formato, en su orden exacto.
const CSV_COLUMNS = [
  ['FECHA', (r) => bookDate(r.issuedAt)],
  ['CLASEDOC', (r) => `${r.documentClass} ${r.documentClassLabel}`],
  ['TIPODOCUM', (r) => `${r.documentType} ${r.documentTypeLabel}`],
  ['TIPODOCIDE', () => ''],
  ['NUMDOC', bookDocNumber],
  ['NUMSERIE', (r) => r.series],
  ['NRC', (r) => r.supplierNrc],
  ['PROVEEDOR', (r) => r.supplierName],
  ['COMPRASGR', (r) => bookNumber(r.internalTaxed)],
  ['COMPRASEX', (r) => bookNumber(r.internalExempt)],
  ['INTERGRAV', (r) => bookNumber(r.internationTaxed)],
  ['INTEREXEN', (r) => bookNumber(r.internationExempt)],
  ['IMPORBIEN', (r) => bookNumber(r.importGoods)],
  ['IMPORSERV', (r) => bookNumber(r.importServices)],
  ['IMPOREXEN', (r) => bookNumber(r.importExempt)],
  ['CREDITOFI', (r) => bookNumber(r.tax)],
  ['IVARET', (r) => bookNumber(r.ivaWithheld)],
  ['TOTAL', (r) => bookNumber(r.total)],
  ['SUJEX', (r) => bookNumber(r.excludedSubject)],
  ['NUMANEXO', (r) => r.annexNumber],
  ['DSCANEXO', (r) => r.annexDescription],
  ['DUI', (r) => r.supplierDui],
  ['TPOPERAC', (r) => r.operationType],
  ['CLASF', (r) => r.classification],
  ['SECTOR', (r) => r.sector],
  ['TPCOSTO', (r) => r.costType],
];

// Separador ";" porque los montos llevan coma decimal (así lo abre bien
// Excel en español). Se entrecomilla todo lo que pueda romper la fila.
const csvCell = (value) => {
  const text = String(value ?? '');
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const download = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** @param {Object} book La respuesta de /purchase-invoices/purchase-book */
export const exportPurchaseBookToCsv = (book) => {
  const lines = [
    CSV_COLUMNS.map(([header]) => header).join(';'),
    ...book.rows.map((row) => CSV_COLUMNS.map(([, value]) => csvCell(value(row))).join(';')),
  ];
  // BOM al inicio para que Excel reconozca las tildes (UTF-8).
  download(`${String.fromCharCode(0xfeff)}${lines.join('\r\n')}\r\n`, `libro-compras-${book.period}.csv`, 'text/csv');
};

/** @param {Object} book La respuesta de /purchase-invoices/purchase-book */
export const exportPurchaseBookToPdf = (book) => {
  // Oficio horizontal: el libro tiene muchas columnas.
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'legal' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Encabezado ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LIBRO DE COMPRAS', pageWidth / 2, 38, { align: 'center' });
  doc.setFontSize(10);
  doc.text(BUSINESS_FISCAL.name, pageWidth / 2, 54, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const fiscalIds = [
    BUSINESS_FISCAL.nrc && `NRC: ${BUSINESS_FISCAL.nrc}`,
    BUSINESS_FISCAL.nit && `NIT: ${BUSINESS_FISCAL.nit}`,
  ].filter(Boolean).join('     ');
  if (fiscalIds) doc.text(fiscalIds, pageWidth / 2, 67, { align: 'center' });
  doc.text(`Período: ${formatPeriodLabel(book.period)}  ·  Montos en dólares de los Estados Unidos`, pageWidth / 2, 80, { align: 'center' });

  const t = book.totals;
  const amount = (n) => Number(n || 0).toFixed(2);

  autoTable(doc, {
    startY: 92,
    head: [[
      'N.º', 'Fecha', 'Clase', 'Tipo', 'N.º documento', 'NRC', 'Proveedor',
      'Internas gravadas', 'Internas exentas', 'Intern. gravadas', 'Intern. exentas',
      'Import. bienes', 'Import. servicios', 'Import. exentas', 'Crédito fiscal',
      'IVA retenido', 'Total', 'Sujetos excluidos',
    ]],
    body: book.rows.map((r) => [
      r.correlative,
      bookDate(r.issuedAt),
      r.documentClass,
      r.documentType,
      bookDocNumber(r) + (r.series ? `\nSerie ${r.series}` : ''),
      r.supplierNrc || (r.supplierDui ? `DUI ${r.supplierDui}` : ''),
      r.supplierName,
      amount(r.internalTaxed),
      amount(r.internalExempt),
      amount(r.internationTaxed),
      amount(r.internationExempt),
      amount(r.importGoods),
      amount(r.importServices),
      amount(r.importExempt),
      amount(r.tax),
      amount(r.ivaWithheld),
      amount(r.total),
      amount(r.excludedSubject),
    ]),
    foot: [[
      { content: `TOTALES (${book.rows.length} documentos)`, colSpan: 7, styles: { halign: 'left' } },
      amount(t.internalTaxed), amount(t.internalExempt), amount(t.internationTaxed),
      amount(t.internationExempt), amount(t.importGoods), amount(t.importServices),
      amount(t.importExempt), amount(t.tax), amount(t.ivaWithheld), amount(t.total),
      amount(t.excludedSubject),
    ]],
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 2.5, valign: 'middle' },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [243, 240, 235], textColor: 30, fontStyle: 'bold', halign: 'right' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { cellWidth: 38 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 24 },
      4: { cellWidth: 92, fontSize: 5.5 },
      5: { cellWidth: 42 },
      6: { cellWidth: 140 },
      ...Object.fromEntries([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((i) => [i, { halign: 'right' }])),
    },
    margin: { left: 24, right: 24 },
  });

  // --- Leyenda de códigos y firma ---
  let y = doc.lastAutoTable.finalY + 18;
  if (y > doc.internal.pageSize.getHeight() - 70) {
    doc.addPage();
    y = 50;
  }
  doc.setFontSize(7);
  doc.setTextColor(110);
  doc.text(
    'Clase: 1 Impreso por imprenta o tiquetes · 2 Formulario único · 3 Otros · 4 DTE.   '
    + 'Tipo: 03 Crédito fiscal · 05 Nota de crédito · 06 Nota de débito · 12 Declaración de mercancías · 13 Mandamiento de ingreso.',
    24,
    y,
  );
  doc.setTextColor(0);

  const signY = y + 50;
  doc.setDrawColor(150);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 260, signY, pageWidth - 40, signY);
  doc.setFontSize(8);
  doc.text('Firma del contador o contribuyente', pageWidth - 150, signY + 12, { align: 'center' });

  // Pie con número de página en todas las hojas.
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`Folio ${i} de ${pages}`, pageWidth - 24, doc.internal.pageSize.getHeight() - 16, { align: 'right' });
    doc.text(`Generado el ${new Date().toLocaleString('es-SV', { dateStyle: 'long', timeStyle: 'short' })}`, 24, doc.internal.pageSize.getHeight() - 16);
  }

  doc.save(`libro-compras-${book.period}.pdf`);
};
