// src/components/dashboard/TablesUseModal.jsx
import React, { useState } from 'react';
import FAIcon from '../commons/FAIcon';
import Select from '../commons/Select';
import ConfirmModal from '../commons/ConfirmModal';

const STATUS_OPTIONS = [
  { value: 'libre', label: 'Libre' },
  { value: 'ocupada', label: 'Ocupada' },
  { value: 'reservada', label: 'Reservada' },
  { value: 'limpieza', label: 'En limpieza' },
];

const STATUS_STYLES = {
  libre: 'bg-oksoft text-ok border-ok',
  ocupada: 'bg-acsoft text-ac border-acline',
  reservada: 'bg-infosoft text-info border-info',
  limpieza: 'bg-warnsoft text-warn border-warn',
};

const TableCard = ({ table, onUpdate, addToast }) => {
  const [status, setStatus] = useState(table.status);
  const [saving, setSaving] = useState(false);

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setSaving(true);
    const result = await onUpdate(table._id, { number: table.number, status: newStatus });
    setSaving(false);
    if (!result.success) {
      setStatus(table.status);
      addToast?.(result.message || 'No se pudo actualizar la mesa', 'error');
    } else {
      addToast?.(`Mesa ${table.number} actualizada a "${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}"`, 'success');
    }
  };

  return (
    <div className="bg-surface rounded-none border border-acline/60 p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FAIcon icon="chair" size="sm" className="text-ac" />
          <span className="font-display font-bold text-[14px] text-ink">Mesa {table.number}</span>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-wider border ${STATUS_STYLES[status] || 'bg-surfalt text-inkalt border-line'}`}>
          {STATUS_OPTIONS.find((s) => s.value === status)?.label || status}
        </span>
      </div>
      <Select size="sm" value={status} onChange={handleChange} disabled={saving}>
        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>
    </div>
  );
};

const TablesUseModal = ({ isOpen, onClose, tables, onUpdate, onBulkUpdate, addToast }) => {
  const [filter, setFilter] = useState('ocupada');
  const [bulkStatus, setBulkStatus] = useState('libre');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  if (!isOpen) return null;

  const shown = filter === 'all' ? tables : tables.filter((t) => t.status === filter);

  const handleBulkConfirm = async () => {
    setBulkLoading(true);
    const result = await onBulkUpdate(bulkStatus);
    setBulkLoading(false);
    setConfirmBulk(false);
    const label = STATUS_OPTIONS.find((s) => s.value === bulkStatus)?.label || bulkStatus;
    addToast?.(result.success ? `Todas las mesas se pusieron en "${label}"` : (result.message || 'No se pudo actualizar las mesas'), result.success ? 'success' : 'error');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-surfalt rounded-none border border-acline/60 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">

          {/* Header delgado */}
          <div className="bg-ac px-4 sm:px-5 py-2.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <h3 className="text-white font-display font-bold text-base sm:text-lg leading-tight">Mesas</h3>
              <span className="text-white/70 text-xs font-medium">· {tables.length} mesas</span>
            </div>
            <button type="button" onClick={onClose}
              className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center hover:bg-white/10 transition-colors ml-2 shrink-0">
              <FAIcon icon="times" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {/* Acción masiva compacta */}
            {onBulkUpdate && (
              <div className="flex items-center gap-1.5 bg-surface border border-acline/60 p-1.5 mb-3.5 shadow-xs">
                <Select variant="ghost" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
                <button
                  type="button"
                  onClick={() => setConfirmBulk(true)}
                  disabled={tables.length === 0}
                  className="px-3 py-1.5 text-xs font-display font-semibold text-inkalt bg-surfalt border border-line hover:border-acline hover:text-ac transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
                >
                  Aplicar a todas
                </button>
              </div>
            )}

            {/* Sección: Lista de mesas */}
            <div className="bg-surface rounded-none border border-acline/60 p-4 shadow-xs">
              <h4 className="kick text-[10.5px] text-ac font-bold tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
                ESTADO DE LAS MESAS
              </h4>

              {/* Filtros */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {['ocupada', 'all', 'libre', 'reservada', 'limpieza'].map((f) => {
                  const count = f === 'all' ? tables.length : tables.filter((t) => t.status === f).length;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 text-[11px] font-display font-semibold border transition-colors ${
                        filter === f
                          ? 'bg-ac text-white border-ac'
                          : 'bg-surfalt text-inkalt border-line hover:border-acline'
                      }`}
                    >
                      {f === 'all' ? 'Todas' : STATUS_OPTIONS.find((s) => s.value === f)?.label}
                      {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                    </button>
                  );
                })}
              </div>

              {shown.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">No hay mesas para este filtro</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {shown.map((t) => <TableCard key={t._id} table={t} onUpdate={onUpdate} addToast={addToast} />)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3.5">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-display font-semibold text-inkalt hover:text-ink transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={handleBulkConfirm}
        title="Cambiar todas las mesas"
        message={`¿Poner las ${tables.length} mesas en estado "${STATUS_OPTIONS.find((s) => s.value === bulkStatus)?.label}"? Si alguna tiene un pedido activo, ese pedido se cancelará.`}
        confirmText="Aplicar a todas"
        variant="warning"
        icon="chair"
        loading={bulkLoading}
      />
    </>
  );
};

export default TablesUseModal;
