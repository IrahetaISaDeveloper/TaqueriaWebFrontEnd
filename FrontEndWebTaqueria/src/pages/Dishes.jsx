// src/pages/Dishes.jsx
import React, { useState, useEffect } from 'react';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import CatalogStats from '../components/menu/CatalogStats';
import CatalogToolbar from '../components/menu/CatalogToolbar';
import CatalogEmpty from '../components/menu/CatalogEmpty';
import DishCard from '../components/dishes/DishCard';
import AddDishModal from '../components/dishes/AddDishModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import ViewDetailsModal from '../components/commons/ViewDetailsModal';
import DetailRow from '../components/commons/DetailRow';
import useSaucers from '../hooks/useSaucers';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import { UNIT_LABELS } from '../constants/units';
import ReportButton from '../components/commons/ReportButton';
import { dishesReportColumns } from '../constants/reportConfigs';

const PAGE_SIZE = 12;

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'Burritos', label: 'Burritos' },
  { id: 'Tortas', label: 'Tortas' },
  { id: 'Tacos', label: 'Tacos' },
  { id: 'Sopas', label: 'Sopas' },
  { id: 'Especiales', label: 'Especiales' },
];

function DishesContent() {
  const [activeMenu] = useState('dishes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [viewingDish, setViewingDish] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, dishId: null });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyMissingImage, setOnlyMissingImage] = useState(false);
  const [search, setSearch] = useState('');
  const [bestSeller, setBestSeller] = useState(null);

  const { saucers, loading, error, createSaucer, updateSaucer, deleteSaucer } = useSaucers();
  const { addToast } = useToast();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/menu/saucers/best-sellers?limit=1`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBestSeller(data[0] || null))
      .catch(() => setBestSeller(null));
  }, [saucers.length]);

  const subcategoryOptions = [...new Set(saucers.map((d) => d.subcategory).filter(Boolean))];

  const searchTerm = search.trim().toLowerCase();

  // Todos los filtros menos la categoría: sirve para contar cuántos platillos
  // hay en cada chip de categoría con los demás filtros aplicados.
  const baseFiltered = saucers.filter((d) =>
    (subcategoryFilter === 'all' || d.subcategory === subcategoryFilter) &&
    (statusFilter === 'all' || d.status === statusFilter) &&
    (!onlyMissingImage || !d.image) &&
    (!searchTerm || d.name?.toLowerCase().includes(searchTerm))
  );

  const filteredDishes = baseFiltered.filter((d) => categoryFilter === 'all' || d.category === categoryFilter);

  const categoryCount = (id) => (id === 'all' ? baseFiltered.length : baseFiltered.filter((d) => d.category === id).length);

  const hasActiveFilters =
    categoryFilter !== 'all' || subcategoryFilter !== 'all' || statusFilter !== 'all' || onlyMissingImage || Boolean(searchTerm);

  const clearFilters = () => {
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setStatusFilter('all');
    setOnlyMissingImage(false);
    setSearch('');
  };

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredDishes, PAGE_SIZE);

  // Datos para las estadísticas
  const outOfStockDishes = saucers.filter(dish => dish.status !== 'Activo').length;
  const platoEstrella = bestSeller?.saucer?.name || 'Sin datos aún';

  const handleSaveDish = async (formData) => {
    try {
      let success = false;
      if (editingDish) {
        success = await updateSaucer(editingDish._id, formData);
        if (success) addToast('Platillo actualizado exitosamente', 'success');
      } else {
        success = await createSaucer(formData);
        if (success) addToast('Platillo creado exitosamente', 'success');
      }
      if (success) {
        setIsModalOpen(false);
        setEditingDish(null);
      }
    } catch (err) {
      addToast(err.message || 'Error al guardar el platillo', 'error');
    }
  };

  const buildDishSections = (dish) => [
    {
      title: 'Información general',
      content: (
        <div>
          <DetailRow label="Categoría" value={dish.category} />
          <DetailRow label="Subcategoría" value={dish.subcategory} />
          <DetailRow label="Precio" value={`$${parseFloat(dish.price).toFixed(2)}`} />
          <DetailRow label="Estado" value={dish.status} />
          {dish.category === 'Tacos' && <DetailRow label="Cantidad por orden" value={`${dish.quantity} tacos`} />}
          {dish.description && (
            <p className="text-sm text-inkalt mt-3 whitespace-pre-wrap">{dish.description}</p>
          )}
        </div>
      ),
    },
    {
      title: 'Receta',
      content: (
        <div className="space-y-2">
          {(dish.recipe || []).length === 0 && (
            <p className="text-xs text-muted text-center py-2">Sin ingredientes registrados</p>
          )}
          {(dish.recipe || []).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between bg-surface rounded-none px-3 py-2 border border-line">
              <span className="text-sm text-ink">{item.name}</span>
              <span className="text-xs text-muted">
                {item.quantity} {UNIT_LABELS[item.unit] || item.unit}
                {item.removable ? ' · quitable' : ''}
              </span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const handleRequestDelete = (id) => {
    setConfirmDelete({ isOpen: true, dishId: id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.dishId;
    if (!id) return;
    try {
      const result = await deleteSaucer(id);
      if (result.success) {
        addToast('Platillo eliminado correctamente', 'success');
      } else {
        addToast(result.error || 'No se pudo eliminar el platillo', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error al eliminar', 'error');
    } finally {
      setConfirmDelete({ isOpen: false, dishId: null });
    }
  };

  const activeDishes = saucers.filter((d) => d.status === 'Activo').length;
  const missingImageCount = saucers.filter((d) => !d.image).length;
  const activePct = saucers.length ? Math.round((activeDishes / saucers.length) * 100) : 0;

  const openCreate = () => { setEditingDish(null); setIsModalOpen(true); };
  const openEdit = (dish) => { setEditingDish(dish); setIsModalOpen(true); };

  return (
    <MenuPageShell
      activeMenu={activeMenu}
      subtitle="Administra el catálogo y su disponibilidad en tiempo real"
      actions={
        <>
          {/* Exporta lo que está filtrado en pantalla, no solo la página actual */}
          <ReportButton
            compact
            label="Exportar"
            title="Platillos"
            columns={dishesReportColumns}
            rows={filteredDishes}
            getImageUrl={(r) => r.image}
            itemTag="platillo"
            summary={[
              { label: 'Total de platillos', value: filteredDishes.length },
              { label: 'Con receta', value: filteredDishes.filter((d) => d.recipe?.length > 0).length },
            ]}
          />
          <button type="button" onClick={openCreate} disabled={loading} className={MENU_PRIMARY_BUTTON}>
            Nuevo platillo
          </button>
        </>
      }
      modals={
        <>
          <AddDishModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingDish(null); }}
            onSave={handleSaveDish}
            onEditExisting={openEdit}
            dishToEdit={editingDish}
          />

          <ConfirmModal
            isOpen={confirmDelete.isOpen}
            onClose={() => setConfirmDelete({ isOpen: false, dishId: null })}
            onConfirm={handleDeleteConfirm}
            title="Eliminar platillo"
            message="¿Estás seguro de que deseas eliminar este platillo? Esta acción no se puede deshacer."
            confirmText="Eliminar"
            loading={loading}
          />

          <ViewDetailsModal
            key={viewingDish?._id}
            isOpen={Boolean(viewingDish)}
            onClose={() => setViewingDish(null)}
            title={viewingDish?.name}
            image={viewingDish?.image}
            sections={viewingDish ? buildDishSections(viewingDish) : []}
          />
        </>
      }
    >
      {error && (
        <div className="mb-5 bg-acsoft border border-acline text-ac px-4 py-3 text-sm">
          Error de conexión: {error}
        </div>
      )}

      <CatalogStats
        loading={loading}
        cells={[
          {
            kick: 'Platillos activos',
            icon: 'utensils',
            value: activeDishes,
            suffix: `/ ${saucers.length}`,
            progress: activePct,
            label: `${activePct}% del catálogo disponible`,
          },
          {
            kick: 'Platillo estrella',
            icon: 'star',
            value: platoEstrella,
            isText: true,
            label: bestSeller ? 'El más vendido' : 'Aún no hay ventas registradas',
          },
          {
            kick: 'No disponibles',
            icon: 'ban',
            value: outOfStockDishes,
            tone: outOfStockDishes > 0 ? 'ac' : undefined,
            label: statusFilter === 'Inactivo' ? 'Mostrando solo estos · quitar' : outOfStockDishes > 0 ? 'Ver cuáles' : 'Todo disponible',
            active: statusFilter === 'Inactivo',
            onClick: outOfStockDishes > 0 || statusFilter === 'Inactivo'
              ? () => setStatusFilter((s) => (s === 'Inactivo' ? 'all' : 'Inactivo'))
              : undefined,
          },
          {
            kick: 'Sin imagen',
            icon: 'image',
            value: missingImageCount,
            tone: missingImageCount > 0 ? 'warn' : undefined,
            label: onlyMissingImage ? 'Mostrando solo estos · quitar' : missingImageCount > 0 ? 'Ver cuáles' : 'Todos tienen imagen',
            active: onlyMissingImage,
            onClick: missingImageCount > 0 || onlyMissingImage ? () => setOnlyMissingImage((v) => !v) : undefined,
          },
        ]}
      />

      <CatalogToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar platillo por nombre..."
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
              { value: 'Activo', label: 'Disponibles' },
              { value: 'Inactivo', label: 'No disponibles' },
            ],
          },
        ]}
        tabs={CATEGORY_FILTERS.map((c) => ({ ...c, count: categoryCount(c.id) }))}
        tabValue={categoryFilter}
        onTab={setCategoryFilter}
        loading={loading}
        shown={filteredDishes.length}
        total={saucers.length}
        noun="platillos"
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
          <span className="ml-3 text-sm text-muted">Cargando platillos...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {paginatedItems.map((dish, i) => (
              <DishCard
                key={dish._id}
                index={(page - 1) * PAGE_SIZE + i + 1}
                image={dish.image}
                name={dish.name}
                description={dish.description}
                recipeCount={dish.recipe?.length || 0}
                category={dish.category}
                subcategory={dish.subcategory}
                quantity={dish.quantity}
                price={`$${parseFloat(dish.price).toFixed(2)}`}
                status={dish.status}
                isMostSold={bestSeller?.saucer?._id === dish._id}
                onEdit={() => openEdit(dish)}
                onDelete={() => handleRequestDelete(dish._id)}
                onView={() => setViewingDish(dish)}
              />
            ))}
          </div>
          <PaginationControls compact page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
        </>
      )}

      {!loading && filteredDishes.length === 0 && !error && (
        <CatalogEmpty
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          onCreate={openCreate}
          filteredText="Ningún platillo coincide con los filtros aplicados."
          emptyText="Aún no hay platillos registrados."
          createLabel="Nuevo platillo"
        />
      )}
    </MenuPageShell>
  );
}

export default function Dishes() {
  return (
    <ToastProvider>
      <DishesContent />
    </ToastProvider>
  );
}
