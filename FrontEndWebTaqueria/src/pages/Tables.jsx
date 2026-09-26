// src/pages/Tables.jsx
import { useState, useMemo } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import TableCard from '../components/tables/TableCard';
import TableModal from '../components/tables/TableModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import FAIcon from '../components/commons/FAIcon';
import Select from '../components/commons/Select';
import ReportButton from '../components/commons/ReportButton';
import useTables from '../hooks/useTables';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import { tablesReportColumns } from '../constants/reportConfigs';
import { STATUS_CONFIG, STATUS_LABELS } from '../constants/tables';

function TablesContent() {
  const [activeMenu] = useState('tables');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, tableId: null });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkStatus, setBulkStatus] = useState('libre');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const {
    tables,
    loading,
    error,
    createTable,
    updateTable,
    bulkUpdateStatus,
    deleteTable,
  } = useTables();
  const { addToast } = useToast();

  const totalMesas = tables.length;
  const mesasLibres = tables.filter((m) => m.status === 'libre').length;
  const mesasOcupadas = tables.filter((m) => m.status === 'ocupada').length;
  const mesasLimpieza = tables.filter((m) => m.status === 'limpieza').length;
  const mesasReservadas = tables.filter((m) => m.status === 'reservada').length;

  const porcentajeOcupacion =
    totalMesas > 0 ? Math.round((mesasOcupadas / totalMesas) * 100) : 0;

  // Pestañas superiores de filtrado por estado
  const statusTabs = [
    { id: 'all', label: 'Todas', count: totalMesas },
    { id: 'libre', label: 'Disponibles', count: mesasLibres },
    { id: 'ocupada', label: 'Ocupadas', count: mesasOcupadas },
    { id: 'limpieza', label: 'En Limpieza', count: mesasLimpieza },
    { id: 'reservada', label: 'Reservadas', count: mesasReservadas },
  ];

  // Filtrado de mesas por pestaña y por término de búsqueda
  const filteredTables = useMemo(() => {
    return tables
      .filter((m) => {
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        if (!matchesStatus) return false;

        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        const numStr = String(m.number);
        const nameStr = `mesa ${m.number}`.toLowerCase();
        return numStr.includes(term) || nameStr.includes(term);
      })
      .sort((a, b) => Number(a.number) - Number(b.number));
  }, [tables, statusFilter, searchTerm]);

  const handleSaveTable = async (formData) => {
    let result;
    if (editingTable) result = await updateTable(editingTable._id, formData);
    else result = await createTable(formData);
    if (result.success) {
      addToast(editingTable ? 'Mesa actualizada correctamente' : 'Mesa creada exitosamente', 'success');
      setIsModalOpen(false);
      setEditingTable(null);
    } else {
      addToast(result.message || 'Error al guardar la mesa', 'error');
    }
  };

  const handleQuickAction = async (mesa) => {
    const nextStatus = STATUS_CONFIG[mesa.status]?.nextAction || 'libre';
    const result = await updateTable(mesa._id, { number: mesa.number, status: nextStatus });
    if (result.success) {
      addToast(`Mesa ${mesa.number} → ${STATUS_LABELS[nextStatus] || nextStatus}`, 'success');
    } else {
      addToast(result.message || 'Error al cambiar estado de la mesa', 'error');
    }
  };

  const handleStatusChange = async (mesa, newStatus) => {
    if (mesa.status === newStatus) return;
    const result = await updateTable(mesa._id, { number: mesa.number, status: newStatus });
    if (result.success) {
      addToast(`Mesa ${mesa.number} cambió a "${STATUS_LABELS[newStatus] || newStatus}"`, 'success');
    } else {
      addToast(result.message || 'No se pudo actualizar el estado', 'error');
    }
  };

  const handleRequestDelete = (id) => setConfirmDelete({ isOpen: true, tableId: id });

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.tableId;
    if (!id) return;
    const result = await deleteTable(id);
    if (result.success) addToast('Mesa eliminada del comedor', 'success');
    else addToast(result.message || 'Error al eliminar mesa', 'error');
    setConfirmDelete({ isOpen: false, tableId: null });
  };

  const handleBulkConfirm = async () => {
    setBulkLoading(true);
    const result = await bulkUpdateStatus(bulkStatus);
    setBulkLoading(false);
    setConfirmBulk(false);
    if (result.success) {
      addToast(`Todas las mesas se actualizaron a "${STATUS_LABELS[bulkStatus] || bulkStatus}"`, 'success');
    } else {
      addToast(result.message || 'Error al actualizar las mesas', 'error');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* min-h-0: evita el bug de scroll flex en el contenedor hijo */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 min-h-0 overflow-y-auto bg-surface">
          {/* Encabezado con tabs y acciones */}
          <header className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-7 border-b border-line">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-[28px] font-display font-bold text-ink leading-tight">
                  Mesas
                </h1>
                <p className="text-sm text-muted mt-1">
                  Monitoreo en tiempo real, control de ocupación y rotación del área de comedor.
                </p>
              </div>

              {/* Botones de acción superior */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <ReportButton
                  compact
                  label="Exportar"
                  title="Mesas"
                  columns={tablesReportColumns}
                  rows={tables}
                  itemTag="mesa"
                  summary={[
                    { label: 'Total de mesas', value: tables.length },
                    { label: 'Disponibles', value: mesasLibres },
                    { label: 'Ocupadas', value: mesasOcupadas },
                  ]}
                />

                {/* Acción masiva rápida */}
                <div className="flex items-center gap-1 border border-line bg-surface p-1">
                  <Select
                    size="sm"
                    variant="ghost"
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="text-xs"
                  >
                    <option value="libre">A Disponible</option>
                    <option value="ocupada">A Ocupada</option>
                    <option value="limpieza">A En Limpieza</option>
                    <option value="reservada">A Reservada</option>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setConfirmBulk(true)}
                    disabled={loading || tables.length === 0}
                    className="px-2.5 py-1 text-xs font-display font-semibold text-inkalt bg-surfalt hover:bg-line transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Aplicar a todas
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTable(null);
                    setIsModalOpen(true);
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-ac text-ac bg-surface text-[13px] font-medium hover:bg-ac hover:text-white transition-colors cursor-pointer disabled:opacity-60"
                >
                  <FAIcon icon="plus" size="xs" />
                  Nueva Mesa
                </button>
              </div>
            </div>

            {/* Pestañas de filtrado de estado con subrayado activo */}
            <nav className="mt-5 flex gap-5 sm:gap-7 overflow-x-auto -mb-px" aria-label="Filtro de estados">
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`kick whitespace-nowrap py-3 border-b-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-ac text-ink font-bold'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    {tab.label} <span className="num text-[11px] ml-1">({tab.count})</span>
                  </button>
                );
              })}
            </nav>
          </header>

          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
            {error && (
              <div className="mb-5 bg-acsoft border border-acline text-ac px-4 py-3 text-sm flex items-center gap-2">
                <FAIcon icon="triangle-exclamation" />
                Error de conexión: {error}
              </div>
            )}

            {/* Resumen Hero de Métricas del Comedor */}
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-6 md:gap-8 mb-8 pb-2">
              {/* Métrica principal con barra sutil */}
              <div className="min-w-0">
                <p className="kick text-muted mb-2">OCUPACIÓN DEL SALÓN</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="num text-5xl sm:text-6xl font-light text-ink leading-none tracking-tight">
                    {loading ? '—' : `${porcentajeOcupacion}%`}
                  </span>
                  <span className="text-sm text-muted">
                    ({mesasOcupadas} de {totalMesas} ocupadas)
                  </span>
                </div>

                {/* Barra de progreso lineal moderna */}
                <div className="w-full bg-line h-1.5 mt-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      porcentajeOcupacion > 80 ? 'bg-ac' : porcentajeOcupacion > 50 ? 'bg-warn' : 'bg-ok'
                    }`}
                    style={{ width: `${porcentajeOcupacion}%` }}
                  />
                </div>

                <p className="text-xs text-muted mt-2">
                  {porcentajeOcupacion >= 85
                    ? 'Capacidad alta: considera agilizar la rotación o preparar mesas en limpieza.'
                    : 'Disponibilidad fluida en sala para comensales.'}
                </p>
              </div>

              {/* Indicadores secundarios alineados */}
              <div className="border-t border-line pt-2.5 min-w-[130px] self-start">
                <p className="kick text-ok font-semibold mb-1.5">MESAS DISPONIBLES</p>
                <p className="num text-2xl sm:text-3xl font-light text-ok">
                  {loading ? '—' : mesasLibres}
                </p>
                <p className="text-[11.5px] text-muted mt-1">Listas para comensales</p>
              </div>

              <div className="border-t border-line pt-2.5 min-w-[130px] self-start">
                <p className="kick text-ac font-semibold mb-1.5">MESAS EN SERVICIO</p>
                <p className="num text-2xl sm:text-3xl font-light text-ink">
                  {loading ? '—' : mesasOcupadas}
                </p>
                <p className="text-[11.5px] text-muted mt-1">Con orden activa o comanda</p>
              </div>

              <div className="border-t border-line pt-2.5 min-w-[130px] self-start">
                <p className="kick text-muted font-semibold mb-1.5">LIMPIEZA Y RESERVAS</p>
                <p className="num text-2xl sm:text-3xl font-light text-ink">
                  {loading ? '—' : mesasLimpieza + mesasReservadas}
                </p>
                <p className="text-[11.5px] text-muted mt-1">
                  {mesasLimpieza} en limpieza · {mesasReservadas} reservadas
                </p>
              </div>
            </div>

            {/* Barra de Filtro y Búsqueda */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-3 border-b border-line">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <FAIcon icon="chair" size="sm" className="text-ac" />
                Distribución de Mesas
              </h2>

              <div className="relative min-w-[220px] sm:min-w-[260px] w-full sm:w-auto">
                <FAIcon
                  icon="magnifying-glass"
                  size="xs"
                  className="absolute left-3 top-3 text-muted"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por número (ej: Mesa 04)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-surface border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-ac transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-muted hover:text-ink text-xs"
                    title="Limpiar búsqueda"
                  >
                    <FAIcon icon="times" size="xs" />
                  </button>
                )}
              </div>
            </div>

            {/* Spinner de carga */}
            {loading && (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
                <span className="ml-3 text-sm text-muted font-medium">Actualizando mesas...</span>
              </div>
            )}

            {/* Cuadrícula de Mesas */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 mb-8">
                {filteredTables.map((mesa) => (
                  <TableCard
                    key={mesa._id}
                    table={mesa}
                    onQuickAction={handleQuickAction}
                    onStatusChange={handleStatusChange}
                    onEdit={(m) => {
                      setEditingTable(m);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleRequestDelete}
                  />
                ))}

                {/* Tarjeta para agregar nueva mesa */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setEditingTable(null);
                    setIsModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingTable(null);
                      setIsModalOpen(true);
                    }
                  }}
                  className="border border-dashed border-linealt hover:border-ac hover:text-ac hover:bg-surfalt/40 transition-colors p-5 min-h-[175px] flex flex-col items-center justify-center text-muted cursor-pointer shadow-xs group"
                >
                  <div className="w-10 h-10 flex items-center justify-center border border-dashed border-linealt group-hover:border-ac rounded-full mb-2 transition-colors">
                    <FAIcon icon="plus" size="base" className="group-hover:text-ac" />
                  </div>
                  <span className="kick text-xs font-semibold text-ink group-hover:text-ac transition-colors">
                    Agregar Mesa
                  </span>
                  <span className="text-[11px] text-muted mt-0.5">Asignar al salón</span>
                </div>
              </div>
            )}

            {/* Estado vacío si no hay coincidencias */}
            {!loading && filteredTables.length === 0 && (
              <div className="text-center py-14 border border-dashed border-line mb-8">
                <p className="kick text-muted mb-2">Sin resultados</p>
                <p className="text-sm text-inkalt mb-4">
                  No se encontraron mesas con el filtro "{statusFilter !== 'all' ? STATUS_LABELS[statusFilter] : 'activo'}" o término "{searchTerm}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 border border-line bg-surface text-xs font-display font-semibold text-ink hover:border-ac hover:text-ac transition-colors cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            )}

            {/* Leyenda de Estados del Salón */}
            <div className="bg-surface p-4 border border-line flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="kick text-muted font-bold">ESTADOS DEL SALÓN:</span>
              </div>

              <div className="flex flex-wrap items-center gap-5 sm:gap-7 text-xs">
                <div className="flex items-center gap-1.5 text-inkalt">
                  <span className="w-2 h-2 rounded-full bg-ok" />
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-1.5 text-inkalt">
                  <span className="w-2 h-2 rounded-full bg-ac" />
                  <span>Ocupada</span>
                </div>
                <div className="flex items-center gap-1.5 text-inkalt">
                  <span className="w-2 h-2 rounded-full bg-warn" />
                  <span>Reservada</span>
                </div>
                <div className="flex items-center gap-1.5 text-inkalt">
                  <span className="w-2 h-2 rounded-full bg-muted" />
                  <span>En Limpieza</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <TableModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTable(null);
        }}
        onSave={handleSaveTable}
        currentTable={editingTable}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, tableId: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar mesa"
        message="¿Estás seguro de que deseas eliminar esta mesa del sistema? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        loading={loading}
      />

      <ConfirmModal
        isOpen={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={handleBulkConfirm}
        title="Cambiar estado masivo"
        message={`¿Deseas cambiar todas las ${tables.length} mesas al estado "${STATUS_LABELS[bulkStatus] || bulkStatus}"?`}
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