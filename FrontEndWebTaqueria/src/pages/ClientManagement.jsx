// src/pages/ClientManagement.jsx
import React, { useState } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import ClientKpis from '../components/client/ClientKpis'
import ClientTable from '../components/client/ClientTable'
import ClientDetailModal from '../components/client/ClientDetailModal'
import ClientLeaderboardModal from '../components/client/ClientLeaderboardModal'
import useClients from '../hooks/useClients'
import useCustomerLeaderboard from '../hooks/useCustomerLeaderboard'
import { ToastProvider, useToast } from '../components/commons/ToastProvider'
import { useAuth } from '../hooks/auth/useAuth'
import { hasPermission } from '../constants/permissions'
import ReportButton from '../components/commons/ReportButton'
import { clientsReportColumns } from '../constants/reportConfigs'

function ClientManagementContent() {
  const [activeMenu] = useState('clients')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewingClient, setViewingClient] = useState(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)

  const { clients, isLoading, toggleClientStatus, fetchClientOrders } = useClients()
  const { mostActive, topSpenders, priciestWeek, period: leaderboardPeriod, loading: loadingLeaderboard, fetchLeaderboard, customRange, setCustomRange } = useCustomerLeaderboard()
  const { user } = useAuth()
  const { addToast } = useToast()

  // Dar de baja a un cliente va detrás de su propio permiso de acción, igual
  // que pasa con los empleados (ver constants/permissions.js).
  const canManageStatus = hasPermission(user, 'clients_manage_status')

  const handleToggleStatus = async (client, newStatus) => {
    const result = await toggleClientStatus(client._id, newStatus)

    addToast(
      result.success
        ? (result.message || (newStatus === 'active' ? 'Cliente reactivado' : 'Cliente desactivado'))
        : result.message,
      result.success ? 'success' : 'error'
    )

    // La ficha abierta muestra el estado viejo hasta que se actualice: se
    // refresca con el nuevo para que el botón cambie al instante.
    if (result.success) {
      setViewingClient((prev) => (prev && prev._id === client._id ? { ...prev, status: newStatus } : prev))
    }

    return result
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1 sm:mb-2">
                  Gestión de Clientes
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  Base de datos de comensales registrados en la plataforma
                </p>
              </div>

              <ReportButton
                title="Clientes"
                columns={clientsReportColumns}
                rows={clients}
                itemTag="cliente"
                summary={[
                  { label: 'Clientes registrados', value: clients.length },
                  { label: 'Cuentas activas', value: clients.filter((c) => (c.status || 'active') === 'active').length },
                  { label: 'Verificadas', value: clients.filter((c) => c.loginInfo?.isVerified).length },
                ]}
              />
            </div>

            <ClientKpis clients={clients} onOpenLeaderboard={() => setLeaderboardOpen(true)} />

            <ClientTable
              clients={clients}
              onView={setViewingClient}
              isLoading={isLoading}
            />

            <ClientDetailModal
              isOpen={!!viewingClient}
              onClose={() => setViewingClient(null)}
              client={viewingClient}
              onToggleStatus={handleToggleStatus}
              canManageStatus={canManageStatus}
              fetchClientOrders={fetchClientOrders}
            />

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
