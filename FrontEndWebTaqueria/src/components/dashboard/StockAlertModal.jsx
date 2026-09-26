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
    <div className="bg-surface rounded-none border border-acline/60 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between shadow-xs hover:border-ac transition-colors">
      <div className="min-w-0">
        <p className="font-display font-semibold text-ink truncate text-[14px]">{insumo.name}</p>
        <p className="text-xs text-ac font-medium mt-0.5 flex items-center gap-1.5">
          <FAIcon icon="triangle-exclamation" size="xs" />
          <span>{currentQty} {insumo.unit || 'unidades'} disponibles (umbral: {insumo.lowStockAlert} {insumo.unit || ''})</span>
        </p>
      </div>
      {incomplete ? (
        <button
          type="button"
          onClick={() => onCompleteInsumo(insumo)}
          className="px-3 py-1.5 rounded-none text-xs font-display font-semibold bg-warnsoft text-warn border border-warn/70 hover:bg-warnsoft/80 inline-flex items-center gap-1.5 shrink-0 transition-colors"
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
            className="w-24 px-2.5 py-1.5 rounded-none bg-surface border border-line text-xs font-mono focus:border-ac"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !amount}
            className="px-3.5 py-1.5 rounded-none text-xs font-display font-semibold border border-ac text-ac bg-acsoft/20 hover:bg-acsoft disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : 'Agregar'}
          </button>
        </div>
      )}
    </div>
  );
};

const PendingRow = ({ insumo, onCompleteInsumo }) => (
  <div className="bg-surface rounded-none border border-acline/50 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs hover:border-ac transition-colors">
    <div className="min-w-0">
      <p className="font-display font-semibold text-ink truncate text-[14px]">{insumo.name}</p>
      <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
        <FAIcon icon="circle-info" size="xs" className="text-warn shrink-0" />
        <span className="truncate">Insumo pendiente: le falta ubicación, precio y umbral</span>
      </p>
    </div>
    <button
      type="button"
      onClick={() => onCompleteInsumo(insumo)}
      className="px-3 py-1.5 rounded-none text-xs font-display font-semibold bg-warnsoft text-warn border border-warn/70 hover:bg-warnsoft/80 inline-flex items-center gap-1.5 shrink-0 transition-colors"
    >
      <FAIcon icon="pen" size="xs" />
      Completar
    </button>
  </div>
);

const StockAlertModal = ({ isOpen, onClose, insumos = [], pendingInsumos = [], isIncomplete, onAddStock, onCompleteInsumo, addToast }) => {
  if (!isOpen) return null;

  const totalAlerts = insumos.length;
  const totalPending = pendingInsumos.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none border border-acline/80 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Encabezado rojo delgado y compacto */}
        <div className="bg-ac px-4 sm:px-5 py-2.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-display font-bold text-base sm:text-lg leading-none">
              Alerta de Stock
            </h3>
            <span className="text-white/80 text-xs font-medium">
              · {totalAlerts} {totalAlerts === 1 ? 'en alerta' : 'en alerta'}
              {totalPending > 0 && ` · ${totalPending} pendientes`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
          >
            <FAIcon icon="times" size="xs" />
          </button>
        </div>

        {/* Contenido con bordes acento */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Insumos en alerta de stock */}
          <div>
            <h4 className="kick text-[10.5px] text-ac font-bold tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
              INSUMOS POR DEBAJO DEL UMBRAL
            </h4>

            {insumos.length === 0 ? (
              <div className="bg-surface border border-line p-3 text-center text-xs text-muted flex items-center justify-center gap-2">
                <FAIcon icon="circle-check" size="xs" className="text-ok" />
                <span>No hay insumos en alerta de stock en este momento</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {insumos.map((i) => (
                  <StockRow
                    key={i._id}
                    insumo={i}
                    incomplete={isIncomplete?.(i)}
                    onAddStock={onAddStock}
                    onCompleteInsumo={onCompleteInsumo}
                    addToast={addToast}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Insumos pendientes de completar */}
          {pendingInsumos.length > 0 && (
            <div className="pt-2">
              <h4 className="kick text-[10.5px] text-warn font-bold tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0" />
                INSUMOS PENDIENTES DE COMPLETAR ({pendingInsumos.length})
              </h4>
              <div className="space-y-2.5">
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
