import React, { useState, useMemo } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import ComboStats from '../components/dashboard/ComboStats'
import FAIcon from '../components/commons/FAIcon'
import OrderCard from '../components/orders/OrderCard'
import InvoiceTable from '../components/orders/InvoiceTable'
import CancelOrderModal from '../components/orders/CancelOrderModal'
import ConfirmModal from '../components/commons/ConfirmModal'
import useOrders from '../hooks/useOrders'
import useInvoices from '../hooks/useInvoices'
import { ToastProvider, useToast } from '../components/commons/ToastProvider'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import ReportButton from '../components/commons/ReportButton'
import { ordersReportColumns, invoicesReportColumns } from '../constants/reportConfigs'

// Sección principal: igual que Inventario separa Productos/Activos fijos en
// dos pestañas dentro de una sola página, aquí "Pedidos" (el flujo operativo
// de cocina/mesa) y "Órdenes" (el historial de facturación) viven juntos.
const SECTION_TABS = [
  { id: 'orders', label: 'Pedidos', icon: 'receipt' },
  { id: 'invoices', label: 'Órdenes', icon: 'file-invoice-dollar' },
  { id: 'scheduled', label: 'Pedidos programados', icon: 'calendar-clock' },
]

// Un pedido puede venir del restaurante (local) o de la web/app (online).
// Ambos comparten los mismos estados y el mismo tablero, pero se pueden
// filtrar por separado.
const ORDER_TYPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'local', label: 'Local' },
  { id: 'online', label: 'En línea' },
]

const STATUS_TABS = [
  { key: 'pendientes', label: 'Pendientes', status: 'pending' },
  { key: 'cocina', label: 'En Cocina', status: 'preparing' },
  { key: 'atrasados', label: 'Atrasados', status: 'atrasado' },
  { key: 'listos', label: 'Listos', status: 'ready' },
  { key: 'entregados', label: 'Entregados', status: 'delivered' },
  { key: 'cancelados', label: 'Cancelados', status: 'cancelled' },
]

// Calcula el promedio de tiempo entre que un pedido entra a "preparing" (En Preparación) y pasa a "ready" (Listo)
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

// Agrupa los pedidos por hora de creación para ver a qué horas hay más tráfico
const calcularTraficoPorHora = (orders) => {
  const counts = {}
  orders.forEach((o) => {
    if (!o.createdAt) return
    const hora = new Date(o.createdAt).getHours()
    counts[hora] = (counts[hora] || 0) + 1
  })
  return Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b)
    .map((hora) => ({
      hora: `${hora % 12 === 0 ? 12 : hora % 12}${hora < 12 ? 'am' : 'pm'}`,
      pedidos: counts[hora],
    }))
}

function SectionTabs({ section, setSection }) {
  return (
    <div className="flex gap-3 mb-6">
      {SECTION_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setSection(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-none font-display font-semibold text-sm transition-all ${
            section === tab.id
              ? 'bg-ac text-white'
              : 'bg-surface text-inkalt border border-line hover:bg-surfalt'
          }`}
        >
          <FAIcon icon={tab.icon} size="sm" />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function OrdersPanel() {
  const [tabActiva, setTabActiva] = useState('pendientes')
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
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
  const tiempoPromedioLabel = tiempoPromedioMs != null ? formatearDuracion(tiempoPromedioMs) : 'Sin datos'

  const pedidoMasCaro = useMemo(() => {
    const activos = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
    if (activos.length === 0) return null
    return activos.reduce((max, o) => (Number(o.total) > Number(max.total) ? o : max), activos[0])
  }, [orders])

  const traficoPorHora = useMemo(() => calcularTraficoPorHora(orders), [orders])

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

  return (
    <>
      {/* Filtro por tipo de pedido */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-display font-bold text-muted uppercase tracking-wider mr-1">Tipo:</span>
        {ORDER_TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setOrderTypeFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-display font-semibold rounded-none transition-all ${
              orderTypeFilter === f.id
                ? 'bg-ink text-white'
                : 'bg-surface text-muted border border-line hover:bg-surfalt'
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* El reporte incluye TODOS los pedidos del filtro de tipo activo,
            no solo la pestaña de estado que se este viendo: un reporte de
            "pedidos" que omitiera los entregados seria enganoso. */}
        <ReportButton
          title="Pedidos"
          subtitle={orderTypeFilter === 'all' ? undefined : `Solo pedidos de tipo: ${orderTypeFilter}`}
          columns={ordersReportColumns}
          rows={orders}
          itemTag="pedido"
          className="ml-auto"
          summary={[
            { label: 'Pedidos', value: orders.length },
            { label: 'Entregados', value: orders.filter((o) => o.status === 'delivered').length },
            { label: 'Cancelados', value: orders.filter((o) => o.status === 'cancelled').length },
          ]}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          {/* Tabs de estado */}
          <div className="bg-surface backdrop-blur-sm p-1 rounded-none flex flex-wrap gap-1 border border-line mb-6 w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTabActiva(tab.key)}
                className={`px-4 py-2 text-xs font-display font-bold rounded-none transition-all ${
                  tabActiva === tab.key
                    ? 'bg-ac text-white'
                    : 'bg-transparent text-muted hover:text-inkalt'
                }`}
              >
                {tab.label} ({listasPorEstado[tab.key]?.length || 0})
              </button>
            ))}
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <ComboStats
              icon="list"
              title="TOTAL PEDIDOS HOY"
              value={totalPedidosHoy}
              label={`${totalPedidosHoy} pedidos registrados`}
              highlighted={true}
            />
            <ComboStats
              icon="clock"
              title="TIEMPO PROMEDIO"
              value={tiempoPromedioLabel}
              label="En Preparación → Listo"
              highlighted={true}
            />
            <ComboStats
              icon="dollar-sign"
              title="EN COCINA"
              value={pedidoMasCaro ? `$${Number(pedidoMasCaro.total).toFixed(2)}` : '—'}
              label={pedidoMasCaro ? `Pedido más caro: #${pedidoMasCaro._id.slice(-4).toUpperCase()}` : 'Sin pedidos activos'}
              highlighted={true}
              active={soloMasCaro}
              onClick={() => setSoloMasCaro((v) => !v)}
            />
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted font-medium">Cargando pedidos...</div>
          ) : (
            <div>
              <h3 className="text-lg font-display font-bold text-ink mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-ac rounded-full"></span>
                {STATUS_TABS.find((t) => t.key === tabActiva)?.label}
                {soloMasCaro && <span className="text-xs font-medium text-muted ml-1">(pedido más caro)</span>}
              </h3>

              {listaActiva.length === 0 ? (
                <div className="text-center py-10 font-display font-bold text-muted text-xs uppercase tracking-wider">
                  No hay pedidos en este estado.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
          )}
        </div>

        {/* Panel lateral de resumen con estilo clay */}
        <div className="w-full lg:w-72 flex flex-col gap-6">
          <div className="bg-surface rounded-none p-5 border border-line">
            <h3 className="text-sm font-display font-bold text-ink mb-4">Tráfico de Pedidos por Hora</h3>
            {traficoPorHora.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-xs text-muted text-center px-2">
                Aún no hay pedidos suficientes para mostrar el tráfico
              </div>
            ) : (
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={traficoPorHora}>
                    <XAxis dataKey="hora" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                    <Tooltip formatter={(value) => [`${value} pedido${value === 1 ? '' : 's'}`, '']} labelFormatter={(l) => l} />
                    <Bar dataKey="pedidos" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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

// Pedidos en línea que el cliente programó para una fecha/hora futura, en
// vez de prepararse de inmediato (ver order.scheduledFor en el backend).
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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <ComboStats
          icon="calendar-clock"
          title="PEDIDOS PROGRAMADOS"
          value={scheduledOrders.length}
          label="Pendientes de preparar"
          highlighted={true}
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted font-medium">Cargando pedidos...</div>
      ) : scheduledOrders.length === 0 ? (
        <div className="text-center py-10 font-display font-bold text-muted text-xs uppercase tracking-wider">
          No hay pedidos programados
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {scheduledOrders.map((pedido) => (
            <div key={pedido._id}>
              <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-semibold bg-infosoft text-info border border-info">
                <FAIcon icon="calendar-clock" size="xs" />
                Programado: {new Date(pedido.scheduledFor).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' })}
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
    </>
  )
}

function InvoicesPanel() {
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-display font-bold text-muted uppercase tracking-wider mr-1">Tipo:</span>
        {ORDER_TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setOrderTypeFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-display font-semibold rounded-none transition-all ${
              orderTypeFilter === f.id
                ? 'bg-ink text-white'
                : 'bg-surface text-muted border border-line hover:bg-surfalt'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <ComboStats
          icon="dollar-sign"
          title="TOTAL FACTURADO"
          value={`$${totalFacturado.toFixed(2)}`}
          label={`${ventas} pedidos registrados`}
          highlighted={true}
        />
        <ComboStats
          icon="receipt"
          title="VENTAS"
          value={ventas}
          label="Facturas emitidas"
          highlighted={true}
        />
        <ComboStats
          icon="clock"
          title="TICKET PROMEDIO"
          value={`$${ticketPromedio.toFixed(2)}`}
          label="Por venta"
          highlighted={true}
        />
      </div>

      <div className="bg-surface rounded-none border border-line overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-wrap justify-between items-center gap-3 border-b border-line">
          <h2 className="text-lg font-display font-bold text-ink">Historial de Facturación</h2>

          <ReportButton
            title="Facturacion"
            subtitle={orderTypeFilter === 'all' ? undefined : `Solo ventas de tipo: ${orderTypeFilter}`}
            columns={invoicesReportColumns}
            rows={invoices}
            itemTag="factura"
            summary={[
              { label: 'Ventas facturadas', value: ventas },
              { label: 'Total facturado', value: `$${totalFacturado.toFixed(2)}` },
              { label: 'Ticket promedio', value: `$${ticketPromedio.toFixed(2)}` },
            ]}
          />
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
    </>
  )
}

function OrdersContent() {
  const [activeMenu] = useState('orders-list')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [section, setSection] = useState('orders')

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
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">Pedidos y Órdenes</h1>
              <p className="text-sm sm:text-base text-inkalt">
                Monitorea el flujo de pedidos en cocina y consulta el historial de facturación.
              </p>
            </div>

            <SectionTabs section={section} setSection={setSection} />

            {section === 'orders' ? <OrdersPanel /> : section === 'invoices' ? <InvoicesPanel /> : <ScheduledPanel />}
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
