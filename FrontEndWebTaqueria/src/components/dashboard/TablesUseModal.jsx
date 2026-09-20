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
    <div className="bg-surface rounded-none border border-line p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FAIcon icon="chair" size="sm" className="text-muted" />
          <span className="font-display font-bold text-ink">Mesa {table.number}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-display font-semibold border ${STATUS_STYLES[status] || 'bg-surfalt text-inkalt border-line'}`}>
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
        <div className="bg-surfalt rounded-none border border-line max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <h3 className="text-white font-display font-bold text-lg">Mesas</h3>
            <button type="button" onClick={onClose} className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10">
              <FAIcon icon="times" />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {onBulkUpdate && (
              <div className="flex items-center gap-1.5 bg-surface rounded-none border border-line p-1 mb-4 w-fit">
                <Select variant="ghost" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
                <button
                  type="button"
                  onClick={() => setConfirmBulk(true)}
                  disabled={tables.length === 0}
                  className="px-3 py-1.5 rounded-none text-xs font-display font-semibold text-inkalt bg-surfalt hover:bg-line transition-colors disabled:opacity-50"
                >
                  Aplicar a todas
                </button>
              </div>
            )}

            <div className="flex gap-1.5 flex-wrap mb-4">
              {['ocupada', 'all', 'libre', 'reservada', 'limpieza'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    filter === f ? 'bg-ac text-white' : 'bg-surfalt text-inkalt hover:bg-line'
                  }`}
                >
                  {f === 'all' ? 'Todas' : STATUS_OPTIONS.find((s) => s.value === f)?.label}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No hay mesas para este filtro</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shown.map((t) => <TableCard key={t._id} table={t} onUpdate={onUpdate} addToast={addToast} />)}
              </div>
            )}
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
