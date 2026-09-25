import React from 'react'
import FAIcon from '../commons/FAIcon'

const PAYMENT_LABELS = {
  card: 'Tarjeta',
  cash: 'Efectivo',
}

export default function InvoiceTable({ invoices, loading, onDeleteRequest }) {
  if (loading && invoices.length === 0) {
    return (
      <div className="p-12 text-center text-muted text-sm flex items-center justify-center gap-2">
        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-ac"></span>
        Cargando facturas...
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="p-12 text-center text-muted text-sm font-sans">
        Todavía no hay pedidos facturados. Se registran automáticamente cuando un pedido se marca como entregado.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="border-b border-line text-[11px] font-mono font-semibold text-muted uppercase tracking-[0.14em]">
            <th className="py-3 px-4 pl-6">Pedido</th>
            <th className="py-3 px-4">Tipo</th>
            <th className="py-3 px-4">Detalle</th>
            <th className="py-3 px-4">Productos</th>
            <th className="py-3 px-4">Método de Pago</th>
            <th className="py-3 px-4">Total</th>
            <th className="py-3 px-4">Facturado</th>
            <th className="py-3 px-4 pr-6 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60 text-xs sm:text-sm text-inkalt">
          {invoices.map((invoice) => (
            <tr key={invoice._id} className="hover:bg-surfalt/50 transition-colors">
              <td className="py-3.5 px-4 pl-6 font-mono font-bold text-ink">
                #{(invoice.order || invoice._id).toString().slice(-4).toUpperCase()}
              </td>
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-line text-muted bg-surfalt">
                  <FAIcon icon={invoice.orderType === 'online' ? 'globe' : 'utensils'} size="xs" />
                  {invoice.orderType === 'online' ? 'En línea' : 'Local'}
                </span>
              </td>
              <td className="py-3.5 px-4 text-inkalt">
                {invoice.orderType === 'local' ? (
                  <>
                    {invoice.tableNumber ? `Mesa ${invoice.tableNumber}` : 'Mesa —'}
                    {invoice.waiterName && <span className="text-muted"> · {invoice.waiterName}</span>}
                  </>
                ) : (
                  <>
                    {invoice.customerName || 'Cliente'}
                    <span className="text-muted"> · {invoice.isDelivery ? 'A domicilio' : 'Recogido'}</span>
                  </>
                )}
              </td>
              <td className="py-3.5 px-4 text-muted text-xs max-w-[240px] truncate">
                {(invoice.items || []).map((i) => `${i.quantity ? `${i.quantity}x ` : ''}${i.name}`).join(', ') || 'Sin detalle'}
              </td>
              <td className="py-3.5 px-4 text-muted">
                {PAYMENT_LABELS[invoice.paymentMethod] || 'No especificado'}
              </td>
              <td className="py-3.5 px-4 font-mono font-bold text-ink">
                ${Number(invoice.total || 0).toFixed(2)}
              </td>
              <td className="py-3.5 px-4 text-muted text-xs font-mono">
                {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </td>
              <td className="py-3.5 px-4 pr-6 text-right">
                <button
                  type="button"
                  onClick={() => onDeleteRequest(invoice._id)}
                  className="text-muted hover:text-ac p-1.5 transition-colors"
                  title="Eliminar factura"
                >
                  <FAIcon icon="trash-alt" size="sm" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
