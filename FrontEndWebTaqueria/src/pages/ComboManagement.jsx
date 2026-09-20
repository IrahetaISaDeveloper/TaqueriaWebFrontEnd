//Cambio en el nombre de minuscula a mayuscula de comboManagement.jsx a ComboManagement.jsx para que funcione correctamente el import en App.jsx
// src/pages/ComboManagement.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import ComboCard from '../components/dashboard/ComboCard';
import ComboStats from '../components/dashboard/ComboStats';
import AddComboModal from '../components/dashboard/AddComboModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import AttentionCenter from '../components/commons/AttentionCenter';
import FilterBar from '../components/commons/FilterBar';
import ViewDetailsModal from '../components/commons/ViewDetailsModal';
import DetailRow from '../components/commons/DetailRow';
import FAIcon from '../components/commons/FAIcon';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(filteredCombos, 6);

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
    image: combo.image || 'https://placehold.co/300x200/f3f0eb/9ca3af?text=Combo',
    title: combo.name || 'Sin nombre',
    price: `$${(combo.price || 0).toFixed(2)}`,
    description: combo.description || 'Sin descripción',
    isMostSold: bestSellers[0]?.combo?._id === combo._id,
    isAvailable: combo.status === 'disponible',
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeMenu={activeMenu}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1 sm:mb-2">
                  Gestión de combos
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  Administra el menú de la taquería fusionando platillos y bebidas.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* Exporta lo que esta filtrado en pantalla, no solo
                    la pagina actual del listado. */}
                <ReportButton
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

                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-ac text-white rounded-none font-display font-semibold text-sm
                    hover:bg-ac hover:
                    transition-all disabled:opacity-60"
                  disabled={loading}
                >
                  <FAIcon icon="plus" />
                  Nuevo combo
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-acsoft border border-acline text-ac px-4 py-3 rounded-none mb-4 text-sm">
                <span>{error}</span>
              </div>
            )}

            {/* Combos sin imagen */}
            <AttentionCenter
              items={combos.filter((c) => !c.image)}
              getKey={(c) => c._id}
              getTitle={(c) => c.name}
              getImage={(c) => c.image}
              getReason={() => 'Falta imagen'}
              onEdit={handleOpenEditModal}
            />

            <FilterBar
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

            {/* Estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
              <ComboStats
                icon="list"
                title="TOTAL COMBOS"
                value={loading ? '...' : filteredCombos.length}
                label={
                  <span className="flex gap-1.5 flex-wrap mt-1">
                    {CATEGORY_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCategoryFilter(f.id); }}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                          categoryFilter === f.id ? 'bg-ac text-white' : 'bg-surface text-inkalt hover:bg-surface'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </span>
                }
                highlighted={true}
              />
              <ComboStats
                icon="check-circle"
                title="COMBOS DISPONIBLES"
                value={loading ? '...' : combos.filter(c => c.status === 'disponible').length}
                label={`${combos.filter(c => c.status === 'disponible').length} combos disponibles`}
                highlighted={true}
              />
              <ComboStats
                icon="star"
                title="COMBO ESTRELLA"
                value={loading ? '...' : (bestSellers[0]?.combo?.name || 'Sin datos aún')}
                label={bestSellers[0] ? `${bestSellers[0].totalSold} vendidos` : 'Aún no hay ventas registradas'}
                highlighted={true}
              />
            </div>

            {/* Loader */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ac"></div>
                <span className="ml-3 text-inkalt font-medium">Cargando combos...</span>
              </div>
            )}

            {/* Grid de combos */}
            {!loading && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                <PaginationControls page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
              </>
            )}

            {/* Estado vacío */}
            {!loading && filteredCombos.length === 0 && !error && (
              <div className="text-center py-12">
                <FAIcon icon="inbox" size="3x" className="text-muted mx-auto mb-3" />
                <p className="text-muted text-base sm:text-lg font-display font-semibold">
                  No hay combos {categoryFilter !== 'all' ? 'en esta categoría' : 'agregados'}
                </p>
                <p className="text-muted text-xs sm:text-sm mb-4">
                  Haz click en "Nuevo combo" para crear uno
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modales (se mantienen igual) */}
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
    </div>
  );
}

export default function ComboManagement() {
  return (
    <ToastProvider>
      <ComboManagementContent />
    </ToastProvider>
  );
}
