import React from 'react'
import FAIcon from '../commons/FAIcon'

const PAYMENT_LABELS = {
  card: 'Tarjeta',
  cash: 'Efectivo',
}

// Historial de facturación (solo lectura): una fila por cada pedido que ya
// se entregó. Sigue el mismo estilo de tabla que Inventory.jsx para que
// "Pedidos" y "Órdenes" se sientan como el mismo apartado, igual que
// Inventario hace con sus pestañas de Productos/Activos fijos.
export default function InvoiceTable({ invoices, loading, onDeleteRequest }) {
  if (loading && invoices.length === 0) {
    return (
      <div className="p-8 text-center text-muted text-sm flex items-center justify-center gap-2">
        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-ac"></span>
        Cargando...
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="p-8 text-center text-muted text-sm">
        Todavía no hay pedidos facturados. Se registran automáticamente cuando un pedido se marca como entregado.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-surfalt/80 border-b border-line text-xs font-display font-semibold text-muted uppercase tracking-wider">
            <th className="p-3 sm:p-4 pl-4 sm:pl-6">Pedido</th>
            <th className="p-3 sm:p-4">Tipo</th>
            <th className="p-3 sm:p-4">Detalle</th>
            <th className="p-3 sm:p-4">Productos</th>
            <th className="p-3 sm:p-4">Método de Pago</th>
            <th className="p-3 sm:p-4">Total</th>
            <th className="p-3 sm:p-4">Facturado</th>
            <th className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-sm text-inkalt">
          {invoices.map((invoice) => (
            <tr key={invoice._id} className="hover:bg-surfalt/80 transition-colors">
              <td className="p-3 sm:p-4 pl-4 sm:pl-6 font-display font-semibold text-ink">
                #{(invoice.order || invoice._id).toString().slice(-4).toUpperCase()}
              </td>
              <td className="p-3 sm:p-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-semibold ${
                  invoice.orderType === 'online'
                    ? 'bg-infosoft text-info border border-info'
                    : 'bg-infosoft text-info border border-info'
                }`}>
                  <FAIcon icon={invoice.orderType === 'online' ? 'globe' : 'utensils'} size="xs" />
                  {invoice.orderType === 'online' ? 'En línea' : 'Local'}
                </span>
              </td>
              <td className="p-3 sm:p-4 text-inkalt">
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
              <td className="p-3 sm:p-4 text-muted text-xs max-w-[220px] truncate">
                {(invoice.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Sin detalle'}
              </td>
              <td className="p-3 sm:p-4 text-inkalt">
                {PAYMENT_LABELS[invoice.paymentMethod] || 'No especificado'}
              </td>
              <td className="p-3 sm:p-4 font-display font-semibold text-ink">
                ${Number(invoice.total || 0).toFixed(2)}
              </td>
              <td className="p-3 sm:p-4 text-muted text-xs">
                {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </td>
              <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">
                <button
                  onClick={() => onDeleteRequest(invoice._id)}
                  className="text-ac hover:text-ac p-1.5 rounded-none hover:bg-acsoft transition-colors"
                  title="Eliminar registro de facturación"
                >
                  <FAIcon icon="trash" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
