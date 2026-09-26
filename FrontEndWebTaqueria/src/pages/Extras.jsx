// src/pages/Extras.jsx
import { useState, useEffect, useMemo } from 'react';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import MenuHero from '../components/menu/MenuHero';
import MenuFilterRow from '../components/menu/MenuFilterRow';
import MenuAttentionBanner from '../components/menu/MenuAttentionBanner';
import ExtraCard from '../components/extras/ExtraCard';
import AddExtraModal from '../components/extras/AddExtraModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import ViewDetailsModal from '../components/commons/ViewDetailsModal';
import DetailRow from '../components/commons/DetailRow';
import FAIcon from '../components/commons/FAIcon';
import useExtras from '../hooks/useExtras';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import { UNIT_LABELS } from '../constants/units';
import ReportButton from '../components/commons/ReportButton';
import { extrasReportColumns } from '../constants/reportConfigs';

function ExtrasContent() {
  const [activeMenu] = useState('extras');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);
  const [viewingExtra, setViewingExtra] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, extraId: null });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bestSeller, setBestSeller] = useState(null);

  const { extras, loading, error, addExtra, updateExtra, deleteExtra } = useExtras();
  const { addToast } = useToast();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/menu/extras/best-sellers?limit=1`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBestSeller(data[0] || null))
      .catch(() => setBestSeller(null));
  }, [extras.length]);

  // Categorías únicas detectadas en los extras
  const categoryList = useMemo(
    () => [...new Set(extras.map((e) => e.category).filter(Boolean))],
    [extras]
  );

  const categoryChips = useMemo(
    () => [{ id: 'all', label: 'Todos' }, ...categoryList.map((c) => ({ id: c, label: c }))],
    [categoryList]
  );

  // Filtrado de extras por categoría, estado, tipo y término de búsqueda
  const filteredExtras = useMemo(() => {
    return extras.filter((e) => {
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'compound' && e.isCompound) ||
        (typeFilter === 'simple' && !e.isCompound);

      if (!matchesCategory || !matchesStatus || !matchesType) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const nameMatches = (e.name || '').toLowerCase().includes(term);
      const catMatches = (e.category || '').toLowerCase().includes(term);
      const ingredientMatches = (e.ingredients || []).some((i) =>
        (i.ingredientId?.name || '').toLowerCase().includes(term)
      );

      return nameMatches || catMatches || ingredientMatches;
    });
  }, [extras, categoryFilter, statusFilter, typeFilter, searchTerm]);

  const { page, totalPages, paginatedItems, goTo, next, prev, setPage } = usePagination(filteredExtras, 8);

  // Estadísticas para el Hero
  const activeExtras = extras.filter((e) => e.status === 'DISPONIBLE' || e.status === 'Activo').length;
  const outOfStockExtras = extras.filter((e) => e.status === 'AGOTADO' || e.status === 'Inactivo').length;
  const compoundExtrasCount = extras.filter((e) => e.isCompound).length;
  const mostRequestedExtra = bestSeller?.extra?.name || 'Sin datos aún';
  const missingImage = extras.filter((e) => !e.image);

  const heroNote = [
    outOfStockExtras > 0 && `${outOfStockExtras} extra${outOfStockExtras === 1 ? ' está marcado' : 's están marcados'} como no disponible${outOfStockExtras === 1 ? '' : 's'}`,
    missingImage.length > 0 && `${missingImage.length} no ${missingImage.length === 1 ? 'tiene' : 'tienen'} imagen cargada`,
  ].filter(Boolean).join(' y ');

  const handleSave = async (formData) => {
    try {
      let result;
      if (editingExtra) {
        result = await updateExtra(editingExtra._id, formData);
        if (result.success) addToast('Extra actualizado exitosamente', 'success');
      } else {
        result = await addExtra(formData);
        if (result.success) addToast('Extra creado exitosamente', 'success');
      }

      if (result.success) {
        setIsModalOpen(false);
        setEditingExtra(null);
      } else {
        addToast(result.message || 'Error al guardar el extra', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error inesperado', 'error');
    }
  };

  const buildExtraSections = (extra) => [
    {
      title: 'Información general',
      content: (
        <div>
          <DetailRow label="Categoría" value={extra.category || 'Sin categoría'} />
          <DetailRow label="Precio" value={`$${parseFloat(extra.price).toFixed(2)}`} />
          <DetailRow label="Estado" value={extra.status === 'DISPONIBLE' ? 'Disponible' : 'Agotado'} />
          <DetailRow
            label="Tipo"
            value={extra.isCompound ? 'Compuesto (descuenta de inventario)' : 'Simple (cargo adicional)'}
          />
        </div>
      ),
    },
    {
      title: 'Receta e insumos',
      content: (
        <div className="space-y-2">
          {!extra.isCompound ? (
            <p className="text-xs text-muted text-center py-4">
              Este extra no es compuesto: no descuenta ingredientes del inventario.
            </p>
          ) : (extra.ingredients || []).length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Sin ingredientes registrados</p>
          ) : (
            (extra.ingredients || []).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-surface rounded-none px-3 py-2 border border-line"
              >
                <span className="text-sm text-ink">{item.ingredientId?.name || 'Insumo eliminado'}</span>
                <span className="num text-xs text-muted">
                  {item.quantity} {UNIT_LABELS[item.unit] || item.unit}
                </span>
              </div>
            ))
          )}
        </div>
      ),
    },
  ];

  const handleRequestDelete = (extraId) => {
    setConfirmDelete({ isOpen: true, extraId });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.extraId;
    if (!id) return;
    try {
      const result = await deleteExtra(id);
      if (result.success) {
        addToast('Extra eliminado correctamente', 'success');
      } else {
        addToast(result.message || 'No se pudo eliminar el extra', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error al eliminar', 'error');
    } finally {
      setConfirmDelete({ isOpen: false, extraId: null });
    }
  };

  const openCreate = () => {
    setEditingExtra(null);
    setIsModalOpen(true);
  };

  const openEdit = (extra) => {
    setEditingExtra(extra);
    setIsModalOpen(true);
  };

  return (
    <MenuPageShell
      activeMenu={activeMenu}
      subtitle="Acompañamientos, salsas y adicionales disponibles para el menú"
      actions={
        <>
          <ReportButton
            compact
            label="Exportar"
            title="Extras"
            columns={extrasReportColumns}
            rows={filteredExtras}
            getImageUrl={(r) => r.image}
            itemTag="extra"
            summary={[
              { label: 'Total de extras', value: filteredExtras.length },
              { label: 'Compuestos', value: filteredExtras.filter((e) => e.isCompound).length },
            ]}
          />
          <button
            type="button"
            onClick={openCreate}
            disabled={loading}
            className={MENU_PRIMARY_BUTTON}
          >
            Nuevo extra
          </button>
        </>
      }
      modals={
        <>
          <AddExtraModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingExtra(null);
            }}
            onAdd={handleSave}
            onEditExisting={openEdit}
            editingExtra={editingExtra}
          />

          <ConfirmModal
            isOpen={confirmDelete.isOpen}
            onClose={() => setConfirmDelete({ isOpen: false, extraId: null })}
            onConfirm={handleDeleteConfirm}
            title="Eliminar extra"
            message="¿Estás seguro de que deseas eliminar este extra? Esta acción no se puede deshacer."
            confirmText="Eliminar"
            loading={loading}
          />

          <ViewDetailsModal
            key={viewingExtra?._id}
            isOpen={Boolean(viewingExtra)}
            onClose={() => setViewingExtra(null)}
            title={viewingExtra?.name}
            image={viewingExtra?.image}
            sections={viewingExtra ? buildExtraSections(viewingExtra) : []}
          />
        </>
      }
    >
      {error && (
        <div className="mb-5 bg-acsoft border border-acline text-ac px-4 py-3 text-sm">
          Error de conexión: {error}
        </div>
      )}

      {/* Resumen Hero de Métricas */}
      <MenuHero
        loading={loading}
        primary={{
          kick: 'Extras activos',
          value: activeExtras,
          suffix: `de ${extras.length} registrados`,
          note: heroNote ? `${heroNote}.` : 'Todo el catálogo de extras está disponible y completo.',
          noteTone: heroNote ? 'ac' : 'ok',
        }}
        secondary={[
          { kick: 'Extra estrella', value: mostRequestedExtra, label: 'Más pedido' },
          {
            kick: 'Extras agotados',
            value: outOfStockExtras,
            label: outOfStockExtras > 0 ? 'Sin disponibilidad' : 'Todos disponibles',
            tone: outOfStockExtras > 0 ? 'ac' : undefined,
          },
          {
            kick: 'Extras compuestos',
            value: compoundExtrasCount,
            label: 'Descuentan inventario',
          },
        ]}
      />

      {/* Barra de Filtros, Categorías y Buscador */}
      <MenuFilterRow
        chips={categoryChips}
        value={categoryFilter}
        onChange={(val) => {
          setCategoryFilter(val);
          setPage(1);
        }}
        filters={[
          {
            label: 'Estado',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'Todos los estados' },
              { value: 'DISPONIBLE', label: 'Disponibles' },
              { value: 'AGOTADO', label: 'Agotados' },
            ],
          },
          {
            label: 'Tipo',
            value: typeFilter,
            onChange: (val) => {
              setTypeFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'Todos los tipos' },
              { value: 'compound', label: 'Compuestos (con receta)' },
              { value: 'simple', label: 'Simples' },
            ],
          },
        ]}
        extra={
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <FAIcon
              icon="magnifying-glass"
              size="xs"
              className="absolute left-3 top-3 text-muted"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar extra..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-ac transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-muted hover:text-ink text-xs"
                title="Limpiar búsqueda"
              >
                <FAIcon icon="times" size="xs" />
              </button>
            )}
          </div>
        }
      />

      {/* Banner de atención si faltan imágenes */}
      <MenuAttentionBanner
        items={missingImage}
        getKey={(e) => e._id}
        getTitle={(e) => e.name}
        onEdit={openEdit}
        noun={['extra', 'extras']}
      />

      {/* Spinner de carga */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
          <span className="ml-3 text-sm text-muted font-medium">Cargando extras...</span>
        </div>
      )}

      {/* Cuadrícula de tarjetas de extras */}
      {!loading && filteredExtras.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {paginatedItems.map((extra) => (
              <ExtraCard
                key={extra._id}
                title={extra.name}
                category={extra.category}
                price={extra.price}
                image={extra.image}
                status={extra.status}
                isCompound={extra.isCompound}
                isMostSold={bestSeller?.extra?._id === extra._id}
                onEdit={() => openEdit(extra)}
                onDelete={() => handleRequestDelete(extra._id)}
                onView={() => setViewingExtra(extra)}
              />
            ))}
          </div>

          <PaginationControls
            compact
            page={page}
            totalPages={totalPages}
            onPrev={prev}
            onNext={next}
            onGoTo={goTo}
          />
        </>
      )}

      {/* Estado vacío por filtros o catálogo vacío */}
      {!loading && filteredExtras.length === 0 && !error && (
        <div className="text-center py-14 border border-dashed border-line">
          <p className="kick text-muted mb-2">Sin resultados</p>
          <p className="text-sm text-inkalt mb-3">
            No se encontraron extras {categoryFilter !== 'all' ? 'en esta categoría' : 'registrados'}.
          </p>
          {(categoryFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
                setTypeFilter('all');
                setSearchTerm('');
              }}
              className="px-4 py-2 border border-line bg-surface text-xs font-display font-semibold text-ink hover:border-ac hover:text-ac transition-colors"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      )}
    </MenuPageShell>
  );
}

export default function Extras() {
  return (
    <ToastProvider>
      <ExtrasContent />
    </ToastProvider>
  );
}