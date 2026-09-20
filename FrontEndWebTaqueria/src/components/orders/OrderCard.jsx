import React from 'react'
import FAIcon from '../commons/FAIcon'
import { useTheme } from '../../context/themeContext'

// Colores/etiquetas de cada estado de un pedido (debe coincidir con el enum
// del backend en orderModel.js). Aplican igual para pedidos locales y online:
// "ready" = listo para salir de cocina (a la mesa o para despacho/recoger),
// "delivered" = ya llegó a su destino final (servido en mesa, entregado a
// domicilio, o recogido por el cliente).
const STATUS_META = {
  pending: { label: 'Pendiente', accent: 'bg-muted', badge: 'bg-surfalt text-inkalt border border-line' },
  preparing: { label: 'En Cocina', accent: 'bg-warn', badge: 'bg-warnsoft text-warn border border-warn' },
  atrasado: { label: 'Atrasado', accent: 'bg-ac', badge: 'bg-acsoft text-ac border border-acline animate-pulse' },
  ready: { label: 'Listo', accent: 'bg-ok', badge: 'bg-oksoft text-ok border border-ok' },
  delivered: { label: 'Entregado', accent: 'bg-ink', badge: 'bg-line text-inkalt border border-linealt' },
  cancelled: { label: 'Cancelado', accent: 'bg-ac', badge: 'bg-acsoft text-ac border border-acline' },
}

// Cómo se ve/llama cada tipo de pedido
const ORDER_TYPE_META = {
  local: { label: 'Local', icon: 'utensils', badge: 'bg-infosoft text-info border border-info' },
  online: { label: 'En línea', icon: 'globe', badge: 'bg-infosoft text-info border border-info' },
}

// El texto/ícono del botón de acción cambia no solo por estado, sino también
// por tipo de pedido: pasar de "ready" a "delivered" significa cosas
// distintas según sea local (servir en mesa), a domicilio o para recoger.
const getAction = (pedido) => {
  if (pedido.status === 'pending') return { label: 'Mandar a Cocina', icon: 'utensils' }
  if (pedido.status === 'preparing' || pedido.status === 'atrasado') return { label: 'Marcar como Listo', icon: 'check-circle' }
  if (pedido.status === 'ready') {
    if (pedido.orderType === 'local') return { label: 'Servir en Mesa', icon: 'hand-holding' }
    if (pedido.isDelivery) return { label: 'Marcar Entregado a Domicilio', icon: 'truck' }
    return { label: 'Marcar Recogido por Cliente', icon: 'shopping-bag' }
  }
  return { label: 'Avanzar', icon: 'arrow-right' }
}

// Tarjeta con estilo "recibo de cocina": franja de color por estado, división
// punteada tipo perforación y borde inferior dentado, en vez de un simple
// rectángulo plano.
export default function OrderCard({ pedido, onAdvance, onCancelRequest, onDeleteRequest }) {
  const { theme } = useTheme()
  const cutColor = theme === 'dark' ? '#202024' : 'white'
  const cutShade = theme === 'dark' ? '#1a1a1e' : '#f3f0eb'
  const meta = STATUS_META[pedido.status] || STATUS_META.pending
  const typeMeta = ORDER_TYPE_META[pedido.orderType] || ORDER_TYPE_META.local
  const esFinal = pedido.status === 'delivered' || pedido.status === 'cancelled'
  const codigo = `#${(pedido._id || '').slice(-4).toUpperCase()}`
  const action = getAction(pedido)

  const customerName = pedido.customer?.personalInfo
    ? `${pedido.customer.personalInfo.name || ''} ${pedido.customer.personalInfo.lastname || ''}`.trim()
    : 'Cliente'

  return (
    <div className="relative rounded-t-3xl overflow-hidden bg-surface border border-line hover:scale-[1.01] transition-transform flex flex-col">
      <div className={`h-1.5 w-full ${meta.accent}`} />

      <div className="p-4 sm:p-5 pb-3 flex-1">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-ink">{codigo}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wide ${typeMeta.badge}`}>
                <FAIcon icon={typeMeta.icon} size="xs" /> {typeMeta.label}
              </span>
            </div>

            {pedido.orderType === 'local' ? (
              <div className="text-xs text-muted font-medium mt-1">
                <FAIcon icon="chair" size="xs" /> {pedido.table?.number ? `Mesa ${pedido.table.number}` : 'Mesa —'}
                {pedido.waiter?.name && (
                  <span className="ml-2"><FAIcon icon="user" size="xs" /> {pedido.waiter.name}</span>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted font-medium mt-1">
                <FAIcon icon="user" size="xs" /> {customerName}
                <span className="ml-2">
                  <FAIcon icon={pedido.isDelivery ? 'truck' : 'shopping-bag'} size="xs" /> {pedido.isDelivery ? 'A domicilio' : 'Para recoger'}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-display font-bold text-sm text-ink">${Number(pedido.total).toFixed(2)}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wide ${meta.badge}`}>
              {meta.label}
            </span>
          </div>
        </div>

        {pedido.orderType === 'online' && pedido.isDelivery && pedido.deliveryAddress && (
          <div className="text-[11px] text-muted italic mb-1 truncate">
            <FAIcon icon="map-marker-alt" size="xs" /> {pedido.deliveryAddress}
          </div>
        )}

        {/* Perforación tipo recibo */}
        <div className="border-t-2 border-dashed border-line my-2" />

        <div className="flex flex-col gap-1 font-mono text-xs text-inkalt">
          {(pedido.items || []).length === 0 ? (
            <span className="text-muted italic">Sin productos</span>
          ) : (
            pedido.items.map((item, idx) => (
              <div key={idx} className="flex justify-between py-0.5">
                <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                {item.notes && <span className="text-muted italic truncate">{item.notes}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {!esFinal && (
        <div className="px-4 sm:px-5 pb-4 flex gap-2">
          <button
            onClick={() => onAdvance(pedido._id, pedido.status)}
            className="flex-1 py-2.5 bg-ac hover:bg-ac text-white text-xs font-display font-semibold rounded-none flex items-center justify-center gap-2 transition-all
              active:
            "
          >
            <FAIcon icon={action.icon} />
            {action.label}
          </button>
          <button
            onClick={() => onCancelRequest(pedido)}
            className="px-3 py-2.5 text-muted hover:text-ac hover:bg-acsoft rounded-none transition-colors border border-line"
            title="Cancelar pedido"
          >
            <FAIcon icon="ban" size="sm" />
          </button>
        </div>
      )}

      {esFinal && (
        <div className="px-4 sm:px-5 pb-4">
          <button
            onClick={() => onDeleteRequest(pedido._id)}
            className="w-full py-2 text-xs font-display font-semibold text-muted hover:text-ac hover:bg-acsoft rounded-none transition-colors border border-line"
          >
            <FAIcon icon="trash-alt" size="sm" className="mr-1" /> Eliminar registro
          </button>
        </div>
      )}

      {/* Borde inferior dentado, efecto de recibo cortado */}
      <div
        className="h-3 w-full"
        style={{
          backgroundColor: cutColor,
          backgroundImage:
            `linear-gradient(135deg, ${cutShade} 25%, transparent 25%), linear-gradient(225deg, ${cutShade} 25%, transparent 25%)`,
          backgroundSize: '16px 16px',
          backgroundPosition: 'bottom left',
        }}
      />
    </div>
  )
}
