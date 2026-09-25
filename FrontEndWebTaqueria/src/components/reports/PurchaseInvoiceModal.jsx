// src/components/reports/PurchaseInvoiceModal.jsx
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import { PURCHASE_CATEGORIES } from '../../hooks/usePurchaseInvoices';

// El IVA salvadoreño. Se usa solo para SUGERIR el monto mientras el usuario
// escribe el subtotal: lo que se guarda es lo que él confirme, porque la
// factura del proveedor puede traer un desglose con centavos distintos por
// redondeo, y manda el papel.
const IVA_RATE = 0.13;

const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const EMPTY_FORM = {
  supplierName: '',
  supplierTaxId: '',
  invoiceNumber: '',
  issuedAt: '',
  subtotal: '',
  tax: '',
  category: 'insumos',
  notes: '',
};

const inputClass =
  'w-full px-3.5 py-2 bg-surface border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink placeholder:text-muted/70 transition-colors';

const labelClass =
  'block text-[11px] font-mono tracking-wider font-semibold text-ink uppercase mb-1.5';

const PurchaseInvoiceModal = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Cada vez que se abre, el formulario arranca limpio: si no, quedarían los
  // datos de la factura anterior y es fácil registrar una compra equivocada.
  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setFile(null);
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Al escribir el subtotal se propone el IVA correspondiente, pero solo
      // si el usuario todavía no lo escribió a mano: nunca se pisa un valor
      // que él ya haya puesto.
      if (field === 'subtotal' && !prev.tax) {
        const subtotal = Number(value);
        if (subtotal > 0) next.tax = (subtotal * IVA_RATE).toFixed(2);
      }

      return next;
    });
  };

  const subtotalNum = Number(form.subtotal) || 0;
  const taxNum = Number(form.tax) || 0;
  const totalPreview = subtotalNum + taxNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.supplierName.trim() || !form.invoiceNumber.trim() || !form.issuedAt) {
      setFormError('El proveedor, el número de factura y la fecha son obligatorios.');
      return;
    }
    if (subtotalNum <= 0) {
      setFormError('El subtotal debe ser mayor que cero.');
      return;
    }

    setSaving(true);
    const result = await onSubmit({ ...form, total: totalPreview.toFixed(2) }, file);
    setSaving(false);

    if (result?.success) {
      onClose();
    } else {
      setFormError(result?.message || 'No se pudo registrar la factura.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      {/* Contenedor del Modal con borde superior rojo institucional de acento */}
      <div className="bg-surface rounded-none border border-line border-t-4 border-t-ac max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cabecera institucional con acento rojo y avatar de icono */}
        <div className="bg-surface border-b border-line px-5 sm:px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 bg-acsoft text-ac border border-acline/60 flex items-center justify-center font-display font-bold text-base shrink-0 shadow-xs">
              <FAIcon icon="receipt" className="text-ac text-lg" />
            </div>
            <div className="min-w-0">
              <p className="kick text-[10px] font-bold text-ac tracking-wider mb-0.5">
                REGISTRO CONTABLE
              </p>
              <h3 className="text-lg sm:text-xl font-display font-bold text-ink leading-tight truncate">
                Registrar factura de compra
              </h3>
              <p className="text-xs text-muted truncate">
                Facturas que el negocio recibe de sus proveedores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 flex items-center justify-center border border-line text-muted hover:text-ac hover:border-acline hover:bg-acsoft/20 transition-colors shrink-0 cursor-pointer"
          >
            <FAIcon icon="times" size="sm" />
          </button>
        </div>

        {/* Barra informativa */}
        <div className="px-5 sm:px-6 py-2 bg-surfalt/40 border-b border-line flex items-center justify-between gap-3 text-xs text-muted shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ac" />
            <span>
              Los campos con (<span className="text-ac font-bold">*</span>) son requeridos para la
              declaración de IVA.
            </span>
          </div>
          <span className="font-mono text-[11px] text-muted hidden sm:inline">IVA Tasa 13%</span>
        </div>

        {/* Formulario scrolleable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Sección 1: Datos del Proveedor y Factura */}
          <div className="border-l-2 border-l-ac bg-surfalt/20 p-4 border border-line space-y-3.5">
            <p className="kick text-[10px] font-bold text-ink tracking-wider">
              DATOS DEL PROVEEDOR Y COMPROBANTE
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={labelClass} htmlFor="supplierName">
                  Proveedor <span className="text-ac font-bold">*</span>
                </label>
                <input
                  id="supplierName"
                  type="text"
                  value={form.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  placeholder="Distribuidora La Ceiba"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="supplierTaxId">
                  NIT / NRC del proveedor
                </label>
                <input
                  id="supplierTaxId"
                  type="text"
                  value={form.supplierTaxId}
                  onChange={(e) => handleChange('supplierTaxId', e.target.value)}
                  placeholder="0614-010203-101-2"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="invoiceNumber">
                  N.º de factura <span className="text-ac font-bold">*</span>
                </label>
                <input
                  id="invoiceNumber"
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  placeholder="F-00123"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="issuedAt">
                  Fecha de la factura <span className="text-ac font-bold">*</span>
                </label>
                <input
                  id="issuedAt"
                  type="date"
                  value={form.issuedAt}
                  onChange={(e) => handleChange('issuedAt', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Desglose de Montos y Categoría */}
          <div className="border-l-2 border-l-ac bg-surfalt/20 p-4 border border-line space-y-3.5">
            <p className="kick text-[10px] font-bold text-ink tracking-wider">
              DESGLOSE DE MONTOS Y CLASIFICACIÓN
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={labelClass} htmlFor="subtotal">
                  Subtotal (sin IVA) <span className="text-ac font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-mono">
                    $
                  </span>
                  <input
                    id="subtotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.subtotal}
                    onChange={(e) => handleChange('subtotal', e.target.value)}
                    placeholder="150.00"
                    className={`${inputClass} pl-7 font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="tax">
                  IVA de la factura
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-mono">
                    $
                  </span>
                  <input
                    id="tax"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.tax}
                    onChange={(e) => handleChange('tax', e.target.value)}
                    placeholder="19.50"
                    className={`${inputClass} pl-7 font-mono`}
                  />
                </div>
                <p className="mt-1 text-[10.5px] text-muted leading-tight">
                  Sugerido al 13% del subtotal; editable según comprobante.
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="category">
                  Categoría del gasto
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className={inputClass}
                >
                  {PURCHASE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="file">
                  Comprobante (PDF o imagen)
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <label
                    htmlFor="file"
                    className="px-3 py-1.5 bg-surface border border-line hover:border-ac hover:text-ac text-xs font-semibold text-ink cursor-pointer transition-colors shrink-0 shadow-xs"
                  >
                    <FAIcon icon="paperclip" size="xs" className="mr-1.5" />
                    Seleccionar archivo
                  </label>
                  <input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <span className="text-xs text-muted truncate">
                    {file ? file.name : 'Ningún archivo'}
                  </span>
                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-muted hover:text-ac p-1 text-xs shrink-0 cursor-pointer"
                      title="Quitar archivo"
                    >
                      <FAIcon icon="times" size="xs" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Observaciones */}
          <div className="border-l-2 border-l-ac bg-surfalt/20 p-4 border border-line space-y-2">
            <label className={labelClass} htmlFor="notes">
              Notas u observaciones
            </label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Observaciones sobre esta compra..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Tarjeta de cálculo y total en vivo */}
          <div className="p-4 bg-surfalt/60 border border-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-line bg-surface flex items-center justify-center text-muted">
                <FAIcon icon="file-invoice-dollar" size="sm" />
              </div>
              <div>
                <p className="kick text-[10px] font-bold text-muted tracking-wider">
                  TOTAL CALCULADO DE LA FACTURA
                </p>
                <p className="text-[11px] text-muted">
                  Subtotal: <span className="font-mono text-ink">{money(subtotalNum)}</span> + IVA:{' '}
                  <span className="font-mono text-ink">{money(taxNum)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-light text-ink tracking-tight font-display">
                {money(totalPreview)}
              </span>
            </div>
          </div>

          {formError && (
            <div className="px-4 py-3 bg-acsoft/30 border border-ac text-xs text-ac flex items-center gap-2">
              <FAIcon icon="triangle-exclamation" size="sm" />
              <span>{formError}</span>
            </div>
          )}

          {/* Botones de acción al pie */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-line bg-surface hover:bg-surfalt text-xs font-semibold text-ink transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-ac hover:opacity-90 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {saving && <FAIcon icon="spinner" className="animate-spin" size="xs" />}
              <span>{saving ? 'Guardando...' : 'Registrar factura'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseInvoiceModal;
