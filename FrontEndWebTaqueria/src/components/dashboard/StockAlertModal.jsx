// src/components/dashboard/StockAlertModal.jsx
import React, { useState } from 'react';
import FAIcon from '../commons/FAIcon';

const StockRow = ({ insumo, incomplete, onAddStock, onCompleteInsumo, addToast }) => {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const currentQty = Number(insumo.quantity ?? insumo.stock) || 0;

  const handleAdd = async () => {
    const add = Number(amount);
    if (!add || add <= 0) return;
    setSaving(true);
    const result = await onAddStock(insumo, currentQty + add);
    setSaving(false);
    if (result.success) {
      addToast?.(`Se agregaron ${add} ${insumo.unit || 'unidades'} a ${insumo.name}`, 'success');
      setAmount('');
    } else if (result.message) {
      addToast?.(result.message, 'error');
    }
  };

  return (
    <div className="bg-surface rounded-none border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="min-w-0">
        <p className="font-display font-semibold text-ink truncate">{insumo.name}</p>
        <p className="text-xs text-ac">
          {currentQty} {insumo.unit || 'unidades'} disponibles (umbral: {insumo.lowStockAlert} {insumo.unit || ''})
        </p>
      </div>
      {incomplete ? (
        <button
          type="button"
          onClick={() => onCompleteInsumo(insumo)}
          className="px-3 py-2 rounded-none text-xs font-display font-semibold bg-warnsoft text-warn border border-warn hover:bg-warnsoft inline-flex items-center gap-1.5 shrink-0"
        >
          <FAIcon icon="circle-exclamation" size="xs" />
          Completar información
        </button>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Cantidad"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24 px-3 py-2 rounded-none bg-surfalt border border-line text-xs"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !amount}
            className="px-3 py-2 rounded-none text-xs font-display font-semibold bg-ac text-white hover:bg-ac disabled:opacity-50"
          >
            {saving ? '...' : 'Agregar'}
          </button>
        </div>
      )}
    </div>
  );
};

const PendingRow = ({ insumo, onCompleteInsumo }) => (
  <div className="bg-surface rounded-none border border-line p-4 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="font-display font-semibold text-ink truncate">{insumo.name}</p>
      <p className="text-xs text-muted">Insumo pendiente: le falta ubicación, precio y umbral de stock</p>
    </div>
    <button
      type="button"
      onClick={() => onCompleteInsumo(insumo)}
      className="px-3 py-2 rounded-none text-xs font-display font-semibold bg-warnsoft text-warn border border-warn hover:bg-warnsoft inline-flex items-center gap-1.5 shrink-0"
    >
      <FAIcon icon="pen" size="xs" />
      Completar
    </button>
  </div>
);

const StockAlertModal = ({ isOpen, onClose, insumos, pendingInsumos = [], isIncomplete, onAddStock, onCompleteInsumo, addToast }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none border border-line max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-white font-display font-bold text-lg">Alerta de Stock</h3>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10">
            <FAIcon icon="times" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-3">
          {insumos.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No hay insumos en alerta de stock</p>
          ) : (
            insumos.map((i) => (
              <StockRow
                key={i._id}
                insumo={i}
                incomplete={isIncomplete?.(i)}
                onAddStock={onAddStock}
                onCompleteInsumo={onCompleteInsumo}
                addToast={addToast}
              />
            ))
          )}

          {pendingInsumos.length > 0 && (
            <div className="pt-3">
              <h4 className="text-xs font-display font-bold uppercase tracking-wide text-muted mb-2">
                Insumos pendientes de completar
              </h4>
              <div className="space-y-3">
                {pendingInsumos.map((i) => (
                  <PendingRow key={i._id} insumo={i} onCompleteInsumo={onCompleteInsumo} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAlertModal;
