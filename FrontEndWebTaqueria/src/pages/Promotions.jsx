// src/pages/Promotions.jsx
import React, { useState } from 'react';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import CatalogStats from '../components/menu/CatalogStats';
import CatalogToolbar from '../components/menu/CatalogToolbar';
import CatalogEmpty from '../components/menu/CatalogEmpty';
import PromotionCard from '../components/promotions/PromotionCard';
import AddPromotionModal from '../components/promotions/AddPromotionModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import ViewDetailsModal from '../components/commons/ViewDetailsModal';
import DetailRow from '../components/commons/DetailRow';
import usePromotions from '../hooks/usePromotions';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';

// Una promoción está "corriendo" cuando está activa Y su ventana incluye este
// momento. Una programada para mañana está activa pero todavía no se ve en la
// app, y esa diferencia importa al contar.
const isRunning = (promotion) =>
  promotion.status === 'activa' &&
  new Date(promotion.startsAt) <= new Date() &&
  new Date(promotion.endsAt) >= new Date();

const PAGE_SIZE = 12;

const STATUS_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'activa', label: 'Activas' },
  { id: 'pausada', label: 'Pausadas' },
  { id: 'expirada', label: 'Expiradas' },
];

function PromotionsContent() {
  const [activeMenu] = useState('promotions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [viewingPromotion, setViewingPromotion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, promotionId: null });
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyAi, setOnlyAi] = useState(false);
  const [search, setSearch] = useState('');

  const {
    promotions,
    loading,
    error,
    addPromotion,
    updatePromotion,
    deletePromotion,
    setStatus,
    previewPricing,
    suggestPromotions,
  } = usePromotions();
  const { addToast } = useToast();

  const searchTerm = search.trim().toLowerCase();

  // Todos los filtros menos el estado: sirve para contar cuántas promociones
  // hay en cada pestaña con los demás filtros aplicados.
  const baseFiltered = promotions.filter((p) =>
    (!onlyAi || p.aiSuggested) &&
    (!searchTerm || p.name?.toLowerCase().includes(searchTerm))
  );

  const filteredPromotions = baseFiltered.filter((p) => statusFilter === 'all' || p.status === statusFilter);

  const statusCount = (id) => (id === 'all' ? baseFiltered.length : baseFiltered.filter((p) => p.status === id).length);

  const hasActiveFilters = statusFilter !== 'all' || onlyAi || Boolean(searchTerm);

  const clearFilters = () => {
    setStatusFilter('all');
    setOnlyAi(false);
    setSearch('');
  };

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredPromotions, PAGE_SIZE);

  const runningCount = promotions.filter(isRunning).length;
  const runningPct = promotions.length ? Math.round((runningCount / promotions.length) * 100) : 0;
  const aiCount = promotions.filter((promotion) => promotion.aiSuggested).length;
  // Cuál se acaba primero, para que el admin sepa qué va a tener que renovar
  const endingSoon = promotions
    .filter(isRunning)
    .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))[0];

  const handleSave = async (formData) => {
    const result = editingPromotion
      ? await updatePromotion(editingPromotion._id, formData)
      : await addPromotion(formData);

    if (result.success) {
      addToast(
        editingPromotion ? 'Promoción actualizada correctamente' : 'Promoción creada correctamente',
        'success'
      );
      setIsModalOpen(false);
      setEditingPromotion(null);
    } else {
      addToast(result.message || 'No se pudo guardar la promoción', 'error');
    }
  };

  const handleToggleStatus = async (promotion) => {
    const nextStatus = promotion.status === 'pausada' ? 'activa' : 'pausada';
    const result = await setStatus(promotion._id, nextStatus);

    if (result.success) {
      addToast(nextStatus === 'pausada' ? 'Promoción pausada' : 'Promoción reactivada', 'success');
    } else {
      addToast(result.message || 'No se pudo cambiar el estado', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.promotionId;
    if (!id) return;

    const result = await deletePromotion(id);
    addToast(
      result.success ? 'Promoción eliminada' : result.message || 'No se pudo eliminar',
      result.success ? 'success' : 'error'
    );
    setConfirmDelete({ isOpen: false, promotionId: null });
  };

  const buildSections = (promotion) => [
    {
      title: 'Información general',
      content: (
        <div>
          <DetailRow label="Descripción" value={promotion.description} />
          <DetailRow label="Precio en promoción" value={`$${Number(promotion.price).toFixed(2)}`} />
          <DetailRow label="Precio por separado" value={`$${Number(promotion.originalPrice).toFixed(2)}`} />
          <DetailRow label="Descuento" value={`${promotion.discountPercent || 0}%`} />
          <DetailRow label="Estado" value={promotion.status} />
          <DetailRow
            label="Vigencia"
            value={`${new Date(promotion.startsAt).toLocaleString('es-SV')} — ${new Date(promotion.endsAt).toLocaleString('es-SV')}`}
          />
          <DetailRow label="Sugerida por IA" value={promotion.aiSuggested ? 'Sí' : 'No'} />
        </div>
      ),
    },
    {
      title: 'Productos incluidos',
      content: (
        <div className="space-y-2">
          {(promotion.items || []).length === 0 && (
            <p className="text-xs text-muted text-center py-2">Sin productos</p>
          )}
          {(promotion.items || []).map((item, idx) => (
            <div key={idx} className="bg-surface rounded-none px-3 py-2 border border-line">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink">
                  {item.quantity} × {item.refId?.name || 'Producto eliminado'}
                </span>
                <span className="text-xs text-muted">${Number(item.refId?.price || 0).toFixed(2)}</span>
              </div>
              {(item.removedIngredients || []).length > 0 && (
                <p className="text-[11px] text-warn mt-1">
                  Sin: {item.removedIngredients.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      ),
    },
  ];

  const pausedCount = promotions.filter((p) => p.status === 'pausada').length;
  const openCreate = () => { setEditingPromotion(null); setIsModalOpen(true); };

  return (
    <MenuPageShell
      activeMenu={activeMenu}
      subtitle="Combina productos del menú a un precio especial, por un máximo de 3 días"
      actions={
        <button type="button" onClick={openCreate} disabled={loading} className={MENU_PRIMARY_BUTTON}>
          Nueva promoción
        </button>
      }
      modals={
        <>
          <AddPromotionModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingPromotion(null);
            }}
            onSave={handleSave}
            editingPromotion={editingPromotion}
            previewPricing={previewPricing}
            suggestPromotions={suggestPromotions}
          />

          <ConfirmModal
            isOpen={confirmDelete.isOpen}
            onClose={() => setConfirmDelete({ isOpen: false, promotionId: null })}
            onConfirm={handleDeleteConfirm}
            title="Eliminar promoción"
            message="¿Seguro que deseas eliminar esta promoción? Los productos del menú que incluía no se tocan."
            confirmText="Eliminar"
            loading={loading}
          />

          <ViewDetailsModal
            key={viewingPromotion?._id}
            isOpen={Boolean(viewingPromotion)}
            onClose={() => setViewingPromotion(null)}
            title={viewingPromotion?.name}
            image={viewingPromotion?.image}
            sections={viewingPromotion ? buildSections(viewingPromotion) : []}
          />
        </>
      }
    >
      {error && (
        <div className="mb-5 bg-acsoft border border-acline text-ac px-4 py-3 text-sm">Error: {error}</div>
      )}

      <CatalogStats
        loading={loading}
        cells={[
          {
            kick: 'Corriendo ahora',
            icon: 'tag',
            value: runningCount,
            suffix: `/ ${promotions.length}`,
            progress: runningPct,
            label: runningCount > 0 ? 'Visibles en la app ahora mismo' : 'Ninguna visible en la app',
          },
          {
            kick: 'Termina primero',
            icon: 'clock',
            value: endingSoon?.name || 'Sin datos',
            isText: true,
            label: endingSoon ? new Date(endingSoon.endsAt).toLocaleString('es-SV') : 'Nada por vencer',
          },
          {
            kick: 'Pausadas',
            icon: 'pause',
            value: pausedCount,
            tone: pausedCount > 0 ? 'ac' : undefined,
            label: statusFilter === 'pausada'
              ? 'Mostrando solo estas · quitar'
              : pausedCount > 0 ? 'No se ven en la app · ver cuáles' : 'Ninguna pausada',
            active: statusFilter === 'pausada',
            onClick: pausedCount > 0 || statusFilter === 'pausada'
              ? () => setStatusFilter((s) => (s === 'pausada' ? 'all' : 'pausada'))
              : undefined,
          },
          {
            kick: 'Sugeridas por IA',
            icon: 'robot',
            value: aiCount,
            label: onlyAi ? 'Mostrando solo estas · quitar' : aiCount > 0 ? 'Armadas con el asistente · ver cuáles' : 'Armadas con el asistente',
            active: onlyAi,
            onClick: aiCount > 0 || onlyAi ? () => setOnlyAi((v) => !v) : undefined,
          },
        ]}
      />

      <CatalogToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar promoción por nombre..."
        tabs={STATUS_TABS.map((t) => ({ ...t, count: statusCount(t.id) }))}
        tabsLabel="Estado"
        tabValue={statusFilter}
        onTab={setStatusFilter}
        loading={loading}
        shown={filteredPromotions.length}
        total={promotions.length}
        noun="promociones"
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
          <span className="ml-3 text-sm text-muted">Cargando promociones...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {paginatedItems.map((promotion, i) => (
              <PromotionCard
                key={promotion._id}
                promotion={promotion}
                index={(page - 1) * PAGE_SIZE + i + 1}
                onView={() => setViewingPromotion(promotion)}
                onEdit={() => {
                  setEditingPromotion(promotion);
                  setIsModalOpen(true);
                }}
                onToggleStatus={() => handleToggleStatus(promotion)}
                onDelete={() => setConfirmDelete({ isOpen: true, promotionId: promotion._id })}
              />
            ))}
          </div>
          <PaginationControls compact page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
        </>
      )}

      {!loading && filteredPromotions.length === 0 && !error && (
        <CatalogEmpty
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          onCreate={openCreate}
          filteredText="Ninguna promoción coincide con los filtros aplicados."
          emptyText="Arma la primera combinando platillos, bebidas o combos del menú."
          createLabel="Crear promoción"
        />
      )}
    </MenuPageShell>
  );
}

export default function Promotions() {
  return (
    <ToastProvider>
      <PromotionsContent />
    </ToastProvider>
  );
}
