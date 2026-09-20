// src/pages/Reports.jsx
//
// Contabilidad: cruza el IVA que el negocio COBRÓ en sus ventas contra el que
// PAGÓ en sus compras, que es lo que hay que declarar cada mes.
import React, { useState, useMemo } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import FAIcon from '../components/commons/FAIcon';
import Select from '../components/commons/Select';
import ComboStats from '../components/dashboard/ComboStats';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import PurchaseInvoiceModal from '../components/reports/PurchaseInvoiceModal';
import usePurchaseInvoices, { CATEGORY_LABELS } from '../hooks/usePurchaseInvoices';
import { formatPeriodLabel, getCurrentPeriod } from '../hooks/usePayroll';
import { usePagination } from '../hooks/usePagination';
import { exportTaxReportToPdf } from '../utils/taxReportPdf';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import { purchaseInvoicesReportColumns } from '../constants/reportConfigs';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const shortDate = (d) => (d ? new Date(d).toLocaleDateString('es-SV') : '—');

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

function ReportsContent() {
  const [activeMenu] = useState('reports');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, invoice: null });
  // "all" | "pending" | "processed"
  const [filter, setFilter] = useState('all');

  const {
    invoices, report, loading, error, period, setPeriod,
    createInvoice, toggleProcessed, deleteInvoice,
  } = usePurchaseInvoices(getCurrentPeriod());

  const { addToast } = useToast();
  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  const filteredInvoices = useMemo(() => {
    if (filter === 'pending') return invoices.filter((i) => !i.processedForTax);
    if (filter === 'processed') return invoices.filter((i) => i.processedForTax);
    return invoices;
  }, [invoices, filter]);

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredInvoices, 8);

  const handleCreate = async (formValues, file) => {
    const result = await createInvoice(formValues, file);
    addToast(
      result.success ? (result.message || 'Factura registrada') : result.message,
      result.success ? 'success' : 'error'
    );
    return result;
  };

  const handleToggle = async (invoice) => {
    const result = await toggleProcessed(invoice._id, !invoice.processedForTax);
    if (!result.success) addToast(result.message, 'error');
  };

  const handleDeleteConfirm = async () => {
    const invoice = confirmDelete.invoice;
    setConfirmDelete({ isOpen: false, invoice: null });
    if (!invoice) return;

    const result = await deleteInvoice(invoice._id);
    addToast(
      result.success ? 'Factura eliminada' : result.message,
      result.success ? 'success' : 'error'
    );
  };

  const handleExport = () => {
    if (!report) {
      addToast('No hay reporte que exportar todavía', 'error');
      return;
    }

    try {
      exportTaxReportToPdf(report);
      addToast('Reporte de IVA exportado correctamente', 'success');
    } catch (err) {
      console.error('Error al exportar el reporte de IVA:', err);
      addToast('No se pudo generar el reporte', 'error');
    }
  };

  // Saldo a favor o a pagar: el signo cambia el color y la etiqueta, para que
  // el resultado se lea de un vistazo sin interpretar el número.
  const isInFavor = report?.result?.inFavor;
  const payableAmount = Math.abs(report?.result?.taxPayable ?? 0);

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
                  Reportes contables
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  IVA de ventas contra IVA de compras, listo para el contador.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface text-inkalt rounded-none text-sm font-display font-semibold border border-line hover:bg-surfalt transition-colors"
                >
                  <FAIcon icon="plus" />
                  Subir factura de compra
                </button>

                {/* Complementa al PDF del reporte de IVA: exporta el detalle
                    de las facturas de compra en XML o JSON. */}
                <ReportButton
                  title={`Facturas de compra ${formatPeriodLabel(period)}`}
                  columns={purchaseInvoicesReportColumns}
                  rows={invoices}
                  getImageUrl={(p) => p.fileUrl}
                  itemTag="factura_compra"
                  summary={report ? [
                    { label: 'Facturas de compra', value: report.purchases.count },
                    { label: 'IVA de compras', value: money(report.purchases.tax) },
                    { label: 'IVA de ventas', value: money(report.sales.tax) },
                    { label: report.result.inFavor ? 'Saldo a favor' : 'IVA a pagar', value: money(Math.abs(report.result.taxPayable)) },
                  ] : undefined}
                />

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={loading || !report}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ac text-white rounded-none text-sm font-display font-semibold hover:bg-ac transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FAIcon icon="file-pdf" />
                  Exportar reporte
                </button>
              </div>
            </div>

            {/* Comparación: ventas vs compras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
              <ComboStats
                icon="file-invoice-dollar"
                title="IVA COBRADO"
                value={loading ? '—' : money(report?.sales?.tax)}
                label={`Débito fiscal · ${report?.sales?.count ?? 0} ventas`}
              />
              <ComboStats
                icon="receipt"
                title="IVA PAGADO"
                value={loading ? '—' : money(report?.purchases?.tax)}
                label={`Crédito fiscal · ${report?.purchases?.count ?? 0} compras`}
              />
              <ComboStats
                icon={isInFavor ? 'circle-check' : 'sack-dollar'}
                title={isInFavor ? 'SALDO A FAVOR' : 'IVA A PAGAR'}
                value={loading ? '—' : money(payableAmount)}
                label={isInFavor ? 'Crédito para el próximo período' : 'Diferencia a declarar'}
                highlighted={true}
              />
              <ComboStats
                icon="triangle-exclamation"
                title="POR PROCESAR"
                value={loading ? '—' : String(report?.purchases?.pendingCount ?? 0)}
                label="Compras sin marcar para IVA"
              />
            </div>

            {/* Facturas de compra */}
            <div className="bg-surface rounded-none border border-line overflow-hidden">
              <div className="p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line">
                <h2 className="text-lg font-display font-bold text-ink">
                  Facturas de compra · {formatPeriodLabel(period)}
                </h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {periodOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>

                  <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">Todas</option>
                    <option value="pending">Sin procesar</option>
                    <option value="processed">Procesadas</option>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-muted text-sm">Cargando reporte...</div>
                ) : error ? (
                  <div className="p-8 text-center text-ac text-sm">{error}</div>
                ) : invoices.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-surfalt flex items-center justify-center text-muted">
                      <FAIcon icon="receipt" size="xl" />
                    </div>
                    <p className="text-muted text-sm mb-1">
                      No hay facturas de compra registradas en {formatPeriodLabel(period)}.
                    </p>
                    <p className="text-muted text-xs">
                      Súbelas para poder descontar su IVA del total a declarar.
                    </p>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">
                    Ninguna factura coincide con el filtro.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-surfalt/80 text-xs font-display font-semibold text-muted uppercase tracking-wider border-b border-line">
                        <th className="p-3 sm:p-4 pl-4 sm:pl-6">Fecha</th>
                        <th className="p-3 sm:p-4">Proveedor</th>
                        <th className="p-3 sm:p-4">N.º factura</th>
                        <th className="p-3 sm:p-4">Categoría</th>
                        <th className="p-3 sm:p-4 text-right">Subtotal</th>
                        <th className="p-3 sm:p-4 text-right">IVA</th>
                        <th className="p-3 sm:p-4 text-right">Total</th>
                        <th className="p-3 sm:p-4 text-center">IVA procesado</th>
                        <th className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">Acciones</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-line text-sm text-inkalt">
                      {paginatedItems.map((inv) => (
                        <tr key={inv._id} className="hover:bg-surfalt/80 transition-colors">
                          <td className="p-3 sm:p-4 pl-4 sm:pl-6 whitespace-nowrap text-inkalt">
                            {shortDate(inv.issuedAt)}
                          </td>

                          <td className="p-3 sm:p-4">
                            <div className="font-display font-bold text-ink">{inv.supplierName}</div>
                            {inv.supplierTaxId && (
                              <div className="text-xs text-muted">{inv.supplierTaxId}</div>
                            )}
                          </td>

                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-inkalt">{inv.invoiceNumber}</span>
                              {/* El comprobante se abre en pestaña nueva, no se
                                  descarga: normalmente solo se quiere verificar. */}
                              {inv.fileUrl && (
                                <a
                                  href={inv.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted hover:text-ac transition-colors"
                                  title="Ver comprobante"
                                >
                                  <FAIcon icon="paperclip" size="sm" />
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="p-3 sm:p-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-semibold bg-surfalt text-inkalt border border-line">
                              {CATEGORY_LABELS[inv.category] || inv.category}
                            </span>
                          </td>

                          <td className="p-3 sm:p-4 text-right">{money(inv.subtotal)}</td>
                          <td className="p-3 sm:p-4 text-right text-muted">{money(inv.tax)}</td>
                          <td className="p-3 sm:p-4 text-right font-display font-bold text-ink">
                            {money(inv.total)}
                          </td>

                          <td className="p-3 sm:p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(inv)}
                              title={
                                inv.processedForTax
                                  ? `Procesada${inv.processedBy?.name ? ` por ${inv.processedBy.name}` : ''}. Clic para desmarcar.`
                                  : 'Marcar como incluida en la declaración'
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition-colors cursor-pointer ${
                                inv.processedForTax
                                  ? 'bg-oksoft text-ok border-ok hover:bg-oksoft'
                                  : 'bg-warnsoft text-warn border-warn hover:bg-warnsoft'
                              }`}
                            >
                              <FAIcon icon={inv.processedForTax ? 'check' : 'clock'} size="xs" />
                              {inv.processedForTax ? 'Procesada' : 'Pendiente'}
                            </button>
                          </td>

                          <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ isOpen: true, invoice: inv })}
                              className="p-2 text-muted hover:text-ac hover:bg-acsoft rounded-none transition-colors"
                              aria-label="Eliminar factura"
                            >
                              <FAIcon icon="trash" size="sm" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {report && (
                      <tfoot>
                        <tr className="bg-surfalt/80 border-t-2 border-line text-sm font-display font-bold text-ink">
                          <td className="p-3 sm:p-4 pl-4 sm:pl-6" colSpan={4}>
                            TOTALES DEL PERÍODO ({report.purchases.count})
                          </td>
                          <td className="p-3 sm:p-4 text-right">{money(report.purchases.subtotal)}</td>
                          <td className="p-3 sm:p-4 text-right">{money(report.purchases.tax)}</td>
                          <td className="p-3 sm:p-4 text-right">{money(report.purchases.total)}</td>
                          <td className="p-3 sm:p-4" colSpan={2} />
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
              El IVA de las ventas se desglosa del total facturado, porque los precios del menú ya lo
              incluyen. El de las compras es el que consta en cada factura del proveedor.
            </p>
          </div>
        </main>
      </div>

      <PurchaseInvoiceModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, invoice: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar factura de compra"
        message={
          confirmDelete.invoice
            ? `¿Eliminar la factura ${confirmDelete.invoice.invoiceNumber} de ${confirmDelete.invoice.supplierName}? También se borrará su comprobante y dejará de contar para el IVA del período.`
            : ''
        }
        confirmText="Eliminar"
      />
    </div>
  );
}

export default function Reports() {
  return (
    <ToastProvider>
      <ReportsContent />
    </ToastProvider>
  );
}
