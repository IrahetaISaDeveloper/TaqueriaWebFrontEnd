// src/pages/Promotions.jsx
import React, { useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import StatLine from '../components/dashboard/StatLine';
import PromotionCard from '../components/promotions/PromotionCard';
import AddPromotionModal from '../components/promotions/AddPromotionModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import FilterBar from '../components/commons/FilterBar';
import ViewDetailsModal from '../components/commons/ViewDetailsModal';
import DetailRow from '../components/commons/DetailRow';
import FAIcon from '../components/commons/FAIcon';
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

function PromotionsContent() {
  const [activeMenu] = useState('promotions');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [viewingPromotion, setViewingPromotion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, promotionId: null });
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredPromotions = promotions.filter(
    (promotion) => statusFilter === 'all' || promotion.status === statusFilter
  );

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredPromotions, 8);

  const runningCount = promotions.filter(isRunning).length;
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1 sm:mb-2">
                  Promociones de hoy
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  Combina productos del menú a un precio especial, por un máximo de 3 días.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingPromotion(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-ac text-white rounded-none font-display font-semibold text-sm
                  hover:bg-ac hover:
                  transition-all disabled:opacity-60"
                disabled={loading}
              >
                <FAIcon icon="plus" />
                Nueva promoción
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-acsoft border border-acline text-ac px-4 py-3 rounded-none text-sm">
                Error: {error}
              </div>
            )}

            <FilterBar
              filters={[
                {
                  label: 'Estado',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: 'all', label: 'Todos los estados' },
                    { value: 'activa', label: 'Activas' },
                    { value: 'pausada', label: 'Pausadas' },
                    { value: 'expirada', label: 'Expiradas' },
                  ],
                },
              ]}
            />

            {/* Estadísticas: mismo lenguaje editorial del Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <StatLine
                title="Corriendo ahora"
                value={loading ? '...' : runningCount}
                label={runningCount > 0 ? 'Visibles en la app' : 'Sin promociones activas'}
                highlighted={runningCount > 0}
              />
              <StatLine
                title="Termina primero"
                value={endingSoon?.name || 'Sin datos'}
                label={endingSoon ? new Date(endingSoon.endsAt).toLocaleString('es-SV') : 'Nada por vencer'}
              />
              <StatLine
                title="Sugeridas por IA"
                value={loading ? '...' : aiCount}
                label="Armadas con ayuda del asistente"
              />
            </div>

            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ac"></div>
                <span className="ml-3 text-inkalt font-medium">Cargando promociones...</span>
              </div>
            )}

            {!loading && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {paginatedItems.map((promotion) => (
                    <PromotionCard
                      key={promotion._id}
                      promotion={promotion}
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
                <PaginationControls page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
              </>
            )}

            {!loading && filteredPromotions.length === 0 && !error && (
              <div className="text-center py-12">
                <FAIcon icon="tag" size="3x" className="text-muted mx-auto mb-3" />
                <p className="text-muted text-base sm:text-lg font-display font-semibold">
                  No hay promociones
                </p>
                <p className="text-muted text-xs sm:text-sm mb-4">
                  Arma la primera combinando platillos, bebidas o combos del menú
                </p>
                <button
                  onClick={() => {
                    setEditingPromotion(null);
                    setIsModalOpen(true);
                  }}
                  className="px-6 py-2.5 bg-ac text-white rounded-none font-display font-semibold text-sm
                    hover:bg-ac transition-all"
                >
                  Crear promoción
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

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
    </div>
  );
}

export default function Promotions() {
  return (
    <ToastProvider>
      <PromotionsContent />
    </ToastProvider>
  );
}
