// src/components/reports/PurchaseInvoiceModal.jsx
//
// Registro y edición de una factura de compra. Además de lo que necesita el
// reporte de IVA, pide los datos del Libro de Compras (clase y tipo de
// documento, NRC, desglose por columna y clasificación para renta). Con
// "invoice" se abre en modo edición, precargado con esa factura.
import React, { useState, useEffect } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { ModalHeader, ModalBody, ModalFooter, FormSection, OptionalBadge, FORM_INPUT, MODAL_BTN_SECONDARY, MODAL_BTN_PRIMARY } from '@syscor/web-shared/src/components/FormModal';
import { PURCHASE_CATEGORIES } from '../../hooks/usePurchaseInvoices';
import {
  BOOK_DEFAULTS, BOOK_AMOUNT_COLUMNS, BOOK_AMOUNT_KEYS,
  DOCUMENT_CLASS_OPTIONS, DOCUMENT_TYPE_OPTIONS, OPERATION_TYPE_OPTIONS,
  CLASSIFICATION_OPTIONS, SECTOR_OPTIONS, COST_TYPE_OPTIONS,
} from '../../constants/purchaseBook';

// El IVA salvadoreño. Se usa solo para SUGERIR el monto mientras el usuario
// escribe las compras gravadas: lo que se guarda es lo que él confirme,
// porque la factura del proveedor puede traer un desglose con centavos
// distintos por redondeo, y manda el papel.
const IVA_RATE = 0.13;

// Columnas sobre las que se cobra IVA (las que generan crédito fiscal).
const TAXED_KEYS = ['internalTaxed', 'internationTaxed', 'importGoods', 'importServices'];

const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const EMPTY_AMOUNTS = Object.fromEntries(BOOK_AMOUNT_KEYS.map((k) => [k, '']));

const EMPTY_FORM = {
  supplierName: '',
  supplierNrc: '',
  supplierTaxId: '',
  supplierDui: '',
  invoiceNumber: '',
  series: '',
  issuedAt: '',
  ...BOOK_DEFAULTS,
  ...EMPTY_AMOUNTS,
  tax: '',
  ivaWithheld: '',
  category: 'insumos',
  notes: '',
};

// Fecha guardada -> valor de <input type="date">, con el día local (no el
// de UTC, que en El Salvador puede caer en el día anterior).
const toDateInput = (d) => {
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toInputAmount = (n) => (Number(n) > 0 ? String(n) : '');

// Factura guardada -> valores del formulario. Las facturas anteriores al
// libro solo traen subtotal: se muestra como compra interna gravada.
const invoiceToForm = (inv) => {
  const amounts = Object.fromEntries(BOOK_AMOUNT_KEYS.map((k) => [k, toInputAmount(inv[k])]));
  if (BOOK_AMOUNT_KEYS.every((k) => !amounts[k]) && Number(inv.subtotal) > 0) {
    amounts.internalTaxed = String(inv.subtotal);
  }
  return {
    ...EMPTY_FORM,
    supplierName: inv.supplierName || '',
    supplierNrc: inv.supplierNrc || '',
    supplierTaxId: inv.supplierTaxId || '',
    supplierDui: inv.supplierDui || '',
    invoiceNumber: inv.invoiceNumber || '',
    series: inv.series || '',
    issuedAt: inv.issuedAt ? toDateInput(inv.issuedAt) : '',
    documentClass: inv.documentClass || '1',
    documentType: inv.documentType || BOOK_DEFAULTS.documentType,
    operationType: inv.operationType || BOOK_DEFAULTS.operationType,
    classification: inv.classification || BOOK_DEFAULTS.classification,
    sector: inv.sector || BOOK_DEFAULTS.sector,
    costType: inv.costType || BOOK_DEFAULTS.costType,
    ...amounts,
    tax: toInputAmount(inv.tax),
    ivaWithheld: toInputAmount(inv.ivaWithheld),
    category: inv.category || 'insumos',
    notes: inv.notes || '',
  };
};

// Mismos campos que la ficha del empleado (ver FormModal); sin el mt-1 de
// FORM_INPUT porque aquí el rótulo ya trae su margen.
const inputClass = FORM_INPUT.replace('mt-1 ', '');

const labelClass =
  'block text-[11px] font-semibold text-muted tracking-wide uppercase mb-1';

const Field = ({ id, label, required, hint, children, className = '' }) => (
  <div className={className}>
    <label className={labelClass} htmlFor={id}>
      {label} {required && <span className="text-ac font-bold">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[10.5px] text-muted leading-tight">{hint}</p>}
  </div>
);

const SelectField = ({ id, label, value, options, onChange, showCode = true }) => (
  <Field id={id} label={label}>
    <select id={id} value={value} onChange={(e) => onChange(id, e.target.value)} className={inputClass}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {showCode ? `${o.value} · ${o.label}` : o.label}
        </option>
      ))}
    </select>
  </Field>
);

const MoneyInput = ({ id, value, onChange, placeholder = '0.00' }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs num">$</span>
    <input
      id={id}
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => onChange(id, e.target.value)}
      placeholder={placeholder}
      className={`${inputClass} pl-7 num`}
    />
  </div>
);

const PurchaseInvoiceModal = ({ isOpen, onClose, onSubmit, invoice = null }) => {
  const isEdit = Boolean(invoice);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  // Si el usuario ya escribió el IVA a mano, no se le vuelve a sugerir.
  const [taxTouched, setTaxTouched] = useState(false);
  const [showMoreColumns, setShowMoreColumns] = useState(false);

  // Cada vez que se abre, el formulario arranca limpio (o con la factura a
  // editar): si no, quedarían los datos de la anterior y es fácil registrar
  // una compra equivocada.
  useEffect(() => {
    if (!isOpen) return;
    const initial = invoice ? invoiceToForm(invoice) : EMPTY_FORM;
    setForm(initial);
    setFile(null);
    setFormError(null);
    setTaxTouched(isEdit);
    // Si la factura usa columnas distintas de la principal, se muestran.
    setShowMoreColumns(BOOK_AMOUNT_COLUMNS.some((c) => !c.main && initial[c.key]));
  }, [isOpen, invoice, isEdit]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    if (field === 'tax') setTaxTouched(true);
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Al escribir una compra gravada se propone el IVA correspondiente,
      // salvo que el usuario ya lo haya puesto a mano.
      if (TAXED_KEYS.includes(field) && !taxTouched) {
        const taxedBase = TAXED_KEYS.reduce((acc, k) => acc + (Number(next[k]) || 0), 0);
        next.tax = taxedBase > 0 ? (taxedBase * IVA_RATE).toFixed(2) : '';
      }

      return next;
    });
  };

  const baseNum = BOOK_AMOUNT_KEYS.reduce((acc, k) => acc + (Number(form[k]) || 0), 0);
  const taxNum = Number(form.tax) || 0;
  const withheldNum = Number(form.ivaWithheld) || 0;
  const totalPreview = baseNum + taxNum + withheldNum;
  const isDte = form.documentClass === '4';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.supplierName.trim() || !form.invoiceNumber.trim() || !form.issuedAt) {
      setFormError('El proveedor, el número de documento y la fecha son obligatorios.');
      return;
    }
    if (baseNum <= 0) {
      setFormError('La compra debe tener al menos un monto mayor que cero.');
      return;
    }

    setSaving(true);
    const result = await onSubmit(form, file);
    setSaving(false);

    if (result?.success) {
      onClose();
    } else {
      setFormError(result?.message || 'No se pudo guardar la factura.');
    }
  };

  const mainColumn = BOOK_AMOUNT_COLUMNS.find((c) => c.main);
  const otherColumns = BOOK_AMOUNT_COLUMNS.filter((c) => !c.main);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl border border-line w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <ModalHeader
          icon="receipt"
          title={isEdit ? 'Editar factura de compra' : 'Registrar factura de compra'}
          badge="Libro de compras"
          subtitle="Documentos que el negocio recibe de sus proveedores"
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ModalBody>
          {/* Sección 1: Proveedor */}
          <FormSection icon="building" title="Proveedor">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field id="supplierName" label="Nombre o razón social" required className="sm:col-span-2">
                <input
                  id="supplierName"
                  type="text"
                  value={form.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  placeholder="Distribuidora La Ceiba, S.A. de C.V."
                  className={inputClass}
                />
              </Field>

              <Field id="supplierNrc" label="NRC" hint="Necesario para el crédito fiscal.">
                <input
                  id="supplierNrc"
                  type="text"
                  value={form.supplierNrc}
                  onChange={(e) => handleChange('supplierNrc', e.target.value)}
                  placeholder="3480418"
                  className={`${inputClass} num`}
                />
              </Field>

              <Field id="supplierTaxId" label="NIT">
                <input
                  id="supplierTaxId"
                  type="text"
                  value={form.supplierTaxId}
                  onChange={(e) => handleChange('supplierTaxId', e.target.value)}
                  placeholder="0614-010203-101-2"
                  className={`${inputClass} num`}
                />
              </Field>

              <Field id="supplierDui" label="DUI" hint="Solo si es persona natural sin NRC (sujeto excluido).">
                <input
                  id="supplierDui"
                  type="text"
                  value={form.supplierDui}
                  onChange={(e) => handleChange('supplierDui', e.target.value)}
                  placeholder="01234567-8"
                  className={`${inputClass} num`}
                />
              </Field>
            </div>
          </FormSection>

          {/* Sección 2: Documento */}
          <FormSection icon="file-text" title="Documento">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <SelectField id="documentClass" label="Clase de documento" value={form.documentClass} options={DOCUMENT_CLASS_OPTIONS} onChange={handleChange} />
              <SelectField id="documentType" label="Tipo de documento" value={form.documentType} options={DOCUMENT_TYPE_OPTIONS} onChange={handleChange} />

              <Field
                id="invoiceNumber"
                label={isDte ? 'Código de generación' : 'N.º de documento'}
                required
                className={isDte ? 'sm:col-span-2' : ''}
              >
                <input
                  id="invoiceNumber"
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  placeholder={isDte ? 'BAB33F0A-F5AB-4DCA-87D3-4397A09B1A0D' : '00123'}
                  className={`${inputClass} num`}
                />
              </Field>

              {!isDte && (
                <Field id="series" label="Serie">
                  <input
                    id="series"
                    type="text"
                    value={form.series}
                    onChange={(e) => handleChange('series', e.target.value)}
                    placeholder="21SD000F"
                    className={`${inputClass} num`}
                  />
                </Field>
              )}

              <Field id="issuedAt" label="Fecha de emisión" required>
                <input
                  id="issuedAt"
                  type="date"
                  value={form.issuedAt}
                  onChange={(e) => handleChange('issuedAt', e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="category" label="Categoría del gasto">
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className={inputClass}
                >
                  {PURCHASE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          {/* Sección 3: Montos por columna del libro */}
          <FormSection icon="calculator" title="Montos">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field id={mainColumn.key} label={mainColumn.label} hint="Sin IVA. Es la columna que se usa casi siempre.">
                <MoneyInput id={mainColumn.key} value={form[mainColumn.key]} onChange={handleChange} placeholder="221.24" />
              </Field>

              <Field id="tax" label="Crédito fiscal (IVA)" hint="Sugerido al 13% de lo gravado; editable según el documento.">
                <MoneyInput id="tax" value={form.tax} onChange={handleChange} placeholder="28.76" />
              </Field>

              <Field id="ivaWithheld" label="IVA retenido / percibido">
                <MoneyInput id="ivaWithheld" value={form.ivaWithheld} onChange={handleChange} />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreColumns((v) => !v)}
              className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ac transition-colors cursor-pointer"
            >
              <FAIcon icon={showMoreColumns ? 'chevron-up' : 'chevron-down'} size="xs" />
              {showMoreColumns ? 'Ocultar las demás columnas' : 'Exentas, internaciones, importaciones y sujetos excluidos'}
            </button>

            {showMoreColumns && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
                {otherColumns.map((c) => (
                  <Field key={c.key} id={c.key} label={c.label}>
                    <MoneyInput id={c.key} value={form[c.key]} onChange={handleChange} />
                  </Field>
                ))}
              </div>
            )}
          </FormSection>

          {/* Sección 4: Clasificación para renta */}
          <FormSection icon="tag" title="Clasificación para renta">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <SelectField id="operationType" label="Tipo de operación" value={form.operationType} options={OPERATION_TYPE_OPTIONS} onChange={handleChange} />
              <SelectField id="classification" label="Clasificación" value={form.classification} options={CLASSIFICATION_OPTIONS} onChange={handleChange} />
              <SelectField id="sector" label="Sector" value={form.sector} options={SECTOR_OPTIONS} onChange={handleChange} />
              <SelectField id="costType" label="Tipo de costo / gasto" value={form.costType} options={COST_TYPE_OPTIONS} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Sección 5: Comprobante y observaciones */}
          <FormSection icon="paperclip" title="Comprobante y observaciones" badge={<OptionalBadge />}>
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="file"
                  className="px-3 py-1.5 bg-surface border border-line hover:border-ac hover:text-ac text-xs font-semibold text-ink cursor-pointer transition-colors shrink-0 shadow-xs"
                >
                  <FAIcon icon="paperclip" size="xs" className="mr-1.5" />
                  {isEdit && invoice?.fileUrl ? 'Reemplazar archivo' : 'Seleccionar archivo'}
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <span className="text-xs text-muted truncate">
                  {file ? file.name : (invoice?.fileName || 'Ningún archivo')}
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

              <textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Observaciones sobre esta compra..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </FormSection>

          {/* Tarjeta de cálculo y total en vivo */}
          <div className="p-4 bg-white dark:bg-surface rounded-xl border border-line shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-ac text-white flex items-center justify-center shadow-2xs">
                <FAIcon icon="file-invoice-dollar" size="xs" />
              </div>
              <div>
                <p className="kick text-ink">Total del documento</p>
                <p className="text-[11px] text-muted">
                  Compras: <span className="num text-ink">{money(baseNum)}</span> + IVA:{' '}
                  <span className="num text-ink">{money(taxNum)}</span>
                  {withheldNum > 0 && (
                    <> + retenido: <span className="num text-ink">{money(withheldNum)}</span></>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="num text-2xl sm:text-3xl text-ink font-light">{money(totalPreview)}</span>
            </div>
          </div>

          {formError && (
            <div className="px-4 py-3 bg-acsoft/30 border border-ac rounded-xl text-xs text-ac flex items-center gap-2">
              <FAIcon icon="triangle-exclamation" size="sm" />
              <span>{formError}</span>
            </div>
          )}

          </ModalBody>

          <ModalFooter note={<>Los campos con <span className="text-ac">*</span> son obligatorios · IVA <span className="num">13%</span></>}>
            <button type="button" onClick={onClose} disabled={saving} className={MODAL_BTN_SECONDARY}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={MODAL_BTN_PRIMARY}>
              {saving && <FAIcon icon="spinner" className="animate-spin" size="xs" />}
              <span>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar factura'}</span>
            </button>
          </ModalFooter>
        </form>
      </div>
    </div>
  );
};

export default PurchaseInvoiceModal;
