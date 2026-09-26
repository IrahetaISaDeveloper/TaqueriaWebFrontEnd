// src/pages/ClientManagement.jsx
import React, { useState, useMemo, useEffect } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import FAIcon from '../components/commons/FAIcon'
import ClientDetailModal from '../components/client/ClientDetailModal'
import ClientLeaderboardModal from '../components/client/ClientLeaderboardModal'
import ConfirmModal from '../components/commons/ConfirmModal'
import PaginationControls from '../components/commons/PaginationControls'
import useClients from '../hooks/useClients'
import useCustomerLeaderboard from '../hooks/useCustomerLeaderboard'
import usePagination from '../hooks/usePagination'
import { ToastProvider, useToast } from '../components/commons/ToastProvider'
import { useAuth } from '../hooks/auth/useAuth'
import { hasPermission } from '../constants/permissions'
import ReportButton from '../components/commons/ReportButton'
import { clientsReportColumns } from '../constants/reportConfigs'
import { getPrimaryPhone } from '../utils/customerPhones'

function ClientManagementContent() {
  const [activeMenu] = useState('clients')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewingClient, setViewingClient] = useState(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [activeDropdownId, setActiveDropdownId] = useState(null)
  const [confirmStatus, setConfirmStatus] = useState({ isOpen: false, client: null })

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [verificationFilter, setVerificationFilter] = useState('Todos')

  const { clients = [], isLoading, toggleClientStatus, fetchClientOrders } = useClients()
  const {
    mostActive,
    topSpenders,
    priciestWeek,
    period: leaderboardPeriod,
    loading: loadingLeaderboard,
    fetchLeaderboard,
    customRange,
    setCustomRange,
  } = useCustomerLeaderboard()
  const { user } = useAuth()
  const { addToast } = useToast()

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    if (!activeDropdownId) return
    const handleClose = () => setActiveDropdownId(null)
    window.addEventListener('click', handleClose)
    return () => window.removeEventListener('click', handleClose)
  }, [activeDropdownId])

  // Dar de baja a un cliente va detrás de su propio permiso de acción
  const canManageStatus = hasPermission(user, 'clients_manage_status')

  const handleToggleStatus = async (client, newStatus) => {
    const result = await toggleClientStatus(client._id, newStatus)

    addToast(
      result.success
        ? (result.message || (newStatus === 'active' ? 'Cliente reactivado correctamente' : 'Cliente desactivado correctamente'))
        : result.message,
      result.success ? 'success' : 'error'
    )

    if (result.success) {
      setViewingClient((prev) => (prev && prev._id === client._id ? { ...prev, status: newStatus } : prev))
    }

    return result
  }

  const handleConfirmToggleStatus = async () => {
    const client = confirmStatus.client
    if (!client) return

    const currentStatus = client.status || 'active'
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

    await handleToggleStatus(client, newStatus)
    setConfirmStatus({ isOpen: false, client: null })
  }

  // Filtrado de clientes
  const filteredClients = useMemo(() => {
    if (!clients.length) return []
    return clients.filter((client) => {
      const firstName = client.personalInfo?.name || ''
      const lastName = client.personalInfo?.lastname || ''
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase()
      const email = (client.loginInfo?.email || '').toLowerCase()
      const phone = getPrimaryPhone(client).toLowerCase()
      const search = searchTerm.toLowerCase().trim()

      const matchesSearch =
        !search || fullName.includes(search) || email.includes(search) || phone.includes(search)

      const isActive = (client.status || 'active') === 'active'
      const matchesStatus =
        statusFilter === 'Todos' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive)

      const isVerified = !!client.loginInfo?.isVerified
      const matchesVerification =
        verificationFilter === 'Todos' ||
        (verificationFilter === 'verified' && isVerified) ||
        (verificationFilter === 'unverified' && !isVerified)

      return matchesSearch && matchesStatus && matchesVerification
    })
  }, [clients, searchTerm, statusFilter, verificationFilter])

  const { page, totalPages, paginatedItems: paginatedClients, goTo, next, prev } = usePagination(
    filteredClients,
    10
  )

  const activeClientsCount = useMemo(() => {
    return clients.filter((c) => (c.status || 'active') === 'active').length
  }, [clients])

  const verifiedClientsCount = useMemo(() => {
    return clients.filter((c) => c.loginInfo?.isVerified).length
  }, [clients])

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
            <div className="bg-surface border border-line p-5 sm:p-7 lg:p-8">
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                    Gestión de Clientes
                  </h1>
                  <p className="text-sm text-muted">
                    Base de datos y control de comensales registrados en la plataforma.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <ReportButton
                    title="Clientes"
                    columns={clientsReportColumns}
                    rows={filteredClients}
                    itemTag="cliente"
                    summary={[
                      { label: 'Clientes', value: filteredClients.length },
                      {
                        label: 'Cuentas activas',
                        value: filteredClients.filter((c) => (c.status || 'active') === 'active').length,
                      },
                      {
                        label: 'Verificadas',
                        value: filteredClients.filter((c) => c.loginInfo?.isVerified).length,
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Resumen Hero de cifras principales */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-2">
                <div className="min-w-0">
                  <p className="kick text-[10.5px] font-bold text-ac tracking-wider mb-2">
                    CLIENTES REGISTRADOS · TOTAL
                  </p>
                  <div className="text-4xl sm:text-5xl font-light text-ink tracking-tight mb-2 flex items-baseline">
                    <span>{isLoading ? '—' : clients.length}</span>
                    <span className="text-xl sm:text-2xl text-muted font-normal ml-2">comensales</span>
                  </div>
                  <p className="text-xs text-muted max-w-md leading-relaxed">
                    Historial de comensales con cuenta activa o histórica en la plataforma para pedidos en línea y consumo en restaurante.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-8 sm:gap-12 shrink-0">
                  <div className="border-t-2 border-ac pt-2.5 min-w-[130px] sm:min-w-[150px]">
                    <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                      CUENTAS ACTIVAS
                    </p>
                    <p className="text-2xl sm:text-3xl font-light text-ink">
                      {isLoading ? '—' : activeClientsCount}
                    </p>
                  </div>

                  <div className="border-t-2 border-ac pt-2.5 min-w-[130px] sm:min-w-[150px]">
                    <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                      VERIFICADAS
                    </p>
                    <p className="text-2xl sm:text-3xl font-light text-ink">
                      {isLoading ? '—' : verifiedClientsCount}
                    </p>
                  </div>

                  <div className="border-t-2 border-ac pt-2.5 min-w-[130px] sm:min-w-[150px]">
                    <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                      CLIENTES DESTACADOS
                    </p>
                    <button
                      type="button"
                      onClick={() => setLeaderboardOpen(true)}
                      className="text-base sm:text-lg font-medium text-ink hover:text-ac transition-colors flex items-center gap-1.5 mt-1 cursor-pointer"
                    >
                      Ver ranking <FAIcon icon="arrow-right" size="xs" className="text-muted" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cabecera de la tabla */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-base font-bold text-ink">
                  Clientes registrados
                </h2>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink placeholder:text-muted w-full sm:w-64"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink cursor-pointer"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink cursor-pointer"
                  >
                    <option value="Todos">Todas las cuentas</option>
                    <option value="verified">Verificadas</option>
                    <option value="unverified">Sin verificar</option>
                  </select>
                </div>
              </div>

              {/* Tabla de clientes */}
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-muted text-sm">Cargando clientes de la base de datos...</div>
                ) : clients.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">No hay clientes registrados en el sistema.</div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">Ningún cliente coincide con los filtros aplicados.</div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="text-[10.5px] kick font-bold text-muted tracking-wider border-b border-line">
                        <th className="py-3 pr-4">CLIENTE</th>
                        <th className="py-3 px-4">CONTACTO</th>
                        <th className="py-3 px-4">ESTADO</th>
                        <th className="py-3 px-4">VERIFICACIÓN</th>
                        <th className="py-3 px-4">FECHA REGISTRO</th>
                        <th className="py-3 pl-4 text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60 text-sm">
                      {paginatedClients.map((client) => {
                        const id = client._id || client.id
                        const firstName = client.personalInfo?.name || ''
                        const lastName = client.personalInfo?.lastname || ''
                        const fullName = `${firstName} ${lastName}`.trim() || 'Sin Nombre'
                        const email = client.loginInfo?.email || 'Sin correo'
                        const phone = getPrimaryPhone(client) || 'Sin teléfono'
                        const registerDate = client.createdAt
                          ? new Date(client.createdAt).toLocaleDateString('es-SV')
                          : '—'
                        const isVerified = !!client.loginInfo?.isVerified
                        const isActive = (client.status || 'active') === 'active'
                        const initials =
                          fullName
                            .split(' ')
                            .filter(Boolean)
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'C'
                        const img = client.personalInfo?.image

                        return (
                          <tr
                            key={id}
                            className={`hover:bg-acsoft/10 transition-colors ${!isActive ? 'opacity-55' : ''}`}
                          >
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-3">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={fullName}
                                    className="w-8 h-8 object-cover border border-line shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex'
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="w-8 h-8 bg-acsoft text-ac border border-acline/60 flex items-center justify-center text-[10.5px] font-bold shrink-0 shadow-xs"
                                  style={{ display: img ? 'none' : 'flex' }}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-medium text-ink text-[13.5px]">{fullName}</div>
                                  <div className="text-[11px] text-muted">{email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-[13px] text-inkalt font-mono">
                              {phone}
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                                  isActive ? 'text-ok' : 'text-muted'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-ok' : 'bg-muted'}`}
                                />
                                {isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border ${
                                  isVerified
                                    ? 'bg-oksoft/20 text-ok border-ok/30'
                                    : 'bg-warnsoft/20 text-warn border-warn/30'
                                }`}
                              >
                                {isVerified ? 'Verificado' : 'Sin verificar'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-[12.5px] text-muted whitespace-nowrap">
                              {registerDate}
                            </td>

                            <td className="py-3.5 pl-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setViewingClient(client)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border border-acline text-ac hover:bg-ac hover:text-white transition-colors cursor-pointer"
                              >
                                <FAIcon icon="eye" size="xs" /> Detalle
                              </button>

                              {canManageStatus && (
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveDropdownId((prev) => (prev === id ? null : id))
                                    }}
                                    aria-label="Más acciones"
                                    className={`inline-flex items-center justify-center w-7 h-7 border transition-colors cursor-pointer ${
                                      activeDropdownId === id
                                        ? 'border-ac text-ac bg-acsoft'
                                        : 'border-line text-muted hover:border-linealt hover:text-ink'
                                    }`}
                                  >
                                    <FAIcon icon="ellipsis-vertical" size="sm" />
                                  </button>

                                  {activeDropdownId === id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 mt-1 w-44 bg-surface border border-line shadow-lg z-50 py-1 text-left"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveDropdownId(null)
                                          setViewingClient(client)
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-xs text-ink hover:bg-surfalt flex items-center gap-2.5 transition-colors cursor-pointer"
                                      >
                                        <FAIcon icon="eye" size="sm" className="text-muted w-4 text-center" />
                                        <span>Ver información</span>
                                      </button>

                                      <div className="my-1 border-t border-line/60" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveDropdownId(null)
                                          setConfirmStatus({ isOpen: true, client })
                                        }}
                                        className={`w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                                          isActive ? 'text-ac hover:bg-acsoft' : 'text-ok hover:bg-oksoft'
                                        }`}
                                      >
                                        <FAIcon
                                          icon={isActive ? 'user-slash' : 'user-check'}
                                          size="sm"
                                          className="w-4 text-center"
                                        />
                                        <span>{isActive ? 'Dar de baja' : 'Reactivar cliente'}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>

                    {/* Fila de totales del listado */}
                    {filteredClients.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-line text-sm font-display font-bold text-ink">
                          <td className="py-3.5 pr-4 kick text-[10.5px] tracking-wider" colSpan={2}>
                            TOTALES DEL LISTADO ({filteredClients.length})
                          </td>
                          <td className="py-3.5 px-4" colSpan={4}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>

              {/* Paginación */}
              {filteredClients.length > 0 && totalPages > 1 && (
                <div className="pt-4 mt-2">
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onPrev={prev}
                    onNext={next}
                    onGoTo={goTo}
                  />
                </div>
              )}

              {/* Nota institucional al pie */}
              <p className="text-xs text-muted mt-6 leading-relaxed">
                El estado de un cliente controla el inicio de sesión y la posibilidad de emitir pedidos en línea. Los registros y transacciones históricas se preservan para los reportes contables e inventario.
              </p>
            </div>

            {/* Modal de Detalle de Cliente */}
            <ClientDetailModal
              isOpen={!!viewingClient}
              onClose={() => setViewingClient(null)}
              client={viewingClient}
              onToggleStatus={handleToggleStatus}
              canManageStatus={canManageStatus}
              fetchClientOrders={fetchClientOrders}
            />

            {/* Modal de Leaderboard */}
            <ClientLeaderboardModal
              isOpen={leaderboardOpen}
              onClose={() => setLeaderboardOpen(false)}
              mostActive={mostActive}
              topSpenders={topSpenders}
              priciestWeek={priciestWeek}
              loading={loadingLeaderboard}
              onOpen={fetchLeaderboard}
              period={leaderboardPeriod}
              onPeriodChange={fetchLeaderboard}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />

            {/* Modal de Confirmación para dar de baja / reactivar */}
            <ConfirmModal
              isOpen={confirmStatus.isOpen}
              onClose={() => setConfirmStatus({ isOpen: false, client: null })}
              onConfirm={handleConfirmToggleStatus}
              title={
                (confirmStatus.client?.status || 'active') === 'active'
                  ? '¿Dar de baja a este cliente?'
                  : '¿Reactivar cuenta de cliente?'
              }
              message={
                (confirmStatus.client?.status || 'active') === 'active'
                  ? `Al dar de baja a ${confirmStatus.client?.personalInfo?.name || 'este cliente'}, su cuenta quedará inhabilitada para iniciar sesión y emitir nuevos pedidos. Su historial se mantendrá registrado.`
                  : `Se restablecerá el acceso a ${confirmStatus.client?.personalInfo?.name || 'este cliente'} para que pueda realizar pedidos y consultar su perfil normalmente.`
              }
              confirmText={
                (confirmStatus.client?.status || 'active') === 'active'
                  ? 'Dar de baja'
                  : 'Reactivar'
              }
              variant={
                (confirmStatus.client?.status || 'active') === 'active'
                  ? 'danger'
                  : 'warning'
              }
              icon={
                (confirmStatus.client?.status || 'active') === 'active'
                  ? 'user-slash'
                  : 'user-check'
              }
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ClientManagement() {
  return (
    <ToastProvider>
      <ClientManagementContent />
    </ToastProvider>
  )
}
