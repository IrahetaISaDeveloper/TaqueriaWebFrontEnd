// src/pages/DrinkSets.jsx
//
// Conjuntos de bebidas: agrupaciones de conveniencia (ej. "La clásica" =
// Coca-Cola + Fanta) que el admin arma una vez y reutiliza al crear combos.
//
// Antes vivían como un panel desplegable dentro de la pantalla de Bebidas,
// donde quedaban escondidos y mezclados con un listado que no tiene nada que
// ver. Ahora son su propia pantalla, con su propio permiso.
import React, { useState, useMemo } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import FAIcon from '../components/commons/FAIcon';
import Select from '../components/commons/Select';
import ReportButton from '../components/commons/ReportButton';
import AddDrinkSetModal from '../components/dashboard/AddDrinkSetModal';
import StatLine from '../components/dashboard/StatLine';
import useDrinkSets from '../hooks/useDrinkSets';
import useDrinks from '../hooks/useDrinks';
import { drinkSetsReportColumns } from '../constants/reportConfigs';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';

function DrinkSetsContent() {
  const [activeMenu] = useState('drink-sets');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                  Conjuntos de bebidas
                </h1>
                <p className="text-sm sm:text-base text-inkalt">
                  Agrupa bebidas que suelen ir juntas para elegirlas rápido al armar un combo.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ReportButton
                  title="Conjuntos de bebidas"
                  subtitle={statusFilter === 'all' ? undefined : `Filtrado por estado: ${statusFilter}`}
                  columns={drinkSetsReportColumns}
                  rows={filteredSets}
                  itemTag="conjunto"
                  summary={[
                    { label: 'Conjuntos totales', value: drinkSets.length },
                    { label: 'Activos', value: activeCount },
                    { label: 'Inactivos', value: drinkSets.length - activeCount },
                  ]}
                />

                <button
                  type="button"
                  onClick={() => { setEditingSet(null); setIsModalOpen(true); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ac text-white rounded-none text-sm font-display font-semibold hover:bg-ac transition-colors"
                >
                  <FAIcon icon="plus" />
                  Nuevo conjunto
                </button>
              </div>
            </div>

            {/* Resumen: mismo lenguaje editorial del Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <StatLine
                title="Conjuntos"
                value={loading ? '—' : String(drinkSets.length)}
                label="Registrados en el sistema"
              />
              <StatLine
                title="Activos"
                value={loading ? '—' : String(activeCount)}
                label="Disponibles para usar en combos"
                highlighted
              />
              <StatLine
                title="Bebidas de tercero"
                value={loading ? '—' : String(thirdPartyDrinks.length)}
                label="Se pueden agrupar en conjuntos"
              />
            </div>

            {/* Listado */}
            <div className="bg-surface rounded-none border border-line overflow-hidden">
              <div className="p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line">
                <h2 className="text-lg font-display font-bold text-ink">
                  Conjuntos registrados
                </h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar conjunto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline text-sm text-inkalt placeholder:text-muted"
                  />
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                  </Select>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {loading ? (
                  <p className="text-sm text-muted text-center py-8">Cargando conjuntos...</p>
                ) : drinkSets.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-surfalt flex items-center justify-center text-muted">
                      <FAIcon icon="layer-group" size="xl" />
                    </div>
                    <p className="text-muted text-sm mb-1">Todavía no hay conjuntos creados.</p>
                    <p className="text-muted text-xs">
                      Crea uno para poder ofrecer varias bebidas a elegir dentro de un combo.
                    </p>
                  </div>
                ) : filteredSets.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">
                    Ningún conjunto coincide con los filtros.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredSets.map((set) => (
                      <div
                        key={set._id}
                        className={`p-4 rounded-none border transition-colors ${
                          set.status === 'activo'
                            ? 'border-line bg-surface hover:border-ac'
                            : 'border-line bg-surfalt opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-display font-bold text-ink">{set.name}</p>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-display font-semibold ${
                            set.status === 'activo'
                              ? 'bg-oksoft text-ok border border-ok'
                              : 'bg-line text-muted border border-linealt'
                          }`}>
                            {set.status === 'activo' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted mb-1">
                          {(set.drinkIds || []).length} bebida{(set.drinkIds || []).length === 1 ? '' : 's'}
                        </p>
                        <p className="text-xs text-inkalt mb-3 line-clamp-2 min-h-[2rem]">
                          {(set.drinkIds || []).map((d) => d.name).join(', ') || 'Sin bebidas'}
                        </p>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingSet(set); setIsModalOpen(true); }}
                            className="flex-1 text-[11px] font-display font-semibold text-inkalt bg-surfalt hover:bg-line rounded-none py-1.5 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(set)}
                            className={`flex-1 text-[11px] font-display font-semibold rounded-none py-1.5 transition-colors text-white ${
                              set.status === 'activo'
                                ? 'bg-warn hover:bg-warn'
                                : 'bg-ok hover:bg-ok'
                            }`}
                          >
                            {set.status === 'activo' ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-muted">
              Los conjuntos no se eliminan, solo se deshabilitan: si un combo ya usa uno, borrarlo
              dejaría ese combo sin opciones de bebida.
            </p>
          </div>
        </main>
      </div>

      <AddDrinkSetModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSet(null); }}
        onCreated={createDrinkSet}
        onUpdated={updateDrinkSet}
        drinks={thirdPartyDrinks}
        setToEdit={editingSet}
      />
    </div>
  );
}

export default function DrinkSets() {
  return (
    <ToastProvider>
      <DrinkSetsContent />
    </ToastProvider>
  );
}
