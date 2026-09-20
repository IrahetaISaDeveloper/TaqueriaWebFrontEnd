import React, { useState, useMemo } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import ComboStats from '../components/dashboard/ComboStats';
import FAIcon from '../components/commons/FAIcon';
import Select from '../components/commons/Select';
import TableModal from '../components/tables/TableModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import useTables from '../hooks/useTables';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ReportButton from '../components/commons/ReportButton';
import { tablesReportColumns } from '../constants/reportConfigs';

// Los valores deben coincidir exactamente con el enum del backend (tablesModel.js / tablesController.js)
const STATUS_LABELS = {
  libre: 'Disponible',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  limpieza: 'En Limpieza',
};

const STATUS_COLORS = {
  libre: '#22c55e',
  ocupada: '#dc2626',
  reservada: '#f97316',
  limpieza: '#9ca3af',
};

function TablesContent() {
  const [activeMenu] = useState('tables');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, tableId: null });
  const [bulkStatus, setBulkStatus] = useState('libre');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { tables, loading, error, createTable, updateTable, bulkUpdateStatus, deleteTable } = useTables();
  const { addToast } = useToast();

  const totalMesas = tables.length;
  const mesasLibres = tables.filter(m => m.status === 'libre').length;
  const porcentajeOcupacion = totalMesas > 0
    ? Math.round(((totalMesas - mesasLibres) / totalMesas) * 100)
    : 0;

  const chartData = useMemo(() => {
    const counts = tables.reduce((acc, mesa) => {
      acc[mesa.status] = (acc[mesa.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || '#9ca3af',
    }));
  }, [tables]);

  const getBadgeClass = (estado) => {
    switch (estado) {
      case 'libre': return 'bg-oksoft text-ok border border-ok';
      case 'ocupada': return 'bg-acsoft text-ac border border-acline';
      case 'reservada': return 'bg-warnsoft text-warn border border-warn';
      case 'limpieza': return 'bg-surfalt text-inkalt border border-line';
      default: return 'bg-surfalt text-inkalt border border-line';
    }
  };

  const handleSaveTable = async (formData) => {
    let result;
    if (editingTable) result = await updateTable(editingTable._id, formData);
    else result = await createTable(formData);
    if (result.success) {
      addToast(editingTable ? 'Mesa actualizada' : 'Mesa creada', 'success');
      setIsModalOpen(false);
      setEditingTable(null);
    } else {
      addToast(result.message || 'Error al guardar', 'error');
    }
  };

  const handleQuickAction = async (mesa) => {
    let nuevoEstado = mesa.status;
    if (mesa.status === 'libre') nuevoEstado = 'ocupada';
    else if (mesa.status === 'ocupada') nuevoEstado = 'limpieza';
    else if (mesa.status === 'limpieza' || mesa.status === 'reservada') nuevoEstado = 'libre';
    const result = await updateTable(mesa._id, { number: mesa.number, status: nuevoEstado });
    if (result.success) addToast(`Mesa ${mesa.number} → ${STATUS_LABELS[nuevoEstado] || nuevoEstado}`, 'success');
    else addToast(result.message || 'Error al cambiar estado', 'error');
  };

  const getActionText = (status) => {
    if (status === 'ocupada') return 'Liberar / Limpieza';
    if (status === 'libre') return 'Asignar Mesa';
    if (status === 'limpieza') return 'Finalizar Limpieza';
    if (status === 'reservada') return 'Registrar Ocupación';
    return 'Cambiar Estado';
  };

  const getActionButtonClass = (status) => {
    if (status === 'ocupada')
      return 'bg-ac text-white hover:bg-ac';
    return 'bg-surfalt text-inkalt hover:bg-line';
  };

  const handleRequestDelete = (id) => setConfirmDelete({ isOpen: true, tableId: id });

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.tableId;
    if (!id) return;
    const result = await deleteTable(id);
    if (result.success) addToast('Mesa eliminada', 'success');
    else addToast(result.message || 'Error al eliminar', 'error');
    setConfirmDelete({ isOpen: false, tableId: null });
  };

  const handleBulkConfirm = async () => {
    setBulkLoading(true);
    const result = await bulkUpdateStatus(bulkStatus);
    setBulkLoading(false);
    setConfirmBulk(false);
    if (result.success) addToast(`Todas las mesas se pusieron en "${STATUS_LABELS[bulkStatus] || bulkStatus}"`, 'success');
    else addToast(result.message || 'Error al actualizar las mesas', 'error');
  };

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
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                  Gestión de Mesas
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  Monitoreo en tiempo real del área de comedor.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ReportButton
                  title="Mesas"
                  columns={tablesReportColumns}
                  rows={tables}
                  itemTag="mesa"
                  summary={[
                    { label: 'Total de mesas', value: tables.length },
                    { label: 'Libres', value: tables.filter((t) => t.status === 'libre').length },
                    { label: 'Ocupadas', value: tables.filter((t) => t.status === 'ocupada').length },
                  ]}
                />

                {/* Cambia el estado de TODAS las mesas de una vez (ej. abrir/cerrar el local) */}
                <div className="flex items-center gap-1.5 bg-surface rounded-none border border-line p-1">
                  <Select variant="ghost" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                  <button
                    onClick={() => setConfirmBulk(true)}
                    disabled={loading || tables.length === 0}
                    className="px-3 py-1.5 rounded-none text-xs sm:text-sm font-display font-semibold text-inkalt bg-surfalt hover:bg-line transition-colors disabled:opacity-50"
                  >
                    Aplicar a todas
                  </button>
                </div>
                <button
                  onClick={() => { setEditingTable(null); setIsModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-ac text-white rounded-none font-display font-semibold text-sm
                    hover:bg-ac hover:
                    transition-all disabled:opacity-60"
                  disabled={loading}
                >
                  <FAIcon icon="plus" />
                  Nueva Mesa
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 sm:p-4 bg-acsoft text-ac rounded-none text-sm flex items-center gap-2">
                <FAIcon icon="exclamation-circle" />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ac"></div>
                <span className="ml-3 text-inkalt font-medium">Cargando mesas...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {/* Estadísticas (2 ComboStats + 1 tarjeta personalizada con progreso) */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <ComboStats
                      icon="chair"
                      title="TOTAL MESAS"
                      value={totalMesas}
                      label={`${totalMesas} mesas registradas`}
                      highlighted={true}
                    />
                    <ComboStats
                      icon="check-circle"
                      title="MESAS LIBRES"
                      value={mesasLibres}
                      label={`${mesasLibres} disponibles`}
                      highlighted={true}
                    />
                    {/* Tarjeta de ocupación con barra de progreso, misma estética clay */}
                    <div className="rounded-none p-5 sm:p-6 border border-line bg-acsoft/80">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-xs sm:text-sm font-display font-semibold uppercase tracking-wider text-ac/80">OCUPACIÓN</p>
                        <div className="w-10 h-10 rounded-full bg-acsoft flex items-center justify-center">
                          <FAIcon icon="percentage" size="lg" className="text-ac" />
                        </div>
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-display font-bold text-ac mb-1">{porcentajeOcupacion}%</h3>
                      <div className="w-full bg-line h-2 rounded-full mt-2 overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-ac rounded-full transition-all duration-300"
                          style={{ width: `${porcentajeOcupacion}%` }}
                        />
                      </div>
                      <p className="text-xs text-ac/70 mt-2 font-medium">
                        {totalMesas - mesasLibres} / {totalMesas} mesas ocupadas
                      </p>
                    </div>
                  </div>

                  {/* Gráfico de dona con estilo clay */}
                  <div className="bg-surface rounded-none p-4 sm:p-6 border border-line flex flex-col">
                    <span className="text-xs font-display font-semibold text-muted uppercase tracking-wider mb-2">
                      Distribución de Mesas
                    </span>
                    {totalMesas === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-muted py-8">
                        Aún no hay mesas registradas
                      </div>
                    ) : (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={2}
                            >
                              {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`${value} mesa${value === 1 ? '' : 's'}`, name]} />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: '11px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid de mesas (tarjetas clay) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-8">
                  {tables.map((mesa) => (
                    <div
                      key={mesa._id}
                      className="bg-surface rounded-none p-4 sm:p-5 border border-line flex flex-col justify-between min-h-[170px] relative group hover:scale-[1.02] transition-transform"
                    >
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 text-ink font-display font-bold text-sm">
                            <FAIcon icon="chair" className="text-muted" />
                            Mesa {String(mesa.number).padStart(2, '0')}
                          </div>
                          <span className={`self-start inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-semibold ${getBadgeClass(mesa.status)}`}>
                            {STATUS_LABELS[mesa.status] || mesa.status}
                          </span>
                        </div>

                        {/* Acciones ocultas hasta hover, en su propia fila para no tapar el estado */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => { setEditingTable(mesa); setIsModalOpen(true); }}
                            className="p-1.5 text-muted hover:text-info hover:bg-infosoft rounded-none transition-colors"
                          >
                            <FAIcon icon="edit" size="sm" />
                          </button>
                          <button
                            onClick={() => handleRequestDelete(mesa._id)}
                            className="p-1.5 text-muted hover:text-ac hover:bg-acsoft rounded-none transition-colors"
                          >
                            <FAIcon icon="trash" size="sm" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <button
                          onClick={() => handleQuickAction(mesa)}
                          className={`w-full py-2 rounded-none text-xs font-display font-bold transition-all ${getActionButtonClass(mesa.status)}`}
                        >
                          {getActionText(mesa.status)}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Tarjeta para agregar nueva mesa */}
                  <div
                    onClick={() => { setEditingTable(null); setIsModalOpen(true); }}
                    className="border-2 border-dashed border-linealt rounded-none flex flex-col items-center justify-center text-muted p-4 sm:p-5 min-h-[170px] hover:border-acline hover:text-ac cursor-pointer transition-colors bg-surface backdrop-blur-sm"
                  >
                    <FAIcon icon="plus-circle" size="lg" className="mb-2" />
                    <span className="text-xs font-display font-semibold">Agregar Mesa</span>
                  </div>
                </div>
              </>
            )}

            {/* Leyenda de estados */}
            <div className="bg-surface rounded-none p-4 border border-line flex flex-wrap items-center gap-4 sm:gap-6">
              <span className="text-xs font-display font-bold text-ink">ESTADOS:</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-inkalt">
                <span className="w-2.5 h-2.5 rounded-full bg-ok"></span> Disponible
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-inkalt">
                <span className="w-2.5 h-2.5 rounded-full bg-ac"></span> Ocupada
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-inkalt">
                <span className="w-2.5 h-2.5 rounded-full bg-warn"></span> Reservada
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-inkalt">
                <span className="w-2.5 h-2.5 rounded-full bg-muted"></span> Limpieza
              </div>
            </div>
          </div>
        </main>
      </div>

      <TableModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTable(null); }}
        onSave={handleSaveTable}
        currentTable={editingTable}
      />
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, tableId: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar mesa"
        message="¿Estás seguro de eliminar esta mesa?"
        confirmText="Eliminar"
        loading={loading}
      />
      <ConfirmModal
        isOpen={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={handleBulkConfirm}
        title="Cambiar todas las mesas"
        message={`¿Poner las ${tables.length} mesas en estado "${STATUS_LABELS[bulkStatus] || bulkStatus}"? Si alguna tiene un pedido activo, ese pedido se cancelará.`}
        confirmText="Aplicar a todas"
        variant="warning"
        icon="chair"
        loading={bulkLoading}
      />
    </div>
  );
}

export default function Tables() {
  return (
    <ToastProvider>
      <TablesContent />
    </ToastProvider>
  );
}