//Cambio en el nombre de minuscula a mayuscula de comboManagement.jsx a ComboManagement.jsx para que funcione correctamente el import en App.jsx
// src/pages/ComboManagement.jsx
import React, { useState, useEffect } from 'react';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import MenuHero from '../components/menu/MenuHero';
import MenuFilterRow from '../components/menu/MenuFilterRow';
import MenuAttentionBanner from '../components/menu/MenuAttentionBanner';
import ComboCard from '../components/dashboard/ComboCard';
import AddComboModal from '../components/dashboard/AddComboModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import ViewDetailsModal from '../components/commons/ViewDetailsModal';
import DetailRow from '../components/commons/DetailRow';
import { useCombos } from '../hooks/useCombos';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import { combosReportColumns } from '../constants/reportConfigs';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'familiar', label: 'Familiares' },
  { id: 'duo', label: 'Duos' },
  { id: 'individual', label: 'Individuales' },
];

function ComboManagementContent() {
  const [activeMenu] = useState('combos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [viewingCombo, setViewingCombo] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, comboId: null });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bestSellers, setBestSellers] = useState([]);

  const { combos, loading, error, addCombo, updateCombo, deleteCombo } = useCombos();
  const { addToast } = useToast();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/menu/combos/best-sellers?limit=1`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then(setBestSellers)
      .catch(() => setBestSellers([]));
  }, [combos.length]);

  const filteredCombos = combos.filter((c) =>
    (categoryFilter === 'all' || c.category === categoryFilter) &&
    (statusFilter === 'all' || c.status === statusFilter)
  );

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredCombos, 8);

  const handleOpenAddModal = () => {
    setSelectedCombo(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (combo) => {
    setSelectedCombo(combo);
    setIsModalOpen(true);
  };

  const handleSaveCombo = async (formData, id) => {
    try {
      if (id) {
        await updateCombo(id, formData);
        addToast('Combo actualizado exitosamente', 'success');
      } else {
        await addCombo(formData);
        addToast('Combo creado exitosamente', 'success');
      }
      setIsModalOpen(false);
      setSelectedCombo(null);
    } catch (err) {
      addToast(err.message || 'Error al guardar el combo', 'error');
    }
  };

  const handleRequestDelete = (id) => {
    setConfirmDelete({ isOpen: true, comboId: id });
  };

  const handleDeleteCombo = async () => {
    const id = confirmDelete.comboId;
    if (!id) return;
    try {
      await deleteCombo(id);
      addToast('Combo eliminado correctamente', 'success');
    } catch (err) {
      addToast(err.message || 'Error al eliminar combo', 'error');
    } finally {
      setConfirmDelete({ isOpen: false, comboId: null });
    }
  };

  const buildComboSections = (combo) => [
    {
      title: 'Información general',
      content: (
        <div>
          <DetailRow label="Categoría" value={combo.category} />
          <DetailRow label="Precio" value={`$${(combo.price || 0).toFixed(2)}`} />
          <DetailRow label="Estado" value={combo.status} />
          <DetailRow label="Modo" value={combo.selective ? `Selectivo (elige ${combo.selectiveMaxPicks})` : 'Platillos fijos'} />
          {combo.description && (
            <p className="text-sm text-inkalt mt-3 whitespace-pre-wrap">{combo.description}</p>
          )}
        </div>
      ),
    },
    {
      title: combo.selective ? 'Opciones de platillo' : 'Platillos incluidos',
      content: (
        <div className="space-y-2">
          {(combo.selective ? combo.selectiveOptions : combo.saucers || []).length === 0 && (
            <p className="text-xs text-muted text-center py-2">Sin platillos asignados</p>
          )}
          {(combo.selective ? combo.selectiveOptions : combo.saucers || []).map((s, idx) => (
            <div key={idx} className="flex items-center justify-between bg-surface rounded-none px-3 py-2 border border-line">
              <span className="text-sm text-ink">{s.saucerId?.name || 'Platillo eliminado'}</span>
              {s.saucerId?.category && <span className="text-xs text-muted">{s.saucerId.category}</span>}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Bebidas permitidas',
      content: (
        <div className="space-y-2">
          {(combo.drinkPolicy?.drinkSetIds || []).length === 0 && (combo.drinkPolicy?.thirdPartyDrinkIds || []).length === 0 && (
            <p className="text-xs text-muted text-center py-2">Combo sin bebida</p>
          )}
          {(combo.drinkPolicy?.drinkSetIds || []).map((set, idx) => (
            <div key={`set-${idx}`} className="bg-surface rounded-none px-3 py-2 border border-line">
              <span className="text-sm text-ink font-semibold">{set.name}</span>
              <p className="text-xs text-muted mt-0.5">{(set.drinkIds || []).map((d) => d.name).join(', ')}</p>
            </div>
          ))}
          {(combo.drinkPolicy?.thirdPartyDrinkIds || []).map((d, idx) => (
            <div key={`drink-${idx}`} className="flex items-center justify-between bg-surface rounded-none px-3 py-2 border border-line">
              <span className="text-sm text-ink">{d.name}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const formatComboForDisplay = (combo) => ({
    id: combo._id,
    image: combo.image,
    title: combo.name || 'Sin nombre',
    price: `$${(combo.price || 0).toFixed(2)}`,
    category: combo.category,
    selective: combo.selective,
    itemsCount: (combo.saucers || []).length,
    isMostSold: bestSellers[0]?.combo?._id === combo._id,
    isAvailable: combo.status === 'disponible',
  });

  const activeCombos = combos.filter((c) => c.status === 'disponible').length;
  const missingImage = combos.filter((c) => !c.image);
  const unavailable = combos.length - activeCombos;
  const heroNote = [
    unavailable > 0 && `${unavailable} combo${unavailable === 1 ? ' está marcado' : 's están marcados'} como no disponible${unavailable === 1 ? '' : 's'}`,
    missingImage.length > 0 && `${missingImage.length} no ${missingImage.length === 1 ? 'tiene' : 'tienen'} imagen cargada`,
  ].filter(Boolean).join(' y ');
  const selectiveCount = combos.filter((c) => c.selective).length;

  return (
    <MenuPageShell
      activeMenu={activeMenu}
      subtitle="Paquetes armados con platillos y bebidas del menú"
      actions={
        <>
          {/* Exporta lo filtrado en pantalla, no solo la página actual */}
          <ReportButton
            compact
            label="Exportar"
            title="Combos"
            columns={combosReportColumns}
            rows={filteredCombos}
            getImageUrl={(r) => r.image}
            itemTag="combo"
            summary={[
              { label: 'Total de combos', value: filteredCombos.length },
              { label: 'Selectivos', value: filteredCombos.filter((c) => c.selective).length },
            ]}
          />
          <button type="button" onClick={handleOpenAddModal} disabled={loading} className={MENU_PRIMARY_BUTTON}>
            Nuevo combo
          </button>
        </>
      }
      modals={
        <>
          <AddComboModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setSelectedCombo(null); }}
            onSave={handleSaveCombo}
            onEditExisting={(existing) => { setSelectedCombo(existing); setIsModalOpen(true); }}
            loading={loading}
            comboToEdit={selectedCombo}
          />

          <ConfirmModal
            isOpen={confirmDelete.isOpen}
            onClose={() => setConfirmDelete({ isOpen: false, comboId: null })}
            onConfirm={handleDeleteCombo}
            title="Eliminar combo"
            message="¿Estás seguro de eliminar este combo? Esta acción no se puede deshacer."
            confirmText="Eliminar"
            loading={loading}
          />

          <ViewDetailsModal
            key={viewingCombo?._id}
            isOpen={Boolean(viewingCombo)}
            onClose={() => setViewingCombo(null)}
            title={viewingCombo?.name}
            image={viewingCombo?.image}
            sections={viewingCombo ? buildComboSections(viewingCombo) : []}
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
          kick: 'Combos activos',
          value: activeCombos,
          suffix: `de ${combos.length} registrados`,
          note: heroNote ? `${heroNote}.` : 'Todos los combos están disponibles y completos.',
          noteTone: heroNote ? 'ac' : 'ok',
        }}
        secondary={[
          {
            kick: 'Combo estrella',
            value: bestSellers[0]?.combo?.name || 'Sin datos aún',
            label: bestSellers[0] ? `${bestSellers[0].totalSold} vendidos` : 'Aún no hay ventas registradas',
          },
          { kick: 'Selectivos', value: selectiveCount, label: 'El cliente elige sus platillos' },
        ]}
      />

      <MenuFilterRow
        chips={CATEGORY_FILTERS}
        value={categoryFilter}
        onChange={setCategoryFilter}
        filters={[
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
        getKey={(c) => c._id}
        getTitle={(c) => c.name}
        onEdit={handleOpenEditModal}
        noun={['combo', 'combos']}
      />

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
          <span className="ml-3 text-sm text-muted">Cargando combos...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {paginatedItems.map((combo) => (
              <ComboCard
                key={combo._id}
                {...formatComboForDisplay(combo)}
                onEdit={() => handleOpenEditModal(combo)}
                onDelete={() => handleRequestDelete(combo._id)}
                onView={() => setViewingCombo(combo)}
              />
            ))}
          </div>
          <PaginationControls compact page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
        </>
      )}

      {!loading && filteredCombos.length === 0 && !error && (
        <div className="text-center py-14 border border-dashed border-line">
          <p className="kick text-muted mb-2">Sin resultados</p>
          <p className="text-sm text-inkalt">
            No hay combos {categoryFilter !== 'all' ? 'en esta categoría' : 'agregados'}.
          </p>
        </div>
      )}
    </MenuPageShell>
  );
}

export default function ComboManagement() {
  return (
    <ToastProvider>
      <ComboManagementContent />
    </ToastProvider>
  );
}
