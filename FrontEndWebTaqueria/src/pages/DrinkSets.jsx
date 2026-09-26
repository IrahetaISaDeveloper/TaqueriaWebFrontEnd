// src/pages/DrinkSets.jsx
//
// Conjuntos de bebidas: agrupaciones de conveniencia (ej. "La clásica" =
// Coca-Cola + Fanta) que el admin arma una vez y reutiliza al crear combos.
//
// Antes vivían como un panel desplegable dentro de la pantalla de Bebidas,
// donde quedaban escondidos y mezclados con un listado que no tiene nada que
// ver. Ahora son su propia pantalla, con su propio permiso.
import React, { useState, useMemo } from 'react';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import CatalogStats from '../components/menu/CatalogStats';
import CatalogToolbar from '../components/menu/CatalogToolbar';
import CatalogEmpty from '../components/menu/CatalogEmpty';
import CatalogCard from '../components/menu/CatalogCard';
import FAIcon from '../components/commons/FAIcon';
import ReportButton from '../components/commons/ReportButton';
import AddDrinkSetModal from '../components/dashboard/AddDrinkSetModal';
import useDrinkSets from '../hooks/useDrinkSets';
import useDrinks from '../hooks/useDrinks';
import { drinkSetsReportColumns } from '../constants/reportConfigs';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';

function DrinkSetsContent() {
  const [activeMenu] = useState('drink-sets');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { drinkSets, loading, createDrinkSet, updateDrinkSet, toggleDrinkSetStatus } = useDrinkSets();
  const { drinks } = useDrinks();
  const { addToast } = useToast();

  // Solo las bebidas de tercero pueden formar parte de un conjunto: las de
  // casa se preparan al momento y no se agrupan para elegir en un combo.
  const thirdPartyDrinks = useMemo(() => drinks.filter((d) => d.category === 'tercero'), [drinks]);

  const filteredSets = useMemo(() => {
    return drinkSets.filter((set) => {
      const matchesSearch = set.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || set.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drinkSets, searchTerm, statusFilter]);

  const activeCount = useMemo(() => drinkSets.filter((s) => s.status === 'activo').length, [drinkSets]);

  const handleToggleStatus = async (set) => {
    const result = await toggleDrinkSetStatus(set._id);
    if (result.success) {
      addToast(set.status === 'activo' ? 'Conjunto deshabilitado' : 'Conjunto habilitado', 'success');
    } else {
      addToast('No se pudo actualizar el estado del conjunto', 'error');
    }
  };

  const inactiveCount = drinkSets.length - activeCount;
  const activePct = drinkSets.length ? Math.round((activeCount / drinkSets.length) * 100) : 0;
  const avgDrinks = drinkSets.length
    ? (drinkSets.reduce((sum, s) => sum + (s.drinkIds || []).length, 0) / drinkSets.length).toFixed(1)
    : '0';
  const openCreate = () => { setEditingSet(null); setIsModalOpen(true); };
  const openEdit = (set) => { setEditingSet(set); setIsModalOpen(true); };

  const hasActiveFilters = statusFilter !== 'all' || Boolean(searchTerm.trim());
  const clearFilters = () => { setStatusFilter('all'); setSearchTerm(''); };

  // Conteo por pestaña de estado respetando la búsqueda.
  const statusCount = (id) =>
    drinkSets.filter((s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) && (id === 'all' || s.status === id)
    ).length;

  return (
    <MenuPageShell
      activeMenu={activeMenu}
      subtitle="Agrupa bebidas que suelen ir juntas para elegirlas rápido al armar un combo"
      actions={
        <>
          <ReportButton
            compact
            label="Exportar"
            title="Conjuntos de bebidas"
            subtitle={statusFilter === 'all' ? undefined : `Filtrado por estado: ${statusFilter}`}
            columns={drinkSetsReportColumns}
            rows={filteredSets}
            itemTag="conjunto"
            summary={[
              { label: 'Conjuntos totales', value: drinkSets.length },
              { label: 'Activos', value: activeCount },
              { label: 'Inactivos', value: inactiveCount },
            ]}
          />
          <button type="button" onClick={openCreate} className={MENU_PRIMARY_BUTTON}>
            Nuevo conjunto
          </button>
        </>
      }
      modals={
        <AddDrinkSetModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingSet(null); }}
          onCreated={createDrinkSet}
          onUpdated={updateDrinkSet}
          drinks={thirdPartyDrinks}
          setToEdit={editingSet}
        />
      }
    >
      <CatalogStats
        loading={loading}
        cells={[
          {
            kick: 'Conjuntos activos',
            icon: 'layer-group',
            value: activeCount,
            suffix: `/ ${drinkSets.length}`,
            progress: activePct,
            label: `${activePct}% se ofrece en combos`,
          },
          {
            kick: 'Inactivos',
            icon: 'ban',
            value: inactiveCount,
            tone: inactiveCount > 0 ? 'ac' : undefined,
            label: statusFilter === 'inactivo'
              ? 'Mostrando solo estos · quitar'
              : inactiveCount > 0 ? 'Deshabilitados · ver cuáles' : 'Todos habilitados',
            active: statusFilter === 'inactivo',
            onClick: inactiveCount > 0 || statusFilter === 'inactivo'
              ? () => setStatusFilter((s) => (s === 'inactivo' ? 'all' : 'inactivo'))
              : undefined,
          },
          {
            kick: 'Bebidas de tercero',
            icon: 'wine-glass',
            value: thirdPartyDrinks.length,
            label: 'Se pueden agrupar en conjuntos',
          },
          {
            kick: 'Promedio por conjunto',
            icon: 'list-check',
            value: avgDrinks,
            label: 'Bebidas por conjunto',
          },
        ]}
      />

      <CatalogToolbar
        search={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Buscar conjunto por nombre..."
        tabs={[
          { id: 'all', label: 'Todos', count: statusCount('all') },
          { id: 'activo', label: 'Activos', count: statusCount('activo') },
          { id: 'inactivo', label: 'Inactivos', count: statusCount('inactivo') },
        ]}
        tabsLabel="Estado"
        tabValue={statusFilter}
        onTab={setStatusFilter}
        loading={loading}
        shown={filteredSets.length}
        total={drinkSets.length}
        noun="conjuntos"
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
          <span className="ml-3 text-sm text-muted">Cargando conjuntos...</span>
        </div>
      ) : filteredSets.length === 0 ? (
        <CatalogEmpty
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          onCreate={openCreate}
          filteredText="Ningún conjunto coincide con los filtros aplicados."
          emptyText="Crea uno para poder ofrecer varias bebidas a elegir dentro de un combo."
          createLabel="Nuevo conjunto"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredSets.map((set, i) => {
            const active = set.status === 'activo';
            const names = (set.drinkIds || []).map((d) => d.name).filter(Boolean);
            const count = names.length;
            return (
              <CatalogCard
                key={set._id}
                visual={<DrinkSetVisual count={count} names={names} index={i + 1} />}
                name={set.name}
                description={names.join(', ')}
                emptyDescription="Sin bebidas asignadas."
                category="Conjunto"
                eyebrow={`${count} bebida${count === 1 ? '' : 's'}`}
                available={active}
                availableLabel="Activo"
                unavailableLabel="Inactivo"
                meta={count === 0 ? [{ icon: 'triangle-exclamation', label: 'Vacío', tone: 'warn' }] : []}
                onView={() => openEdit(set)}
                onEdit={() => openEdit(set)}
                extraActions={[
                  {
                    icon: active ? 'ban' : 'check',
                    label: active ? 'Deshabilitar' : 'Habilitar',
                    onClick: () => handleToggleStatus(set),
                    danger: active,
                  },
                ]}
              />
            );
          })}
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-muted">
        <FAIcon icon="circle-info" size="xs" className="mt-0.5 shrink-0" />
        <span>
          Los conjuntos no se eliminan, solo se deshabilitan: si un combo ya usa uno, borrarlo
          dejaría ese combo sin opciones de bebida.
        </span>
      </p>
    </MenuPageShell>
  );
}

// Zona visual de la tarjeta (los conjuntos no llevan foto): la cantidad de
// bebidas en grande y los nombres como fichas, sobre el fondo alterno.
const DrinkSetVisual = ({ count, names, index }) => {
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return (
    <div className="w-full h-full flex flex-col justify-between p-3 pt-12 bg-surfalt">
      <div className="flex items-end gap-3 px-1">
        <span className="num text-5xl font-light text-ink leading-none">{String(count).padStart(2, '0')}</span>
        <span className="kick text-muted mb-1">bebida{count === 1 ? '' : 's'}</span>
        <FAIcon icon="wine-glass" className="ml-auto mb-1 text-ac/70" size="lg" />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {shown.map((n) => (
          <span key={n} className="text-[11px] px-2 py-1 bg-surface border border-line text-inkalt truncate max-w-[45%]">
            {n}
          </span>
        ))}
        {rest > 0 && <span className="num text-[11px] px-2 py-1 bg-ac text-white">+{rest}</span>}
        <span className="num text-[11px] text-muted ml-auto">N.º {String(index).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

export default function DrinkSets() {
  return (
    <ToastProvider>
      <DrinkSetsContent />
    </ToastProvider>
  );
}
