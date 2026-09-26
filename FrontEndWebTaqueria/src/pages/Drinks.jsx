// src/pages/Drinks.jsx
import React, { useState, useEffect } from 'react';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import CatalogStats from '../components/menu/CatalogStats';
import CatalogToolbar from '../components/menu/CatalogToolbar';
import CatalogEmpty from '../components/menu/CatalogEmpty';
import DrinkCard from '../components/drinks/DrinkCard';
import AddDrinkModal from '../components/drinks/AddDrinkModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import ViewDetailsModal from '../components/commons/ViewDetailsModal';
import DetailRow from '../components/commons/DetailRow';
import useDrinks from '../hooks/useDrinks';
import { usePagination } from '../hooks/usePagination';
import { useSettings } from '../hooks/useSettings';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import { UNIT_LABELS } from '../constants/units';
import ReportButton from '../components/commons/ReportButton';
import { drinksReportColumns } from '../constants/reportConfigs';

const PAGE_SIZE = 12;

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'casa', label: 'De Casa' },
  { id: 'tercero', label: 'De Terceros' },
];

function DrinksContent() {
  const [activeMenu] = useState('drinks');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [viewingDrink, setViewingDrink] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, drinkId: null });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyMissingImage, setOnlyMissingImage] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [search, setSearch] = useState('');
  const [bestSeller, setBestSeller] = useState(null);

  const { drinks, loading, error, addDrink, updateDrink, deleteDrink } = useDrinks();
  const { settings } = useSettings();
  const { addToast } = useToast();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/menu/drinks/best-sellers?limit=1`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBestSeller(data[0] || null))
      .catch(() => setBestSeller(null));
  }, [drinks.length]);

  const subcategoryOptions = [...new Set(drinks.map((d) => d.subcategory).filter(Boolean))];

  const lowStockThreshold = settings.operation.lowStockThresholds?.drinks ?? 10;
  const isLowStock = (d) => d.category === 'tercero' && d.stock !== null && d.stock < lowStockThreshold;

  const searchTerm = search.trim().toLowerCase();

  // Todos los filtros menos la categoría: sirve para contar cuántas bebidas
  // hay en cada pestaña con los demás filtros aplicados.
  const baseFiltered = drinks.filter((d) =>
    (subcategoryFilter === 'all' || d.subcategory === subcategoryFilter) &&
    (statusFilter === 'all' || d.status === statusFilter) &&
    (!onlyMissingImage || !d.image) &&
    (!onlyLowStock || isLowStock(d)) &&
    (!searchTerm || d.title?.toLowerCase().includes(searchTerm))
  );

  const filteredDrinks = baseFiltered.filter((d) => categoryFilter === 'all' || d.category === categoryFilter);

  const categoryCount = (id) => (id === 'all' ? baseFiltered.length : baseFiltered.filter((d) => d.category === id).length);

  const hasActiveFilters =
    categoryFilter !== 'all' || subcategoryFilter !== 'all' || statusFilter !== 'all' ||
    onlyMissingImage || onlyLowStock || Boolean(searchTerm);

  const clearFilters = () => {
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setStatusFilter('all');
    setOnlyMissingImage(false);
    setOnlyLowStock(false);
    setSearch('');
  };

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredDrinks, PAGE_SIZE);

  const stockCritico = drinks.filter(isLowStock).length;
  const bebidaEstrella = bestSeller?.drink?.name || 'Sin datos aún';

  const handleOpenCreateModal = () => {
    setSelectedDrink(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (drink) => {
    setSelectedDrink(drink);
    setIsModalOpen(true);
  };

  const handleSaveDrink = async (formData) => {
    try {
      let success = false;
      if (selectedDrink) {
        success = await updateDrink(selectedDrink.id, formData);
        if (success) addToast('Bebida actualizada correctamente', 'success');
      } else {
        success = await addDrink(formData);
        if (success) addToast('Bebida creada correctamente', 'success');
      }
      if (success) {
        setIsModalOpen(false);
        setSelectedDrink(null);
      }
    } catch (err) {
      addToast(err.message || 'Error al guardar la bebida', 'error');
    }
  };

  const buildDrinkSections = (drink) => {
    const sections = [
      {
        title: 'Información general',
        content: (
          <div>
            <DetailRow label="Categoría" value={drink.category === 'casa' ? 'De casa' : 'De tercero'} />
            <DetailRow label="Subcategoría" value={drink.subcategory} />
            <DetailRow label="Precio" value={`$${parseFloat(drink.price).toFixed(2)}`} />
            <DetailRow label="Estado" value={drink.status} />
            {drink.category === 'tercero' && <DetailRow label="Stock" value={`${drink.stock} uds.`} />}
            {drink.description && (
              <p className="text-sm text-inkalt mt-3 whitespace-pre-wrap">{drink.description}</p>
            )}
          </div>
        ),
      },
    ];

    if (drink.category === 'casa') {
      sections.push({
        title: 'Receta',
        content: (
          <div className="space-y-2">
            {(drink.recipe || []).length === 0 && (
              <p className="text-xs text-muted text-center py-2">Sin ingredientes registrados</p>
            )}
            {(drink.recipe || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-surface rounded-none px-3 py-2 border border-line">
                <span className="text-sm text-ink">{item.name}</span>
                <span className="text-xs text-muted">{item.quantity} {UNIT_LABELS[item.unit] || item.unit}</span>
              </div>
            ))}
          </div>
        ),
      });
    }

    return sections;
  };

  const handleRequestDelete = (id) => {
    setConfirmDelete({ isOpen: true, drinkId: id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.drinkId;
    if (!id) return;
    try {
      await deleteDrink(id);
      addToast('Bebida eliminada correctamente', 'success');
    } catch (err) {
      addToast(err.message || 'Error al eliminar la bebida', 'error');
    } finally {
      setConfirmDelete({ isOpen: false, drinkId: null });
    }
  };

  const activeDrinks = drinks.filter((d) => d.status === 'disponible').length;
  const missingImageCount = drinks.filter((d) => !d.image).length;
  const activePct = drinks.length ? Math.round((activeDrinks / drinks.length) * 100) : 0;

  return (
    <MenuPageShell
      activeMenu={activeMenu}
      subtitle="Administra el catálogo de bebidas y su disponibilidad"
      actions={
        <>
          {/* Exporta lo filtrado en pantalla, no solo la página actual */}
          <ReportButton
            compact
            label="Exportar"
            title="Bebidas"
            columns={drinksReportColumns}
            rows={filteredDrinks}
            getImageUrl={(d) => d.image}
            itemTag="bebida"
            summary={[
              { label: 'Total de bebidas', value: filteredDrinks.length },
              { label: 'Disponibles', value: filteredDrinks.filter((d) => d.status === 'disponible').length },
              { label: 'De casa', value: filteredDrinks.filter((d) => d.category === 'casa').length },
              { label: 'De tercero', value: filteredDrinks.filter((d) => d.category === 'tercero').length },
            ]}
          />
          <button type="button" onClick={handleOpenCreateModal} disabled={loading} className={MENU_PRIMARY_BUTTON}>
            Nueva bebida
          </button>
        </>
      }
      modals={
        <>
          <AddDrinkModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setSelectedDrink(null); }}
            onSave={handleSaveDrink}
            onEditExisting={(raw) => {
              const match = drinks.find((d) => d.id === raw._id);
              if (match) handleOpenEditModal(match);
              else addToast('No se encontró el registro existente, actualiza la página', 'error');
            }}
            editData={selectedDrink}
          />

          <ConfirmModal
            isOpen={confirmDelete.isOpen}
            onClose={() => setConfirmDelete({ isOpen: false, drinkId: null })}
            onConfirm={handleDeleteConfirm}
            title="Eliminar bebida"
            message="¿Estás seguro de eliminar esta bebida? Esta acción no se puede deshacer."
            confirmText="Eliminar"
            loading={loading}
          />

          <ViewDetailsModal
            key={viewingDrink?.id}
            isOpen={Boolean(viewingDrink)}
            onClose={() => setViewingDrink(null)}
            title={viewingDrink?.title}
            image={viewingDrink?.image}
            sections={viewingDrink ? buildDrinkSections(viewingDrink) : []}
          />
        </>
      }
    >
      {error && (
        <div className="mb-5 bg-acsoft border border-acline text-ac px-4 py-3 text-sm">{error}</div>
      )}

      <CatalogStats
        loading={loading}
        cells={[
          {
            kick: 'Bebidas activas',
            icon: 'wine-glass',
            value: activeDrinks,
            suffix: `/ ${drinks.length}`,
            progress: activePct,
            label: `${activePct}% del catálogo disponible`,
          },
          {
            kick: 'Bebida estrella',
            icon: 'star',
            value: bebidaEstrella,
            isText: true,
            label: bestSeller ? 'La más vendida' : 'Aún no hay ventas registradas',
          },
          {
            kick: 'Stock crítico',
            icon: 'box',
            value: stockCritico,
            tone: stockCritico > 0 ? 'ac' : undefined,
            label: onlyLowStock
              ? 'Mostrando solo estas · quitar'
              : stockCritico > 0 ? `Menos de ${lowStockThreshold} uds. · ver cuáles` : 'Todo en orden',
            active: onlyLowStock,
            onClick: stockCritico > 0 || onlyLowStock ? () => setOnlyLowStock((v) => !v) : undefined,
          },
          {
            kick: 'Sin imagen',
            icon: 'image',
            value: missingImageCount,
            tone: missingImageCount > 0 ? 'warn' : undefined,
            label: onlyMissingImage ? 'Mostrando solo estas · quitar' : missingImageCount > 0 ? 'Ver cuáles' : 'Todas tienen imagen',
            active: onlyMissingImage,
            onClick: missingImageCount > 0 || onlyMissingImage ? () => setOnlyMissingImage((v) => !v) : undefined,
          },
        ]}
      />

      <CatalogToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar bebida por nombre..."
        selects={[
          {
            label: 'Subcategoría',
            minWidth: 'min-w-[170px]',
            value: subcategoryFilter,
            onChange: setSubcategoryFilter,
            options: [{ value: 'all', label: 'Todas las subcategorías' }, ...subcategoryOptions.map((s) => ({ value: s, label: s }))],
          },
          {
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'Todos los estados' },
              { value: 'disponible', label: 'Disponibles' },
              { value: 'no disponible', label: 'No disponibles' },
            ],
          },
        ]}
        tabs={CATEGORY_FILTERS.map((c) => ({ ...c, count: categoryCount(c.id) }))}
        tabValue={categoryFilter}
        onTab={setCategoryFilter}
        loading={loading}
        shown={filteredDrinks.length}
        total={drinks.length}
        noun="bebidas"
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
          <span className="ml-3 text-sm text-muted">Cargando bebidas...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {paginatedItems.map((drink, i) => (
              <DrinkCard
                key={drink.id}
                {...drink}
                index={(page - 1) * PAGE_SIZE + i + 1}
                lowStockThreshold={lowStockThreshold}
                isMostSold={bestSeller?.drink?._id === drink.id}
                onEdit={handleOpenEditModal}
                onDelete={handleRequestDelete}
                onView={setViewingDrink}
              />
            ))}
          </div>
          <PaginationControls compact page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
        </>
      )}

      {!loading && filteredDrinks.length === 0 && !error && (
        <CatalogEmpty
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          onCreate={handleOpenCreateModal}
          filteredText="Ninguna bebida coincide con los filtros aplicados."
          emptyText="Aún no hay bebidas registradas."
          createLabel="Nueva bebida"
        />
      )}
    </MenuPageShell>
  );
}

export default function Drinks() {
  return (
    <ToastProvider>
      <DrinksContent />
    </ToastProvider>
  );
}