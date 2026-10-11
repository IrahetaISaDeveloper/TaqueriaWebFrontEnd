// src/pages/PurchaseBook.jsx
//
// Libro de Compras (anexo de compras del F-07): las facturas de compra del
// período, en orden de fecha y con correlativo, con las columnas del formato
// que maneja el contador. Se exporta en CSV (mismas columnas que su sistema)
// y en PDF. Las facturas se registran y corrigen desde aquí mismo.
import React, { useState, useMemo } from 'react';
import PageShell from '../components/commons/PageShell';
import { useAdminTabs } from '../hooks/useSectionTabs';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import PaginationControls from '../components/commons/PaginationControls';
import PurchaseInvoiceModal from '../components/reports/PurchaseInvoiceModal';
import usePurchaseBook from '../hooks/usePurchaseBook';
import { formatPeriodLabel, getCurrentPeriod } from '../hooks/usePayroll';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider, useToast } from '@syscor/web-shared/src/components/ToastProvider';
import { BOOK_AMOUNT_COLUMNS } from '../constants/purchaseBook';
import { exportPurchaseBookToCsv, exportPurchaseBookToPdf, bookDate } from '../utils/purchaseBookExport';

const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Últimos 12 meses, generados desde la fecha actual (mismo criterio que Planilla).
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

// Columnas de montos que no son la principal: en la tabla se juntan en una
// sola ("Otras") para que quepa en pantalla; el detalle va en el CSV/PDF.
const OTHER_AMOUNT_KEYS = BOOK_AMOUNT_COLUMNS.filter((c) => !c.main).map((c) => c.key);
const otherAmount = (r) => OTHER_AMOUNT_KEYS.reduce((acc, k) => acc + (Number(r[k]) || 0), 0);

// Separa "$1,234.56" en entero y centavos para el número grande, igual que
// en Reportes (IVA).
const splitMoney = (amount) => {
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const parts = formatted.split('.');
  return { whole: `$${parts[0]}`, decimal: `.${parts[1] || '00'}` };
};

// Métrica del bloque 2x2, mismo formato que Reportes (IVA).
const Metric = ({ label, value, hint, className = '' }) => (
  <div className={className}>
    <p className="kick text-muted mb-1">{label}</p>
    <p className="num text-2xl text-ink font-light">{value}</p>
    <p className="text-xs text-muted mt-0.5">{hint}</p>
  </div>
);

// Mismos botones que la cabecera de Reportes (IVA).
const BTN_SECONDARY =
  'px-4 py-2 border border-line bg-surface hover:bg-surfalt text-xs font-semibold text-ink transition-colors cursor-pointer';
const BTN_OUTLINE_AC =
  'px-4 py-2 border border-ac text-ac bg-surface hover:bg-ac hover:text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
const SELECT_CLASS =
  'px-3 py-1.5 bg-surface border border-line text-xs font-medium text-ink rounded-none focus:outline-none focus:border-ac cursor-pointer';

function PurchaseBookContent() {
  const [activeMenu] = useState('reports');
  const adminTabs = useAdminTabs('purchase_book');
  const { addToast } = useToast();

  const { book, rows, totals, loading, error, period, setPeriod, fetchInvoice, saveInvoice } =
    usePurchaseBook(getCurrentPeriod());

  // null: cerrado · { invoice: null }: registrar · { invoice }: editar
  const [modal, setModal] = useState(null);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  const visibleRows = useMemo(
    () => (onlyIncomplete ? rows.filter((r) => r.warnings.length > 0) : rows),
    [rows, onlyIncomplete],
  );
  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(visibleRows, 15);

  const incompleteCount = book?.incompleteCount ?? 0;
  const heroMoney = splitMoney(totals?.tax);

  const handleEdit = async (row) => {
    const invoice = await fetchInvoice(row.id);
    if (!invoice) {
      addToast('No se pudo abrir la factura', 'error');
      return;
    }
    setModal({ invoice });
  };

  const handleSubmit = async (formValues, file) => {
    const result = await saveInvoice(formValues, file, modal?.invoice?._id);
    addToast(
      result.success ? result.message || 'Factura guardada' : result.message,
      result.success ? 'success' : 'error',
    );
    return result;
  };

  const handleExport = (format) => {
    if (!book || rows.length === 0) {
      addToast('No hay compras en este período', 'error');
      return;
    }
    try {
      if (format === 'csv') exportPurchaseBookToCsv(book);
      else exportPurchaseBookToPdf(book);
      addToast(`Libro de compras ${format.toUpperCase()} generado`, 'success');
    } catch (err) {
      console.error('Error al exportar el libro de compras:', err);
      addToast('No se pudo generar el libro', 'error');
    }
  };

  return (
    <>
      <PageShell
        activeMenu={activeMenu}
        title="Administración"
        subtitle="Libro de compras del período, con el formato del anexo de compras del F-07."
        tabs={adminTabs}
        tabsLabel="Secciones de administración"
        actions={
          <>
            <button type="button" onClick={() => setModal({ invoice: null })} className={BTN_SECONDARY}>
              Registrar compra
            </button>

            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={loading || rows.length === 0}
              className={BTN_OUTLINE_AC}
            >
              Exportar libro
            </button>

            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={loading || rows.length === 0}
              className={BTN_OUTLINE_AC}
            >
              Exportar CSV
            </button>
          </>
        }
      >

        {/* Sección Hero & Métricas */}
        <div className="mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Hero Izquierda: crédito fiscal */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <p className="kick text-ac mb-2">
                  CRÉDITO FISCAL · {formatPeriodLabel(period).toUpperCase()}
                </p>

                <div className="flex items-baseline mb-2">
                  <span className="num text-4xl sm:text-5xl text-ink font-light">
                    {loading ? '—' : heroMoney.whole}
                  </span>
                  {!loading && (
                    <span className="num text-xl sm:text-2xl text-muted ml-0.5 font-light">
                      {heroMoney.decimal}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted max-w-sm leading-relaxed">
                  IVA de las compras del período según el libro: el mismo crédito fiscal que se descuenta en Reportes (IVA).
                  {incompleteCount > 0
                    ? ` Quedan ${incompleteCount} documento${incompleteCount === 1 ? '' : 's'} por completar.`
                    : ''}
                </p>
              </div>
            </div>

            {/* Métricas Derecha: 2x2 Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7">
              <Metric
                label="DOCUMENTOS"
                value={loading ? '—' : rows.length}
                hint="Registrados en el período"
              />
              <Metric
                label="COMPRAS GRAVADAS"
                value={loading ? '—' : money(totals?.internalTaxed)}
                hint="Compras internas, sin IVA"
              />
              <Metric
                className="border-t-2 border-[#a06d3b] pt-3"
                label="POR COMPLETAR"
                value={loading ? '—' : incompleteCount}
                hint="Documentos con datos faltantes"
              />
              <Metric
                className="pt-3"
                label="TOTAL COMPRAS"
                value={loading ? '—' : money(totals?.total)}
                hint="Total con IVA"
              />
            </div>
          </div>
        </div>

        {/* Sección del libro */}
        <div className="pt-6 border-t border-line">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-sm sm:text-base font-bold text-ink">
              Libro de compras · {formatPeriodLabel(period).toLowerCase()}
            </h2>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className={SELECT_CLASS}>
                {periodOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <select
                value={onlyIncomplete ? 'incomplete' : 'all'}
                onChange={(e) => setOnlyIncomplete(e.target.value === 'incomplete')}
                className={SELECT_CLASS}
              >
                <option value="all">Todos</option>
                <option value="incomplete">Por completar</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto min-h-0">
          {loading ? (
            <div className="p-8 text-center text-muted text-sm">Armando el libro...</div>
          ) : error ? (
            <div className="p-8 text-center text-ac text-sm">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 mx-auto mb-3 border border-line bg-surfalt flex items-center justify-center text-muted">
                <FAIcon icon="receipt" size="lg" />
              </div>
              <p className="text-ink font-semibold text-sm mb-1">
                No hay compras registradas en {formatPeriodLabel(period)}.
              </p>
              <p className="text-muted text-xs">Registra los documentos de tus proveedores para armar el libro.</p>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              Todos los documentos del período están completos.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="kick border-b border-line text-muted">
                  <th className="py-3 px-3 pl-0">N.º</th>
                  <th className="py-3 px-3">FECHA</th>
                  <th className="py-3 px-3">DOCUMENTO</th>
                  <th className="py-3 px-3">NRC</th>
                  <th className="py-3 px-3">PROVEEDOR</th>
                  <th className="py-3 px-3 text-right">GRAVADAS</th>
                  <th className="py-3 px-3 text-right" title="Exentas, internaciones, importaciones y sujetos excluidos">OTRAS</th>
                  <th className="py-3 px-3 text-right">CRÉDITO FISCAL</th>
                  <th className="py-3 px-3 text-right">IVA RET.</th>
                  <th className="py-3 px-3 text-right">TOTAL</th>
                  <th className="py-3 px-3 text-center">RENTA</th>
                  <th className="py-3 px-2 text-right w-8"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line/60 text-xs">
                {paginatedItems.map((r) => {
                  const incomplete = r.warnings.length > 0;
                  return (
                    <tr key={r.id} className="hover:bg-surfalt/40 transition-colors group">
                      <td className="py-3.5 px-3 pl-0 num text-muted">{r.correlative}</td>
                      <td className="py-3.5 px-3 num text-ink whitespace-nowrap">{bookDate(r.issuedAt)}</td>
                      <td className="py-3.5 px-3">
                        <div className="text-ink font-medium" title={`${r.documentClassLabel} · ${r.documentTypeLabel}`}>
                          <span className="num">{r.documentClass}</span>
                          <span className="text-muted"> · </span>
                          <span className="num">{r.documentType}</span>
                          <span className="text-muted"> {r.documentTypeLabel.toLowerCase()}</span>
                        </div>
                        <div className="num text-[10.5px] text-muted truncate max-w-[220px]" title={r.invoiceNumber}>
                          {r.invoiceNumber}{r.series ? ` · serie ${r.series}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 num">
                        {r.supplierNrc || <span className="text-muted">—</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-ink max-w-[260px] truncate" title={r.supplierName}>
                          {r.supplierName}
                        </div>
                        {incomplete && (
                          <div className="text-[10.5px] text-warn font-medium flex items-center gap-1">
                            <FAIcon icon="triangle-exclamation" size="xs" />
                            {r.warnings.join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right num text-ink">{money(r.internalTaxed)}</td>
                      <td className="py-3.5 px-3 text-right num text-muted">
                        {otherAmount(r) > 0 ? money(otherAmount(r)) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right num text-ink">{money(r.tax)}</td>
                      <td className="py-3.5 px-3 text-right num text-muted">
                        {r.ivaWithheld > 0 ? money(r.ivaWithheld) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right num font-semibold text-ink">{money(r.total)}</td>
                      <td
                        className="py-3.5 px-3 text-center num text-muted whitespace-nowrap"
                        title="Tipo de operación · clasificación · sector · tipo de costo"
                      >
                        {r.operationType}-{r.classification}-{r.sector}-{r.costType}
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          title="Editar documento"
                          aria-label={`Editar documento de ${r.supplierName}`}
                          className={`p-1 transition-colors cursor-pointer hover:bg-acsoft ${
                            incomplete ? 'text-warn hover:text-ac' : 'text-muted hover:text-ac opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <FAIcon icon="pen" size="xs" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {totals && (
                <tfoot>
                  <tr className="border-t border-line text-xs num font-bold text-ink">
                    <td className="py-4 px-3 pl-0 uppercase tracking-wider" colSpan={5}>
                      TOTALES DEL PERÍODO ({rows.length})
                    </td>
                    <td className="py-4 px-3 text-right">{money(totals.internalTaxed)}</td>
                    <td className="py-4 px-3 text-right">{money(otherAmount(totals))}</td>
                    <td className="py-4 px-3 text-right">{money(totals.tax)}</td>
                    <td className="py-4 px-3 text-right">{money(totals.ivaWithheld)}</td>
                    <td className="py-4 px-3 text-right">{money(totals.total)}</td>
                    <td className="py-4 px-3" colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

          {totalPages > 1 && (
            <div className="mt-4 border-t border-line pt-4">
              <PaginationControls page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
            </div>
          )}

          <p className="mt-6 text-[11px] text-muted leading-relaxed">
          El CSV trae las mismas columnas y en el mismo orden que el formato del contador (FECHA, CLASEDOC, TIPODOCUM … TPCOSTO),
          con fecha dd/mm/aa y decimales con coma. La columna RENTA muestra tipo de operación, clasificación, sector y tipo de costo.
          Las compras registradas antes de que existiera el libro aparecen como compras internas gravadas.
          </p>
        </div>
      </PageShell>

      <PurchaseInvoiceModal
        isOpen={Boolean(modal)}
        invoice={modal?.invoice || null}
        onClose={() => setModal(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

export default function PurchaseBook() {
  return (
    <ToastProvider>
      <PurchaseBookContent />
    </ToastProvider>
  );
}
