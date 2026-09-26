// src/pages/Reports.jsx
//
// Contabilidad: cruza el IVA que el negocio COBRÓ en sus ventas contra el que
// PAGÓ en sus compras, que es lo que hay que declarar cada mes.
import React, { useState, useMemo } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import FAIcon from '../components/commons/FAIcon';
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

const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const splitMoney = (amount) => {
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const parts = formatted.split('.');
  return {
    whole: `$${parts[0]}`,
    decimal: `.${parts[1] || '00'}`,
  };
};

const shortDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

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
    invoices,
    report,
    loading,
    error,
    period,
    setPeriod,
    createInvoice,
    toggleProcessed,
    deleteInvoice,
  } = usePurchaseInvoices(getCurrentPeriod());

  const { addToast } = useToast();
  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  const filteredInvoices = useMemo(() => {
    if (filter === 'pending') return invoices.filter((i) => !i.processedForTax);
    if (filter === 'processed') return invoices.filter((i) => i.processedForTax);
    return invoices;
  }, [invoices, filter]);

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredInvoices, 10);

  const handleCreate = async (formValues, file) => {
    const result = await createInvoice(formValues, file);
    addToast(
      result.success ? result.message || 'Factura registrada' : result.message,
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

  // Saldo a favor o a pagar
  const isInFavor = report?.result?.inFavor;
  const payableAmount = Math.abs(report?.result?.taxPayable ?? 0);
  const heroMoney = splitMoney(payableAmount);
  const pendingCount = report?.purchases?.pendingCount ?? 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-surface border border-line p-5 sm:p-7 lg:p-9">
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                    Reportes contables
                  </h1>
                  <p className="text-xs sm:text-sm text-muted">
                    IVA de ventas contra IVA de compras, listo para el contador
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className="px-4 py-2 border border-line bg-surface hover:bg-surfalt text-xs font-semibold text-ink transition-colors cursor-pointer"
                  >
                    Subir factura de compra
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={loading || !report}
                    className="px-4 py-2 border border-ac text-ac bg-surface hover:bg-ac hover:text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Exportar reporte
                  </button>

                  <ReportButton
                    title={`Facturas de compra ${formatPeriodLabel(period)}`}
                    columns={purchaseInvoicesReportColumns}
                    rows={invoices}
                    getImageUrl={(p) => p.fileUrl}
                    itemTag="factura_compra"
                    summary={
                      report
                        ? [
                            { label: 'Facturas de compra', value: report.purchases.count },
                            { label: 'IVA de compras', value: money(report.purchases.tax) },
                            { label: 'IVA de ventas', value: money(report.sales.tax) },
                            {
                              label: report.result.inFavor ? 'Saldo a favor' : 'IVA a pagar',
                              value: money(Math.abs(report.result.taxPayable)),
                            },
                          ]
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Sección Hero & Métricas */}
              <div className="border-t border-line pt-8 mb-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                  {/* Hero Izquierda: IVA a pagar */}
                  <div className="lg:col-span-5 flex flex-col justify-between">
                    <div>
                      <p className="kick text-[10.5px] font-bold text-ac tracking-widest uppercase mb-2">
                        {isInFavor ? 'REMANENTE A FAVOR' : 'IVA A PAGAR'} ·{' '}
                        {formatPeriodLabel(period).toUpperCase()}
                      </p>

                      <div className="flex items-baseline mb-2">
                        <span className="text-4xl sm:text-5xl font-light text-ink tracking-tight font-display">
                          {loading ? '—' : heroMoney.whole}
                        </span>
                        {!loading && (
                          <span className="text-xl sm:text-2xl text-muted font-normal ml-0.5 font-display">
                            {heroMoney.decimal}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted max-w-sm leading-relaxed">
                        {isInFavor
                          ? `Saldo a favor del negocio aplicable a próximos períodos tributarios.${
                              pendingCount > 0
                                ? ` Quedan ${pendingCount} compra${
                                    pendingCount === 1 ? '' : 's'
                                  } sin marcar para IVA.`
                                : ''
                            }`
                          : `Diferencia entre el débito fiscal de tus ventas y el crédito fiscal de tus compras.${
                              pendingCount > 0
                                ? ` Quedan ${pendingCount} compra${
                                    pendingCount === 1 ? '' : 's'
                                  } sin marcar para IVA.`
                                : ''
                            }`}
                      </p>
                    </div>
                  </div>

                  {/* Métricas Derecha: 2x2 Grid */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7">
                    {/* IVA COBRADO */}
                    <div>
                      <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1">
                        IVA COBRADO
                      </p>
                      <p className="text-2xl font-light text-ink font-display">
                        {loading ? '—' : money(report?.sales?.tax)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Débito fiscal · {report?.sales?.count ?? 0} ventas
                      </p>
                    </div>

                    {/* IVA PAGADO */}
                    <div>
                      <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1">
                        IVA PAGADO
                      </p>
                      <p className="text-2xl font-light text-ink font-display">
                        {loading ? '—' : money(report?.purchases?.tax)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Crédito fiscal · {report?.purchases?.count ?? 0} compras
                      </p>
                    </div>

                    {/* POR PROCESAR (con barra ámbar superior) */}
                    <div className="border-t-2 border-[#a06d3b] pt-3">
                      <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1">
                        POR PROCESAR
                      </p>
                      <p className="text-2xl font-light text-ink font-display">
                        {loading ? '—' : pendingCount}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Compras sin marcar para IVA
                      </p>
                    </div>

                    {/* COMPRAS DEL PERÍODO */}
                    <div className="pt-3">
                      <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1">
                        COMPRAS DEL PERÍODO
                      </p>
                      <p className="text-2xl font-light text-ink font-display">
                        {loading ? '—' : money(report?.purchases?.total)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Total con IVA</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Facturas de compra */}
              <div className="pt-6 border-t border-line">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h2 className="text-sm sm:text-base font-bold text-ink">
                    Facturas de compra · {formatPeriodLabel(period).toLowerCase()}
                  </h2>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="px-3 py-1.5 bg-surface border border-line text-xs font-medium text-ink rounded-none focus:outline-none focus:border-ac cursor-pointer"
                    >
                      {periodOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="px-3 py-1.5 bg-surface border border-line text-xs font-medium text-ink rounded-none focus:outline-none focus:border-ac cursor-pointer"
                    >
                      <option value="all">Todas</option>
                      <option value="pending">Pendientes</option>
                      <option value="processed">Procesadas</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto min-h-0">
                  {loading ? (
                    <div className="p-8 text-center text-muted text-sm">Cargando reporte...</div>
                  ) : error ? (
                    <div className="p-8 text-center text-ac text-sm">{error}</div>
                  ) : invoices.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 border border-line bg-surfalt flex items-center justify-center text-muted">
                        <FAIcon icon="receipt" size="lg" />
                      </div>
                      <p className="text-ink font-semibold text-sm mb-1">
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
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-line text-[10px] font-mono tracking-wider font-semibold text-muted uppercase">
                          <th className="py-3 px-3 pl-0">FECHA</th>
                          <th className="py-3 px-3">PROVEEDOR</th>
                          <th className="py-3 px-3">N.º FACTURA</th>
                          <th className="py-3 px-3">CATEGORÍA</th>
                          <th className="py-3 px-3 text-right">SUBTOTAL</th>
                          <th className="py-3 px-3 text-right">IVA</th>
                          <th className="py-3 px-3 text-right">TOTAL</th>
                          <th className="py-3 px-3 text-right">IVA PROCESADO</th>
                          <th className="py-3 px-2 text-right w-8"></th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-line/60 text-xs">
                        {paginatedItems.map((inv) => (
                          <tr key={inv._id} className="hover:bg-surfalt/40 transition-colors group">
                            <td className="py-3.5 px-3 pl-0 whitespace-nowrap font-mono text-ink">
                              {shortDate(inv.issuedAt)}
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="font-semibold text-ink">{inv.supplierName}</div>
                              {inv.supplierTaxId && (
                                <div className="text-[11px] font-mono text-muted">
                                  {inv.supplierTaxId}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5 font-mono text-muted">
                                <span>{inv.invoiceNumber}</span>
                                {inv.fileUrl && (
                                  <a
                                    href={inv.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted hover:text-ac transition-colors"
                                    title="Ver comprobante"
                                  >
                                    <FAIcon icon="paperclip" size="xs" />
                                  </a>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-muted">
                              {CATEGORY_LABELS[inv.category] || inv.category}
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono text-ink">
                              {money(inv.subtotal)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-muted">
                              {money(inv.tax)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-semibold text-ink">
                              {money(inv.total)}
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggle(inv)}
                                title={
                                  inv.processedForTax
                                    ? `Procesada${
                                        inv.processedBy?.name ? ` por ${inv.processedBy.name}` : ''
                                      }. Clic para desmarcar.`
                                    : 'Marcar como incluida en la declaración'
                                }
                                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold tracking-wider hover:opacity-80 transition-opacity cursor-pointer ml-auto"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    inv.processedForTax ? 'bg-ok' : 'bg-warn'
                                  }`}
                                />
                                <span className={inv.processedForTax ? 'text-ok' : 'text-warn'}>
                                  {inv.processedForTax ? 'PROCESADA' : 'PENDIENTE'}
                                </span>
                              </button>
                            </td>

                            <td className="py-3.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => setConfirmDelete({ isOpen: true, invoice: inv })}
                                className="p-1 text-muted hover:text-ac hover:bg-acsoft transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                aria-label="Eliminar factura"
                              >
                                <FAIcon icon="trash" size="xs" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      {report && (
                        <tfoot>
                          <tr className="border-t border-line text-xs font-mono font-bold text-ink">
                            <td className="py-4 px-3 pl-0 uppercase tracking-wider" colSpan={4}>
                              TOTALES DEL PERÍODO ({report.purchases.count})
                            </td>
                            <td className="py-4 px-3 text-right">
                              {money(report.purchases.subtotal)}
                            </td>
                            <td className="py-4 px-3 text-right">{money(report.purchases.tax)}</td>
                            <td className="py-4 px-3 text-right">
                              {money(report.purchases.total)}
                            </td>
                            <td className="py-4 px-3" colSpan={2} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 border-t border-line pt-4">
                    <PaginationControls
                      page={page}
                      totalPages={totalPages}
                      onPrev={prev}
                      onNext={next}
                      onGoTo={goTo}
                    />
                  </div>
                )}

                <p className="mt-6 text-[11px] text-muted leading-relaxed">
                  El IVA de las ventas se desglosa del total facturado, porque los precios del menú
                  ya lo incluyen. El de las compras es el que consta en cada factura del proveedor.
                </p>
              </div>
            </div>
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
