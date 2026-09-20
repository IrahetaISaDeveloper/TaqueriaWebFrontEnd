// src/pages/Inventory.jsx
import React, { useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import ComboStats from '../components/dashboard/ComboStats';
import FAIcon from '../components/commons/FAIcon';
import InventoryModal from '../components/inventory/InventoryModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import AttentionCenter from '../components/commons/AttentionCenter';
import { useInventory } from '../hooks/useInventory';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import { inventoryProductsReportColumns, inventoryAssetsReportColumns } from '../constants/reportConfigs';

const ITEM_TYPE_TABS = [
  { id: 'producto', label: 'Productos (Mercancía)', icon: 'box' },
  { id: 'activo_fijo', label: 'Activos fijos (Mobiliario)', icon: 'couch' },
];

function InventoryContent() {
  const [activeMenu] = useState('inventory');
  const [itemType, setItemType] = useState('producto');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, insumoId: null });

  const { insumos: allInsumos = [], loading, error, deleteInsumo, saveInsumo } = useInventory();
  const { addToast } = useToast();

  const insumos = allInsumos.filter((i) => (i.itemType || 'producto') === itemType);
  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(insumos, 6);

  const isAssetTab = itemType === 'activo_fijo';

  // El umbral de "bajo stock" es propio de cada insumo (es obligatorio para
  // productos completos, ver InventoryModal), porque solo el admin sabe si
  // "10" es poco o mucho según la unidad (kg, litros, unidades...). Los
  // insumos pendientes (todavía sin completar) no cuentan para esta alerta.
  const isLowStock = (item) => {
    if (item.pending || item.lowStockAlert === undefined || item.lowStockAlert === null) return false;
    return Number(item.quantity || 0) <= Number(item.lowStockAlert);
  };

  // Cálculos de estadísticas (cambian según la pestaña activa)
  const totalItems = insumos.length;
  const alertasStock = isAssetTab
    ? insumos.filter((item) => ['Dañado', 'De baja'].includes(item.condition)).length
    : insumos.filter(isLowStock).length;
  const valorEstimado = insumos.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0);

  // Badge de estado según cantidad y status (Productos) o condición (Activos fijos)
  const getStatusBadge = (item) => {
    if (isAssetTab) {
      const condition = item.condition || 'Bueno';
      if (condition === 'De baja') return { text: 'DE BAJA', className: 'bg-acsoft text-ac border border-acline' };
      if (condition === 'Dañado') return { text: 'DAÑADO', className: 'bg-warnsoft text-warn border border-warn' };
      if (condition === 'Regular') return { text: 'REGULAR', className: 'bg-infosoft text-info border border-info' };
      return { text: condition.toUpperCase(), className: 'bg-oksoft text-ok border border-ok' };
    }

    const cant = Number(item.quantity || 0);
    const currentStatus = String(item.status || '').toLowerCase();

    if (item.pending) {
      return { text: 'PENDIENTE', className: 'bg-warnsoft text-warn border border-warn' };
    }
    if (currentStatus === 'agotado' || cant === 0) {
      return { text: 'AGOTADO', className: 'bg-acsoft text-ac border border-acline' };
    }
    if (currentStatus === 'en pedido') {
      return { text: 'EN PEDIDO', className: 'bg-infosoft text-info border border-info' };
    }
    if (isLowStock(item)) {
      return { text: 'LOW STOCK', className: 'bg-warnsoft text-warn border border-warn' };
    }
    return { text: 'DISPONIBLE', className: 'bg-oksoft text-ok border border-ok' };
  };

  const handleEdit = (insumo) => {
    setSelectedInsumo(insumo);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedInsumo(null);
    setIsModalOpen(true);
  };

  const handleRequestDelete = (id) => {
    setConfirmDelete({ isOpen: true, insumoId: id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.insumoId;
    if (!id) return;
    try {
      const result = await deleteInsumo(id);
      if (result.success) {
        addToast('Registro eliminado correctamente', 'success');
      } else {
        addToast(result.message || 'No se pudo eliminar el registro', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error al eliminar', 'error');
    } finally {
      setConfirmDelete({ isOpen: false, insumoId: null });
    }
  };

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
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                  Control de Inventario
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  Gestión centralizada de productos y activos fijos.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* El reporte sigue la pestaña activa: productos y activos
                    fijos tienen campos distintos, así que cada uno lleva sus
                    propias columnas. */}
                <ReportButton
                  title={isAssetTab ? 'Activos fijos' : 'Insumos de inventario'}
                  columns={isAssetTab ? inventoryAssetsReportColumns : inventoryProductsReportColumns}
                  rows={insumos}
                  getImageUrl={(i) => i.image}
                  itemTag={isAssetTab ? 'activo' : 'insumo'}
                  summary={[
                    { label: 'Registros', value: insumos.length },
                    ...(isAssetTab
                      ? []
                      : [{
                          label: 'Bajo stock',
                          value: insumos.filter(
                            (i) => !i.pending && i.lowStockAlert != null && Number(i.quantity) <= Number(i.lowStockAlert)
                          ).length,
                        }]),
                  ]}
                />

                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-ac text-white rounded-none font-display font-semibold text-sm
                    hover:bg-ac hover:
                    transition-all disabled:opacity-60"
                  disabled={loading}
                >
                  <FAIcon icon="plus" />
                  {isAssetTab ? 'Nuevo Activo Fijo' : 'Nuevo Insumo'}
                </button>
              </div>
            </div>

            {/* Selector de categoría principal */}
            <div className="flex gap-3 mb-6">
              {ITEM_TYPE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setItemType(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-none font-display font-semibold text-sm transition-all ${
                    itemType === tab.id
                      ? 'bg-ac text-white'
                      : 'bg-surface text-inkalt border border-line hover:bg-surfalt'
                  }`}
                >
                  <FAIcon icon={tab.icon} size="sm" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 bg-acsoft border border-acline text-ac px-4 py-3 rounded-none text-sm flex items-center gap-2">
                <FAIcon icon="exclamation-circle" />
                {error}
              </div>
            )}

            {/* Insumos pendientes de completar (creados desde el builder de recetas). Solo aplica a Productos */}
            {!isAssetTab && (
              <AttentionCenter
                items={insumos.filter((i) => i.pending)}
                getKey={(i) => i._id}
                getTitle={(i) => i.name}
                getImage={(i) => i.image}
                getReason={() => 'Datos incompletos (creado desde una receta)'}
                onEdit={handleEdit}
              />
            )}

            {/* Estadísticas (usando ComboStats, mismo diseño que en Combos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <ComboStats
                icon={isAssetTab ? 'couch' : 'box'}
                title={isAssetTab ? 'TOTAL ACTIVOS' : 'TOTAL INSUMOS'}
                value={loading ? '...' : totalItems}
                label={`${totalItems} items registrados`}
                highlighted={true}
              />
              <ComboStats
                icon="exclamation-triangle"
                title={isAssetTab ? 'REQUIEREN ATENCIÓN' : 'ALERTAS DE STOCK'}
                value={loading ? '...' : alertasStock}
                label={alertasStock > 0 ? (isAssetTab ? 'Dañados o de baja' : 'Stock crítico') : 'Todo en orden'}
                highlighted={true}
              />
              <ComboStats
                icon="money-bill-wave"
                title="VALOR ESTIMADO"
                value={loading ? '...' : `$${valorEstimado.toFixed(2)}`}
                label={isAssetTab ? 'Valor total de activos' : 'Valor total del inventario'}
                highlighted={true}
              />
            </div>

            {/* Tabla de Inventario con estilo clay */}
            <div className="bg-surface rounded-none border border-line overflow-hidden">
              <div className="p-4 sm:p-5 flex justify-between items-center border-b border-line">
                <h2 className="text-lg font-display font-bold text-ink">
                  {isAssetTab ? 'Listado de Activos Fijos' : 'Listado de Materia Prima'}
                </h2>
              </div>

              {loading && insumos.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-ac"></span>
                  Cargando...
                </div>
              ) : insumos.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm">
                  {isAssetTab ? 'No hay activos fijos registrados. ¡Agrega uno nuevo!' : 'No hay insumos en el inventario. ¡Agrega uno nuevo!'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-surfalt/80 border-b border-line text-xs font-display font-semibold text-muted uppercase tracking-wider">
                        <th className="p-3 sm:p-4 pl-4 sm:pl-6">{isAssetTab ? 'Bien' : 'Insumo'}</th>
                        <th className="p-3 sm:p-4">Categoría</th>
                        <th className="p-3 sm:p-4">Ubicación</th>
                        <th className="p-3 sm:p-4">Cantidad</th>
                        <th className="p-3 sm:p-4">{isAssetTab ? 'Valor' : 'Precio Unit.'}</th>
                        <th className="p-3 sm:p-4">{isAssetTab ? 'Condición' : 'Estado'}</th>
                        <th className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-sm text-inkalt">
                      {paginatedItems.map((item) => {
                        const badge = getStatusBadge(item);
                        return (
                          <tr key={item._id || item.id} className="hover:bg-surfalt/80 transition-colors">
                            <td className="p-3 sm:p-4 pl-4 sm:pl-6">
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-8 h-8 rounded-none object-cover border border-line" />
                                ) : (
                                  <div className="w-8 h-8 rounded-none bg-surfalt border border-line flex items-center justify-center text-muted">
                                    <FAIcon icon="image" size="sm" />
                                  </div>
                                )}
                                <span className="font-display font-semibold text-ink">{item.name}</span>
                                {item.pending && (
                                  <span className="px-2 py-0.5 rounded-full bg-warnsoft text-warn text-[10px] font-semibold uppercase">
                                    Pendiente
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 sm:p-4 text-inkalt font-medium">{item.type || 'Sin categoría'}</td>
                            <td className="p-3 sm:p-4 text-muted text-xs">{item.ubication || 'No asignada'}</td>
                            <td className="p-3 sm:p-4 font-display font-semibold text-ink">
                              {item.quantity} {!isAssetTab && (item.unit || '')}
                            </td>
                            <td className="p-3 sm:p-4 font-medium text-inkalt">
                              ${Number(item.price || 0).toFixed(2)}
                            </td>
                            <td className="p-3 sm:p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-semibold ${badge.className}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                                {badge.text}
                              </span>
                            </td>
                            <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-muted hover:text-inkalt p-1.5 rounded-none hover:bg-surfalt transition-colors"
                              >
                                <FAIcon icon="edit" />
                              </button>
                              <button
                                onClick={() => handleRequestDelete(item._id || item.id)}
                                className="text-ac hover:text-ac p-1.5 rounded-none hover:bg-acsoft transition-colors ml-1"
                              >
                                <FAIcon icon="trash" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <PaginationControls page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
          </div>
        </main>
      </div>

      {/* Modal de creación/edición */}
      <InventoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInsumo(null);
        }}
        insumoData={selectedInsumo}
        itemType={itemType}
        onSave={saveInsumo}
        onEditExisting={(existing) => { setSelectedInsumo(existing); setIsModalOpen(true); }}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, insumoId: null })}
        onConfirm={handleDeleteConfirm}
        title={isAssetTab ? 'Eliminar activo fijo' : 'Eliminar insumo'}
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        loading={loading}
      />
    </div>
  );
}

export default function Inventory() {
  return (
    <ToastProvider>
      <InventoryContent />
    </ToastProvider>
  );
}
