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
import MenuHero from '../components/menu/MenuHero';
import MenuFilterRow from '../components/menu/MenuFilterRow';
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
  const openCreate = () => { setEditingSet(null); setIsModalOpen(true); };

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
      <MenuHero
        loading={loading}
        primary={{
          kick: 'Conjuntos activos',
          value: activeCount,
          suffix: `de ${drinkSets.length} registrados`,
          note: inactiveCount > 0
            ? `${inactiveCount} conjunto${inactiveCount === 1 ? ' está deshabilitado' : 's están deshabilitados'} y no se ofrece${inactiveCount === 1 ? '' : 'n'} en los combos.`
            : 'Todos los conjuntos se pueden usar en combos.',
          noteTone: inactiveCount > 0 ? 'ac' : 'ok',
        }}
        secondary={[
          { kick: 'Bebidas de tercero', value: thirdPartyDrinks.length, label: 'Se pueden agrupar en conjuntos' },
          { kick: 'Inactivos', value: inactiveCount, label: 'Deshabilitados, no se borran' },
        ]}
      />

      <MenuFilterRow
        label="Estado"
        chips={[
          { id: 'all', label: 'Todos' },
          { id: 'activo', label: 'Activos' },
          { id: 'inactivo', label: 'Inactivos' },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        extra={
          <input
            type="text"
            placeholder="Buscar conjunto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 w-full sm:w-56 bg-surface border border-line rounded-none focus:outline-none focus:border-ac text-xs text-inkalt placeholder:text-muted"
          />
        }
      />

      {loading ? (
        <p className="text-sm text-muted text-center py-12">Cargando conjuntos...</p>
      ) : drinkSets.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-line">
          <p className="kick text-muted mb-2">Sin conjuntos</p>
          <p className="text-sm text-inkalt">
            Crea uno para poder ofrecer varias bebidas a elegir dentro de un combo.
          </p>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-line">
          <p className="kick text-muted mb-2">Sin resultados</p>
          <p className="text-sm text-inkalt">Ningún conjunto coincide con los filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredSets.map((set) => {
            const active = set.status === 'activo';
            const count = (set.drinkIds || []).length;
            return (
              <div
                key={set._id}
                className={`group bg-surface border border-line flex flex-col transition-colors hover:border-ac ${active ? '' : 'opacity-60'}`}
              >
                <div className="px-4 pt-3.5 pb-3 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-medium text-ink leading-snug line-clamp-2 min-w-0">{set.name}</h3>
                    <span className="num text-[13px] text-ink shrink-0">{count}</span>
                  </div>
                  <p className="kick text-muted mt-1.5">{count} bebida{count === 1 ? '' : 's'}</p>
                  <p className="text-xs text-inkalt mt-3 line-clamp-3 min-h-[3rem]">
                    {(set.drinkIds || []).map((d) => d.name).join(', ') || 'Sin bebidas'}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-line">
                    <span className={`kick inline-flex items-center gap-1.5 ${active ? 'text-ok' : 'text-muted'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-ok' : 'bg-muted'}`} />
                      {active ? 'Activo' : 'Inactivo'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setEditingSet(set); setIsModalOpen(true); }}
                        className="kick text-inkalt hover:text-ac transition-colors cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(set)}
                        className={`kick transition-colors cursor-pointer ${active ? 'text-ac hover:text-ink' : 'text-ok hover:text-ink'}`}
                      >
                        {active ? 'Deshabilitar' : 'Habilitar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        Los conjuntos no se eliminan, solo se deshabilitan: si un combo ya usa uno, borrarlo
        dejaría ese combo sin opciones de bebida.
      </p>
    </MenuPageShell>
  );
}

export default function DrinkSets() {
  return (
    <ToastProvider>
      <DrinkSetsContent />
    </ToastProvider>
  );
}
