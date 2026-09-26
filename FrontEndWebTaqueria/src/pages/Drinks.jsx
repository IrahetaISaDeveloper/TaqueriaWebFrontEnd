// src/pages/Drinks.jsx
import React, { useState, useEffect } from 'react';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import MenuHero from '../components/menu/MenuHero';
import MenuFilterRow from '../components/menu/MenuFilterRow';
import MenuAttentionBanner from '../components/menu/MenuAttentionBanner';
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

  const filteredDrinks = drinks.filter((d) =>
    (categoryFilter === 'all' || d.category === categoryFilter) &&
    (subcategoryFilter === 'all' || d.subcategory === subcategoryFilter) &&
    (statusFilter === 'all' || d.status === statusFilter)
  );

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredDrinks, 8);

  const lowStockThreshold = settings.operation.lowStockThresholds?.drinks ?? 10;

  // Datos para las tres tarjetas de estadísticas
  const stockCritico = drinks.filter((d) => d.category === 'tercero' && d.stock < lowStockThreshold).length;
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
  const missingImage = drinks.filter((d) => !d.image);
  const unavailable = drinks.length - activeDrinks;
  const heroNote = [
    unavailable > 0 && `${unavailable} bebida${unavailable === 1 ? ' está marcada' : 's están marcadas'} como no disponible${unavailable === 1 ? '' : 's'}`,
    missingImage.length > 0 && `${missingImage.length} no ${missingImage.length === 1 ? 'tiene' : 'tienen'} imagen cargada`,
  ].filter(Boolean).join(' y ');

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

      <MenuHero
        loading={loading}
        primary={{
          kick: 'Bebidas activas',
          value: activeDrinks,
          suffix: `de ${drinks.length} registradas`,
          note: heroNote ? `${heroNote}.` : 'Todas las bebidas están disponibles y completas.',
          noteTone: heroNote ? 'ac' : 'ok',
        }}
        secondary={[
          { kick: 'Bebida estrella', value: bebidaEstrella, label: 'Más vendida' },
          {
            kick: 'Stock crítico',
            value: stockCritico,
            label: stockCritico > 0 ? `Menos de ${lowStockThreshold} unidades` : 'Todo en orden',
            tone: stockCritico > 0 ? 'ac' : undefined,
          },
        ]}
      />

      <MenuFilterRow
        chips={CATEGORY_FILTERS}
        value={categoryFilter}
        onChange={setCategoryFilter}
        filters={[
          {
            label: 'Subcategoría',
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
      />

      <MenuAttentionBanner
        items={missingImage}
        getKey={(d) => d.id}
        getTitle={(d) => d.title}
        onEdit={handleOpenEditModal}
        noun={['bebida', 'bebidas']}
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
            {paginatedItems.map((drink) => (
              <DrinkCard
                key={drink.id}
                {...drink}
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
        <div className="text-center py-14 border border-dashed border-line">
          <p className="kick text-muted mb-2">Sin resultados</p>
          <p className="text-sm text-inkalt">
            No hay bebidas {categoryFilter !== 'all' ? 'en esta categoría' : 'agregadas'}.
          </p>
        </div>
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