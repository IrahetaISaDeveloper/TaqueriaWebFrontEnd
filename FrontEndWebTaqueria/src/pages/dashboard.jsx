import React, { useState, useEffect } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import Card from '../components/commons/Card';
import StatCard from '../components/dashboard/StatCard'; 
import ActivityRow from '../components/dashboard/ActivityRow';
import StaffCard from '../components/dashboard/StaffCard';
import AlertCard from '../components/dashboard/AlertCard';
import FAIcon from '../components/commons/FAIcon';
import useDashboard from '../hooks/useDashboard';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';

function DashboardContent() {
  const { isLoading, errors, stats, activityData, staffData } = useDashboard();
  const { addToast } = useToast();

  useEffect(() => {
    if (errors.length > 0) {
      addToast('Algunos datos no se pudieron cargar. Verifica la conexión.', 'warning');
    }
  }, [errors, addToast]);

  return (
    <div className="p-6 sm:p-8">
      {/* Encabezado */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-1 sm:mb-2">Actividad</h1>
        <p className="text-sm sm:text-base text-gray-600">Seguimiento de pedidos en tiempo real</p>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 sm:mb-6 bg-yellow-100/80 backdrop-blur-sm border border-yellow-200 text-yellow-800 text-xs sm:text-sm rounded-2xl p-3">
          Algunos datos no se pudieron cargar correctamente. Verifica la conexión con el servidor.
        </div>
      )}

      {/* ========== PRIMERAS 3 TARJETAS (ahora con estilo clay) ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
          icon="list"
          title="Órdenes Hoy"
          value={isLoading ? '—' : stats.ordersTodayCount}
          label={isLoading ? 'Cargando...' : `Ticket promedio: $${stats.ticketPromedio.toFixed(2)}`}
        />
        <StatCard
          icon="dollar-sign"
          title="Ventas Netas"
          value={isLoading ? '—' : `$${stats.ventasNetas.toFixed(2)}`}
          label={isLoading ? 'Cargando...' : 'Correspondiente a pedidos de hoy'}
        />
        <StatCard
          icon="users"
          title="Staff en Turno"
          value={isLoading ? '—' : stats.staffEnTurnoCount}
          label={isLoading ? 'Cargando...' : `${stats.totalEmployees} empleados registrados`}
        />
      </div>

      {/* Actividad Reciente + Estado del Equipo (sin cambios) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 sm:mb-8">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-gray-900">Actividad Reciente</h2>
              <p className="text-xs sm:text-sm text-gray-600">Seguimiento de pedidos en tiempo real</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-white/40 border-b border-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-display font-semibold text-gray-700 uppercase">ID Pedido</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-display font-semibold text-gray-700 uppercase">Mesa / Cliente</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-display font-semibold text-gray-700 uppercase">Nombre cliente</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-display font-semibold text-gray-700 uppercase">Monto</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-display font-semibold text-gray-700 uppercase">Estado</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-display font-semibold text-gray-700 uppercase">Hora</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 sm:px-6 py-6 text-center text-sm text-gray-500">Cargando pedidos...</td></tr>
                ) : activityData.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 sm:px-6 py-6 text-center text-sm text-gray-500">No hay pedidos registrados todavía</td></tr>
                ) : (
                  activityData.map((item, idx) => <ActivityRow key={idx} {...item} />)
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-display font-bold text-gray-900 mb-2 sm:mb-4">Estado del Equipo</h2>
          <p className="text-sm text-gray-600 mb-4">Personal activo en turno actual</p>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-gray-500">Cargando personal...</p>
            ) : staffData.length === 0 ? (
              <p className="text-sm text-gray-500">No hay personal activo en turno</p>
            ) : (
              staffData.map((staff, idx) => <StaffCard key={idx} {...staff} />)
            )}
          </div>
        </Card>
      </div>

      {/* Alertas (sin cambios) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
        <AlertCard
          type="dark"
          icon="chart-line"
          title="Mesas en Uso"
          subtitle={isLoading ? 'Cargando...' : `${stats.mesasOcupadas} de ${stats.totalMesas} mesas ocupadas`}
        />
        <AlertCard
          type="warning"
          icon="exclamation-triangle"
          title="ALERTA STOCK"
          subtitle={isLoading ? 'Cargando...' : stats.primerAlertaStock}
        />
        <AlertCard
          type="success"
          icon="smile"
          title="CLIENTES NUEVOS"
          subtitle={isLoading ? 'Cargando...' : `${stats.clientesNuevos} nuevos en los últimos 7 días`}
        />
      </div>

      {/* Actividad General */}
      <div className="mb-8 sm:mb-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-gray-900">Actividad General</h2>
            <p className="text-gray-600 text-xs sm:text-sm">Análisis de resultados en tiempo real</p>
          </div>
        </div>

        {/* ========== 4 TARJETAS DE ACTIVIDAD GENERAL (ahora con StatCard) ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <StatCard
            icon="credit-card"
            title="Ventas del Día"
            value={isLoading ? '—' : `$${stats.ventasNetas.toFixed(2)}`}
            label={isLoading ? 'Cargando...' : `${stats.ordersTodayCount} pedidos registrados hoy`}
          />
          <StatCard
            icon="exclamation-triangle"
            title="Alerta de Stock"
            value={isLoading ? '—' : `${stats.insumosBajoStockCount} Artículos`}
            label={isLoading ? 'Cargando...' : stats.primerAlertaStock}
            alert={!isLoading && stats.insumosBajoStockCount > 0}
          />
          <StatCard
            icon="chair"
            title="Mesas en uso"
            value={isLoading ? '—' : `${stats.mesasOcupadas} / ${stats.totalMesas}`}
            label={!isLoading && stats.totalMesas > 0
              ? `${Math.round((stats.mesasOcupadas / stats.totalMesas) * 100)}% Capacidad`
              : 'Cargando...'}
          />
          <StatCard
            icon="users"
            title="Clientes Nuevos"
            value={isLoading ? '—' : stats.totalClientes}
            label={isLoading ? 'Cargando...' : `Últimos 7 días: ${stats.clientesNuevos}`}
          />
        </div>

        {/* Gráfico placeholder (sin cambios) */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-display font-bold text-gray-900">Resumen de Ventas</h3>
              <p className="text-xs sm:text-sm text-gray-600">Pendiente de endpoint de reportes históricos</p>
            </div>
          </div>
          <div className="h-48 sm:h-64 bg-gray-50 rounded-2xl flex items-center justify-center border border-dashed border-gray-300">
            <div className="text-center px-4">
              <FAIcon icon="chart-bar" size="3x" className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-xs sm:text-sm mt-2">
                El gráfico de ventas mensuales se conectará cuando exista un endpoint de reportes
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-[#f3f0eb]">
        <Sidebar activeMenu="activity" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <DashboardContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}