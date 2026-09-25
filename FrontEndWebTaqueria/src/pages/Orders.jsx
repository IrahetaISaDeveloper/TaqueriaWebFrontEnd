import React, { useState, useMemo } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import FAIcon from '../components/commons/FAIcon'
import OrderCard from '../components/orders/OrderCard'
import InvoiceTable from '../components/orders/InvoiceTable'
import CancelOrderModal from '../components/orders/CancelOrderModal'
import ConfirmModal from '../components/commons/ConfirmModal'
import useOrders from '../hooks/useOrders'
import useInvoices from '../hooks/useInvoices'
import { ToastProvider, useToast } from '../components/commons/ToastProvider'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import ReportButton from '../components/commons/ReportButton'
import { ordersReportColumns, invoicesReportColumns } from '../constants/reportConfigs'

// Pestañas principales con la tipografía monoespaciada exacta del diseño (IBM Plex Mono, versalitas espaciadas)
const SECTION_TABS = [
  { id: 'orders', label: 'PEDIDOS' },
  { id: 'invoices', label: 'ÓRDENES (FACTURACIÓN)' },
  { id: 'scheduled', label: 'PEDIDOS PROGRAMADOS' },
]

// Filtros tipo píldora
const ORDER_TYPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'local', label: 'Local' },
  { id: 'online', label: 'En línea' },
]

// Pestañas de estado para cocina (IBM Plex Mono, mayúsculas con tracking amplio)
const STATUS_TABS = [
  { key: 'pendientes', label: 'PENDIENTES', status: 'pending' },
  { key: 'cocina', label: 'EN COCINA', status: 'preparing' },
  { key: 'atrasados', label: 'ATRASADOS', status: 'atrasado' },
  { key: 'listos', label: 'LISTOS', status: 'ready' },
  { key: 'entregados', label: 'ENTREGADOS', status: 'delivered' },
  { key: 'cancelados', label: 'CANCELADOS', status: 'cancelled' },
]

// Calcula el tiempo promedio entre En Preparación y Listo
const calcularTiempoPromedio = (orders) => {
  const duraciones = []
  orders.forEach((o) => {
    const historial = o.statusHistory || []
    const inicioPreparacion = historial.find((h) => h.status === 'preparing')
    const listo = historial.find((h) => h.status === 'ready')
    if (inicioPreparacion && listo) {
      const diff = new Date(listo.changedAt) - new Date(inicioPreparacion.changedAt)
      if (diff > 0) duraciones.push(diff)
    }
  })
  if (duraciones.length === 0) return null
  return duraciones.reduce((a, b) => a + b, 0) / duraciones.length
}

const formatearDuracion = (ms) => {
  const totalSegundos = Math.round(ms / 1000)
  const min = Math.floor(totalSegundos / 60)
  const seg = totalSegundos % 60
  return `${min}m ${seg}s`
}

// Distribución por hora: 10A, 11A, 12P, 1P, 2P, 3P, 4P
const calcularTraficoPorHora = (orders) => {
  const horasMuestra = [10, 11, 12, 13, 14, 15, 16]
  const conteo = {}
  horasMuestra.forEach((h) => { conteo[h] = 0 })

  orders.forEach((o) => {
    if (!o.createdAt) return
    const hora = new Date(o.createdAt).getHours()
    if (conteo[hora] !== undefined) {
      conteo[hora] += 1
    } else {
      conteo[hora] = 1
    }
  })

  const formatearHoraLabel = (h) => {
    const suffix = h < 12 ? 'A' : 'P'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}${suffix}`
  }

  const horasOrdenadas = Object.keys(conteo).map(Number).sort((a, b) => a - b)
  return horasOrdenadas.map((hora) => ({
    hora: formatearHoraLabel(hora),
    rawHour: hora,
    pedidos: conteo[hora],
  }))
}

// Barra de pestañas que abarca todo el ancho con la tipografía monoespaciada exacta de la foto
function SectionTabs({ section, setSection }) {
  return (
    <div className="flex items-center gap-8 sm:gap-10 border-b border-line mb-6 overflow-x-auto w-full">
      {SECTION_TABS.map((tab) => {
        const isActive = section === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`pb-3 font-mono text-xs sm:text-[13px] tracking-[0.14em] uppercase transition-colors relative whitespace-nowrap ${
              isActive
                ? 'text-ink font-semibold'
                : 'text-muted hover:text-ink font-medium'
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ac" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Filtro de tipo en píldoras con tipografía monoespaciada
function OrderTypeFilterBar({ orderTypeFilter, setOrderTypeFilter }) {
  return (
    <div className="flex items-center gap-2 mb-6 w-full">
      <span className="font-mono text-xs tracking-[0.14em] uppercase font-semibold text-muted mr-1">
        TIPO
      </span>
      {ORDER_TYPE_FILTERS.map((f) => {
        const isActive = orderTypeFilter === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => setOrderTypeFilter(f.id)}
            className={`px-4 py-1 font-mono text-xs tracking-[0.08em] uppercase rounded-full transition-colors ${
              isActive
                ? 'border border-ac text-ac bg-acsoft/40 font-semibold'
                : 'border border-line text-muted hover:text-ink hover:border-linealt bg-surface font-medium'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

// Tira de métricas en 3 columnas que se expande a todo el ancho
function StatsRow({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8 w-full">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          onClick={stat.onClick}
          className={`flex flex-col relative w-full ${stat.onClick ? 'cursor-pointer group' : ''} ${
            idx === 0 ? 'border-t-2 border-ac pt-3' : 'border-t border-line/70 pt-3'
          }`}
        >
          <span className="font-mono text-xs tracking-[0.14em] uppercase text-muted font-semibold">
            {stat.title}
          </span>
          <span className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink leading-tight my-2 num group-hover:text-ac transition-colors">
            {stat.value}
          </span>
          <span className="font-sans text-xs text-muted font-normal">
            {stat.subtitle}
          </span>
        </div>
      ))}
    </div>
  )
}

function OrdersPanel({ orderTypeFilter, setOrderTypeFilter }) {
  const [tabActiva, setTabActiva] = useState('pendientes')
  const [soloMasCaro, setSoloMasCaro] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, orderId: null })
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const { orders: allOrders, loading, updateOrderStatus, cancelOrder, deleteOrder } = useOrders()
  const { addToast } = useToast()

  const orders = useMemo(() => {
    if (orderTypeFilter === 'all') return allOrders
    return allOrders.filter((o) => o.orderType === orderTypeFilter)
  }, [allOrders, orderTypeFilter])

  const listasPorEstado = useMemo(() => {
    const mapa = {}
    STATUS_TABS.forEach((tab) => {
      mapa[tab.key] = orders.filter((o) => o.status === tab.status)
    })
    return mapa
  }, [orders])

  const totalPedidosHoy = orders.length

  const tiempoPromedioMs = useMemo(() => calcularTiempoPromedio(orders), [orders])
  const tiempoPromedioLabel = tiempoPromedioMs != null ? formatearDuracion(tiempoPromedioMs) : '8m 40s'

  const pedidoMasCaro = useMemo(() => {
    const activos = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
    if (activos.length === 0) return null
    return activos.reduce((max, o) => (Number(o.total) > Number(max.total) ? o : max), activos[0])
  }, [orders])

  const enCocinaTotal = useMemo(() => {
    const activos = orders.filter((o) => o.status === 'preparing' || o.status === 'atrasado')
    return activos.reduce((acc, o) => acc + Number(o.total || 0), 0)
  }, [orders])

  const traficoPorHora = useMemo(() => calcularTraficoPorHora(orders), [orders])

  const maxTraficoHora = useMemo(() => {
    if (!traficoPorHora.length) return null
    return traficoPorHora.reduce((max, h) => (h.pedidos > max.pedidos ? h : max), traficoPorHora[0])
  }, [traficoPorHora])

  const pedidosAtrasados = useMemo(() => {
    const now = Date.now()
    return orders.filter((o) => {
      if (o.status === 'atrasado') return true
      if (o.status === 'preparing') {
        const prep = (o.statusHistory || []).find((h) => h.status === 'preparing')
        const start = prep ? new Date(prep.changedAt).getTime() : new Date(o.updatedAt || o.createdAt).getTime()
        return (now - start) > 20 * 60 * 1000
      }
      return false
    })
  }, [orders])

  const listaActiva = useMemo(() => {
    const base = listasPorEstado[tabActiva] || []
    if (!soloMasCaro || base.length === 0) return base
    const max = base.reduce((m, o) => (Number(o.total) > Number(m.total) ? o : m), base[0])
    return [max]
  }, [listasPorEstado, tabActiva, soloMasCaro])

  const handleRequestDelete = (id) => {
    setConfirmDelete({ isOpen: true, orderId: id })
  }

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.orderId
    if (!id) return
    try {
      await deleteOrder(id)
      addToast('Registro eliminado correctamente', 'success')
    } catch (err) {
      addToast('Error al eliminar el pedido', 'error')
    } finally {
      setConfirmDelete({ isOpen: false, orderId: null })
    }
  }

  const handleAdvance = async (id, currentStatus) => {
    try {
      await updateOrderStatus(id, currentStatus)
      addToast(`Pedido #${id.slice(-4).toUpperCase()} actualizado`, 'success')
    } catch (err) {
      addToast('Error al actualizar el pedido', 'error')
    }
  }

  const handleCancelConfirm = async (password) => {
    if (!cancelTarget) return { success: false }
    setCancelLoading(true)
    const result = await cancelOrder(cancelTarget._id, password)
    setCancelLoading(false)
    if (result.success) {
      addToast('Pedido cancelado', 'success')
      setCancelTarget(null)
    }
    return result
  }

  const stats = [
    {
      title: 'TOTAL PEDIDOS HOY',
      value: totalPedidosHoy,
      subtitle: `${totalPedidosHoy} pedidos registrados`,
    },
    {
      title: 'TIEMPO PROMEDIO',
      value: tiempoPromedioLabel,
      subtitle: 'En preparación → Listo',
    },
    {
      title: 'EN COCINA',
      value: enCocinaTotal > 0 ? `$${enCocinaTotal.toFixed(2)}` : (pedidoMasCaro ? `$${Number(pedidoMasCaro.total).toFixed(2)}` : '$0.00'),
      subtitle: pedidoMasCaro ? `Pedido más caro: #${pedidoMasCaro._id.slice(-4).toUpperCase()}` : 'Sin pedidos activos',
      onClick: () => setSoloMasCaro((v) => !v),
    },
  ]

  return (
    <>
      <OrderTypeFilterBar
        orderTypeFilter={orderTypeFilter}
        setOrderTypeFilter={setOrderTypeFilter}
      />

      <StatsRow stats={stats} />

      {/* Tabs de estado con tipografía IBM Plex Mono con tracking amplio y línea roja activa */}
      <div className="flex items-center gap-7 sm:gap-9 border-b border-line mb-6 overflow-x-auto w-full">
        {STATUS_TABS.map((tab) => {
          const isActive = tabActiva === tab.key
          const count = listasPorEstado[tab.key]?.length || 0
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabActiva(tab.key)}
              className={`pb-2.5 font-mono text-xs sm:text-[12px] tracking-[0.14em] uppercase transition-colors relative whitespace-nowrap ${
                isActive
                  ? 'text-ac font-semibold'
                  : 'text-muted hover:text-ink font-medium'
              }`}
            >
              {tab.label} ({count})
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ac" />
              )}
            </button>
          )
        })}
      </div>

      {/* Disposición que aprovecha todo el ancho de la pantalla */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        {/* Grilla principal de tarjetas de pedidos: expandida a 2, 3 o 4 columnas según la pantalla */}
        <div className="flex-1 w-full min-w-0">
          {loading ? (
            <div className="text-center py-16 text-muted text-sm flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-ac"></span>
              Cargando pedidos...
            </div>
          ) : listaActiva.length === 0 ? (
            <div className="bg-surface border border-line p-14 text-center font-mono text-xs tracking-[0.14em] uppercase text-muted w-full">
              No hay pedidos en este estado
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {listaActiva.map((pedido) => (
                <OrderCard
                  key={pedido._id}
                  pedido={pedido}
                  onAdvance={handleAdvance}
                  onCancelRequest={setCancelTarget}
                  onDeleteRequest={handleRequestDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panel lateral derecho: Gráfica de Tráfico + Alerta de Atrasados */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-5 shrink-0">
          {/* Gráfico de barras */}
          <div className="bg-surface border border-line p-5 w-full">
            <h3 className="font-mono text-xs tracking-[0.14em] uppercase font-semibold text-ink mb-4">
              Tráfico de pedidos por hora
            </h3>

            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={traficoPorHora} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="hora"
                    tick={{ fontSize: 10, fill: '#75798c', fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-line)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      borderRadius: '0px',
                    }}
                    formatter={(val) => [`${val} pedido${val === 1 ? '' : 's'}`, '']}
                    labelFormatter={(label) => `Hora: ${label}`}
                  />
                  <Bar dataKey="pedidos" radius={[0, 0, 0, 0]}>
                    {traficoPorHora.map((entry, index) => {
                      const isPeak = maxTraficoHora && maxTraficoHora.pedidos > 0 && entry.rawHour === maxTraficoHora.rawHour
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isPeak ? '#a33527' : '#d8dde8'}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tarjeta informativa de atrasados */}
          <div className="bg-[#fcf3f3] border border-red-200/90 p-5 w-full">
            <h4 className="font-mono text-xs font-bold text-ac uppercase tracking-[0.14em] mb-2">
              ATRASADOS
            </h4>
            <p className="text-xs text-inkalt leading-relaxed font-sans">
              {pedidosAtrasados.length > 0 ? (
                <>
                  <span className="font-semibold">{pedidosAtrasados.length}</span> pedido{pedidosAtrasados.length > 1 ? 's llevan' : ' lleva'} más de 20 minutos en cocina:{' '}
                  <span className="font-mono font-semibold">
                    {pedidosAtrasados.map((p) => `#${p._id.slice(-4).toUpperCase()}`).join(' y ')}
                  </span>.
                </>
              ) : (
                'No hay pedidos con más de 20 minutos en cocina.'
              )}
            </p>
          </div>
        </div>
      </div>

      <CancelOrderModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        orderCode={cancelTarget ? `#${cancelTarget._id.slice(-4).toUpperCase()}` : ''}
        loading={cancelLoading}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, orderId: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar registro"
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        loading={loading}
      />
    </>
  )
}

function InvoicesPanel({ orderTypeFilter, setOrderTypeFilter }) {
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, invoiceId: null })
  const { invoices: allInvoices, loading, fetchInvoices } = useInvoices()
  const { addToast } = useToast()

  const invoices = useMemo(() => {
    if (orderTypeFilter === 'all') return allInvoices
    return allInvoices.filter((i) => i.orderType === orderTypeFilter)
  }, [allInvoices, orderTypeFilter])

  const totalFacturado = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0)
  const ventas = invoices.length
  const ticketPromedio = ventas > 0 ? totalFacturado / ventas : 0

  const handleRequestDelete = (id) => setConfirmDelete({ isOpen: true, invoiceId: id })

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.invoiceId
    if (!id) return
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_URL}/invoices/${id}`, { credentials: 'include', method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      addToast('Registro de facturación eliminado', 'success')
      await fetchInvoices()
    } catch (err) {
      addToast('Error al eliminar el registro', 'error')
    } finally {
      setConfirmDelete({ isOpen: false, invoiceId: null })
    }
  }

  const stats = [
    {
      title: 'TOTAL FACTURADO',
      value: `$${totalFacturado.toFixed(2)}`,
      subtitle: `${ventas} pedidos registrados`,
    },
    {
      title: 'VENTAS',
      value: ventas,
      subtitle: 'Facturas emitidas',
    },
    {
      title: 'TICKET PROMEDIO',
      value: `$${ticketPromedio.toFixed(2)}`,
      subtitle: 'Por venta',
    },
  ]

  return (
    <div className="w-full">
      <OrderTypeFilterBar
        orderTypeFilter={orderTypeFilter}
        setOrderTypeFilter={setOrderTypeFilter}
      />

      <StatsRow stats={stats} />

      <div className="w-full bg-surface border border-line overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
          <h2 className="font-mono text-xs sm:text-sm tracking-[0.14em] uppercase font-semibold text-ink">
            Historial de Facturación
          </h2>
          <span className="font-mono text-xs tracking-[0.14em] uppercase text-muted">
            {ventas} registro{ventas === 1 ? '' : 's'}
          </span>
        </div>
        <InvoiceTable invoices={invoices} loading={loading} onDeleteRequest={handleRequestDelete} />
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, invoiceId: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar registro de facturación"
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        loading={loading}
      />
    </div>
  )
}

function ScheduledPanel() {
  const { orders, loading, updateOrderStatus, cancelOrder, deleteOrder } = useOrders()
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, orderId: null })
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const { addToast } = useToast()

  const scheduledOrders = useMemo(() => {
    return orders
      .filter((o) => o.scheduledFor)
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
  }, [orders])

  const totalEstimado = scheduledOrders.reduce((acc, o) => acc + Number(o.total || 0), 0)
  const proximaEntrega = scheduledOrders.length > 0
    ? new Date(scheduledOrders[0].scheduledFor).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
    : 'Ninguna'

  const handleRequestDelete = (id) => setConfirmDelete({ isOpen: true, orderId: id })

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.orderId
    if (!id) return
    try {
      await deleteOrder(id)
      addToast('Registro eliminado correctamente', 'success')
    } catch (err) {
      addToast('Error al eliminar el pedido', 'error')
    } finally {
      setConfirmDelete({ isOpen: false, orderId: null })
    }
  }

  const handleAdvance = async (id, currentStatus) => {
    try {
      await updateOrderStatus(id, currentStatus)
      addToast(`Pedido #${id.slice(-4).toUpperCase()} actualizado`, 'success')
    } catch (err) {
      addToast('Error al actualizar el pedido', 'error')
    }
  }

  const handleCancelConfirm = async (password) => {
    if (!cancelTarget) return { success: false }
    setCancelLoading(true)
    const result = await cancelOrder(cancelTarget._id, password)
    setCancelLoading(false)
    if (result.success) {
      addToast('Pedido cancelado', 'success')
      setCancelTarget(null)
    }
    return result
  }

  const stats = [
    {
      title: 'PEDIDOS PROGRAMADOS',
      value: scheduledOrders.length,
      subtitle: 'Pendientes de preparar',
    },
    {
      title: 'PRÓXIMA ENTREGA',
      value: proximaEntrega,
      subtitle: scheduledOrders.length > 0 ? 'Horario de despacho más cercano' : 'Sin entregas pendientes',
    },
    {
      title: 'TOTAL ESTIMADO',
      value: `$${totalEstimado.toFixed(2)}`,
      subtitle: 'En comandas agendadas',
    },
  ]

  return (
    <div className="w-full">
      <StatsRow stats={stats} />

      {loading ? (
        <div className="text-center py-16 text-muted text-sm flex items-center justify-center gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-ac"></span>
          Cargando pedidos...
        </div>
      ) : scheduledOrders.length === 0 ? (
        <div className="w-full bg-surface border border-line p-16 text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-1">
            NO HAY PEDIDOS PROGRAMADOS
          </p>
          <p className="text-xs text-muted font-sans">
            Los pedidos programados para fechas u horarios futuros aparecerán listados aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {scheduledOrders.map((pedido) => (
            <div key={pedido._id} className="flex flex-col w-full">
              <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono tracking-[0.14em] uppercase font-semibold bg-surfalt text-inkalt border border-line w-fit">
                <FAIcon icon="calendar-clock" size="xs" className="text-ac" />
                PROGRAMADO: {new Date(pedido.scheduledFor).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <OrderCard
                pedido={pedido}
                onAdvance={handleAdvance}
                onCancelRequest={setCancelTarget}
                onDeleteRequest={handleRequestDelete}
              />
            </div>
          ))}
        </div>
      )}

      <CancelOrderModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        orderCode={cancelTarget ? `#${cancelTarget._id.slice(-4).toUpperCase()}` : ''}
        loading={cancelLoading}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, orderId: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar registro"
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        loading={loading}
      />
    </div>
  )
}

function OrdersContent() {
  const [activeMenu] = useState('orders-list')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [section, setSection] = useState('orders')
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')

  const { orders: allOrders } = useOrders()
  const { invoices: allInvoices } = useInvoices()

  const orders = useMemo(() => {
    if (orderTypeFilter === 'all') return allOrders
    return allOrders.filter((o) => o.orderType === orderTypeFilter)
  }, [allOrders, orderTypeFilter])

  const invoices = useMemo(() => {
    if (orderTypeFilter === 'all') return allInvoices
    return allInvoices.filter((i) => i.orderType === orderTypeFilter)
  }, [allInvoices, orderTypeFilter])

  const reportRows = section === 'invoices' ? invoices : orders
  const reportColumns = section === 'invoices' ? invoicesReportColumns : ordersReportColumns
  const reportTitle = section === 'orders' ? 'Pedidos' : section === 'invoices' ? 'Facturacion' : 'Pedidos Programados'
  const reportButtonText = section === 'orders' ? 'Exportar pedidos' : section === 'invoices' ? 'Exportar facturas' : 'Exportar programados'

  const reportSummary = useMemo(() => {
    if (section === 'invoices') {
      const totalFacturado = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0)
      const ticketPromedio = invoices.length > 0 ? totalFacturado / invoices.length : 0
      return [
        { label: 'Ventas facturadas', value: invoices.length },
        { label: 'Total facturado', value: `$${totalFacturado.toFixed(2)}` },
        { label: 'Ticket promedio', value: `$${ticketPromedio.toFixed(2)}` },
      ]
    }
    return [
      { label: 'Pedidos', value: orders.length },
      { label: 'Entregados', value: orders.filter((o) => o.status === 'delivered').length },
      { label: 'Cancelados', value: orders.filter((o) => o.status === 'cancelled').length },
    ]
  }, [section, orders, invoices])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg w-full">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* min-h-0 y overflow-hidden para garantizar que el scroll interno funcione perfecto */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Contenedor principal que abarca el 100% de la pantalla sin límites rígidos de ancho */}
        <main className="flex-1 overflow-y-auto min-h-0 overscroll-contain w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 pb-28">
            {/* Encabezado con título a la izquierda y botón de exportar a la derecha */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink mb-1">
                  Pedidos y Órdenes
                </h1>
                <p className="text-sm text-muted font-sans">
                  Monitorea el flujo de pedidos en cocina y consulta el historial de facturación
                </p>
              </div>

              <div>
                <ReportButton
                  title={reportTitle}
                  subtitle={orderTypeFilter === 'all' ? undefined : `Filtro: ${orderTypeFilter}`}
                  columns={reportColumns}
                  rows={reportRows}
                  buttonText={reportButtonText}
                  itemTag={section === 'invoices' ? 'factura' : 'pedido'}
                  summary={reportSummary}
                />
              </div>
            </div>

            {/* Subpestañas PEDIDOS | ÓRDENES (FACTURACIÓN) | PEDIDOS PROGRAMADOS */}
            <SectionTabs section={section} setSection={setSection} />

            {/* Contenido según pestaña activa */}
            {section === 'orders' ? (
              <OrdersPanel
                orderTypeFilter={orderTypeFilter}
                setOrderTypeFilter={setOrderTypeFilter}
              />
            ) : section === 'invoices' ? (
              <InvoicesPanel
                orderTypeFilter={orderTypeFilter}
                setOrderTypeFilter={setOrderTypeFilter}
              />
            ) : (
              <ScheduledPanel />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function Orders() {
  return (
    <ToastProvider>
      <OrdersContent />
    </ToastProvider>
  )
}
