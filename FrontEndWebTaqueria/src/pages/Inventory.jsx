// src/pages/Inventory.jsx
// Módulo de gestión y visualización de inventario (productos y activos fijos)
import React, { useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import FAIcon from '../components/commons/FAIcon';
import InventoryModal from '../components/inventory/InventoryModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import { useInventory } from '../hooks/useInventory';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import { inventoryProductsReportColumns, inventoryAssetsReportColumns } from '../constants/reportConfigs';

const ITEM_TYPE_TABS = [
  { id: 'producto', label: 'Productos (Mercancía)', icon: 'box' },
  { id: 'activo_fijo', label: 'Activos fijos (Mobiliario)', icon: 'couch' },
];
//

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

  // Insumos pendientes (incompletos, creados desde recetas)
  const pendingItems = insumos.filter((i) => i.pending);

  // Badge de estado según cantidad y status (Productos) o condición (Activos fijos)
  const getStatusBadge = (item) => {
    if (isAssetTab) {
      const condition = item.condition || 'Bueno';
      if (condition === 'De baja') return { text: 'DE BAJA', color: 'text-ac' };
      if (condition === 'Dañado') return { text: 'DAÑADO', color: 'text-warn' };
      if (condition === 'Regular') return { text: 'REGULAR', color: 'text-info' };
      return { text: condition.toUpperCase(), color: 'text-ok' };
    }

    const cant = Number(item.quantity || 0);
    const currentStatus = String(item.status || '').toLowerCase();

    if (item.pending) {
      return { text: 'PENDIENTE', color: 'text-warn' };
    }
    if (currentStatus === 'agotado' || cant === 0) {
      return { text: 'AGOTADO', color: 'text-ac' };
    }
    if (currentStatus === 'en pedido') {
      return { text: 'EN PEDIDO', color: 'text-info' };
    }
    if (isLowStock(item)) {
      return { text: 'LOW STOCK', color: 'text-warn' };
    }
    return { text: 'DISPONIBLE', color: 'text-ok' };
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
    <div className="min-h-screen flex flex-col bg-surfalt">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">

            {/* ── Encabezado con título y botones ── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-ink mb-0.5">
                  Control de inventario
                </h1>
                <p className="text-sm text-muted">
                  Gestión centralizada de productos y activos fijos
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
                  className="flex items-center gap-2 px-4 py-2.5 text-ac rounded-none font-display font-semibold text-sm
                    border border-ac hover:bg-acsoft
                    transition-all disabled:opacity-60"
                  disabled={loading}
                >
                  {isAssetTab ? 'Nuevo Activo Fijo' : 'Nuevo insumo'}
                </button>
              </div>
            </div>

            {/* ── Pestañas tipo underline ── */}
            <div className="flex gap-0 border-b border-line mb-6">
              {ITEM_TYPE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setItemType(tab.id)}
                  className={`kick py-3 px-1 mr-6 transition-all border-b-2 ${
                    itemType === tab.id
                      ? 'border-ac text-ac font-bold'
                      : 'border-transparent text-muted hover:text-inkalt'
                  }`}
                >
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

            {/* ── Estadísticas editorial: valor grande a la izquierda, tarjetas a la derecha ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 mb-6">
              {/* Lado izquierdo: Valor estimado prominente */}
              <div>
                <p className="kick text-ac mb-2">
                  {isAssetTab ? 'Valor estimado de activos' : 'Valor estimado del inventario'}
                </p>
                <p className="text-4xl sm:text-5xl font-display font-bold text-ink leading-none mb-2">
                  ${Math.floor(valorEstimado).toLocaleString('en-US')}
                  <span className="text-2xl sm:text-3xl text-muted font-medium">.{(valorEstimado % 1).toFixed(2).split('.')[1]}</span>
                </p>
                <p className="text-sm text-muted leading-relaxed max-w-md">
                  {isAssetTab
                    ? `Sobre ${totalItems} activos fijos registrados.${alertasStock > 0 ? ` ${alertasStock} ${alertasStock === 1 ? 'requiere' : 'requieren'} atención.` : ''}`
                    : `Sobre ${totalItems} insumos registrados.${alertasStock > 0 ? ` ${alertasStock} ${alertasStock === 1 ? 'está' : 'están'} por debajo de su umbral` : ''}`
                  }
                  {!isAssetTab && pendingItems.length > 0 && (
                    <>
                      {alertasStock > 0 ? '\n' : ' '}y {pendingItems.length} {pendingItems.length === 1 ? 'quedó incompleto' : 'quedaron incompletos'} al crearse desde una receta.
                    </>
                  )}
                </p>
              </div>

              {/* Lado derecho: Dos tarjetas compactas */}
              <div className="flex gap-4 sm:gap-6">
                <div className="text-center px-6 py-4 border-l border-line">
                  <p className="kick text-muted mb-2">
                    {isAssetTab ? 'Total activos' : 'Total insumos'}
                  </p>
                  <p className="text-3xl sm:text-4xl font-display font-bold text-ink">
                    {loading ? '...' : totalItems}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {totalItems} items registrados
                  </p>
                </div>
                <div className="text-center px-6 py-4 border-l border-line">
                  <p className="kick text-muted mb-2">
                    {isAssetTab ? 'Requieren atención' : 'Alertas de stock'}
                  </p>
                  <p className="text-3xl sm:text-4xl font-display font-bold text-ink">
                    {loading ? '...' : alertasStock}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {alertasStock > 0
                      ? (isAssetTab ? 'Dañados o de baja' : 'Stock crítico')
                      : 'Todo en orden'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Banner de atención (ítems incompletos) ── */}
            {!isAssetTab && pendingItems.length > 0 && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-warnsoft/50 border border-warn/20 rounded-none text-sm text-warn">
                <FAIcon icon="triangle-exclamation" className="text-warn shrink-0" />
                <span>
                  {pendingItems.length} {pendingItems.length === 1 ? 'insumo' : 'insumos'} con datos incompletos (creados desde una receta):{' '}
                  <span className="font-semibold">
                    {pendingItems.map((p) => p.name).join(', ')}.
                  </span>
                </span>
              </div>
            )}

            {/* ── Título de la tabla ── */}
            <h2 className="text-base font-display font-bold text-ink mb-4">
              {isAssetTab ? 'Listado de activos fijos' : 'Listado de materia prima'}
            </h2>

            {/* ── Tabla ── */}
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
                    <tr className="border-b border-line">
                      <th className="kick text-muted py-3 px-4 font-semibold">{isAssetTab ? 'Bien' : 'Insumo'}</th>
                      <th className="kick text-muted py-3 px-4 font-semibold">Categoría</th>
                      <th className="kick text-muted py-3 px-4 font-semibold">Ubicación</th>
                      <th className="kick text-muted py-3 px-4 font-semibold">Cantidad</th>
                      <th className="kick text-muted py-3 px-4 font-semibold">{isAssetTab ? 'Valor' : 'Precio Unit.'}</th>
                      <th className="kick text-muted py-3 px-4 font-semibold">{isAssetTab ? 'Condición' : 'Estado'}</th>
                      <th className="kick text-muted py-3 px-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-inkalt">
                    {paginatedItems.map((item) => {
                      const badge = getStatusBadge(item);
                      return (
                        <tr key={item._id || item.id} className="border-b border-line/60 hover:bg-surfalt/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-ink">{item.name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-inkalt">{item.type || 'Sin categoría'}</td>
                          <td className="py-3.5 px-4 text-muted">{item.ubication || 'No asignada'}</td>
                          <td className="py-3.5 px-4">
                            <span className="num text-info font-medium">
                              {item.quantity !== undefined && item.quantity !== null && item.quantity !== ''
                                ? `${item.quantity} ${!isAssetTab ? (item.unit || '') : ''}`
                                : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 num text-inkalt">
                            ${Number(item.price || 0).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`kick inline-flex items-center gap-1.5 ${badge.color}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {badge.text}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-muted hover:text-inkalt p-1.5 rounded-none hover:bg-surfalt transition-colors"
                            >
                              <FAIcon icon="edit" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Paginación compacta tipo < 1/7 > ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={prev}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink border border-line rounded-none disabled:opacity-30 transition-colors"
                  aria-label="Página anterior"
                >
                  <FAIcon icon="chevron-left" size="sm" />
                </button>
                <span className="text-sm text-muted font-display font-medium num">
                  {page}/{totalPages}
                </span>
                <button
                  onClick={next}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink border border-line rounded-none disabled:opacity-30 transition-colors"
                  aria-label="Página siguiente"
                >
                  <FAIcon icon="chevron-right" size="sm" />
                </button>
              </div>
            )}

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
