import React from 'react'
import FAIcon from '../commons/FAIcon'

// Etiquetas del botón en formato exacto a la imagen de referencia: "Pasar a cocina"
const getAction = (pedido) => {
  if (pedido.status === 'pending') return { label: 'Pasar a cocina' }
  if (pedido.status === 'preparing' || pedido.status === 'atrasado') return { label: 'Marcar como listo' }
  if (pedido.status === 'ready') {
    if (pedido.orderType === 'local') return { label: 'Servir en mesa' }
    if (pedido.isDelivery) return { label: 'Marcar entregado' }
    return { label: 'Marcar recogido' }
  }
  return { label: 'Avanzar' }
}

export default function OrderCard({ pedido, onAdvance, onCancelRequest, onDeleteRequest }) {
  const esFinal = pedido.status === 'delivered' || pedido.status === 'cancelled'
  const codigo = `#${(pedido._id || '').slice(-4).toUpperCase()}`
  const action = getAction(pedido)

  const customerName = pedido.customer?.personalInfo
    ? `${pedido.customer.personalInfo.name || ''} ${pedido.customer.personalInfo.lastname || ''}`.trim()
    : (pedido.customerName || 'Cliente')

  // Detalle derecho: "LOCAL · MESA 2" o "EN LÍNEA · SOFÍA MENA"
  const headerDetail = pedido.orderType === 'local'
    ? `LOCAL · MESA ${pedido.table?.number || (pedido.tableNumber ? pedido.tableNumber : '—')}`
    : `EN LÍNEA · ${customerName.toUpperCase()}`

  // Resumen de productos separados por punto medio: "3 quesadillas · 1 horchata"
  const itemsSummary = (pedido.items || []).length > 0
    ? pedido.items.map((item) => {
        const qty = item.quantity ? `${item.quantity} ` : ''
        const name = item.name || item.product?.name || 'Producto'
        return `${qty}${name}`.trim()
      }).join(' · ')
    : 'Sin productos'

  return (
    <div className="bg-surface border border-line rounded-none p-5 sm:p-6 flex flex-col justify-between transition-colors hover:border-linealt group w-full">
      <div>
        {/* Cabecera: Código a la izquierda (#D7E1), Detalle a la derecha (LOCAL · MESA 2) */}
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm sm:text-base font-normal text-ink">
            {codigo}
          </span>
          <span className="font-mono text-xs font-normal text-muted tracking-[0.14em] uppercase">
            {headerDetail}
          </span>
        </div>

        {/* Listado de productos: "3 quesadillas · 1 horchata" */}
        <div className="mt-3.5 mb-6">
          <p className="text-sm font-sans text-inkalt leading-relaxed">
            {itemsSummary}
          </p>

          {pedido.orderType === 'online' && pedido.isDelivery && pedido.deliveryAddress && (
            <p className="text-xs text-muted italic mt-1.5 truncate">
              <FAIcon icon="map-marker-alt" size="xs" className="mr-1" />
              {pedido.deliveryAddress}
            </p>
          )}
        </div>
      </div>

      {/* Línea inferior: separador horizontal, precio ($11.25) y botón [Pasar a cocina] */}
      <div className="pt-4 border-t border-line flex items-center justify-between">
        <span className="text-base sm:text-lg font-normal text-ink">
          ${Number(pedido.total || 0).toFixed(2)}
        </span>

        <div className="flex items-center gap-2">
          {!esFinal && (
            <>
              {/* Botón sutil de cancelar visible al hacer hover */}
              {onCancelRequest && (
                <button
                  type="button"
                  onClick={() => onCancelRequest(pedido)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-ac transition-opacity"
                  title="Cancelar pedido"
                >
                  <FAIcon icon="times" size="xs" />
                </button>
              )}

              {/* Botón idéntico a la imagen de referencia */}
              <button
                type="button"
                onClick={() => onAdvance(pedido._id, pedido.status)}
                className="border border-ac text-ac hover:bg-ac hover:text-white px-5 py-2 text-xs sm:text-[13px] font-normal rounded-none transition-colors duration-150 active:scale-[0.98]"
              >
                {action.label}
              </button>
            </>
          )}

          {esFinal && (
            <button
              type="button"
              onClick={() => onDeleteRequest(pedido._id)}
              className="border border-line text-muted hover:border-ac hover:text-ac px-4 py-2 text-xs sm:text-[13px] font-normal rounded-none transition-colors"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
