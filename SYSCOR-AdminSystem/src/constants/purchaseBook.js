// Catálogos y columnas del Libro de Compras (Anexo de Compras del F-07).
//
// Espejo de backEnd/src/utils/orders/purchaseBookCatalogs.js: si se cambia
// un código allá, hay que cambiarlo aquí también.

const toOptions = (catalog) => Object.entries(catalog).map(([value, label]) => ({ value, label }));

export const DOCUMENT_CLASSES = {
  1: 'IMPRESO POR IMPRENTA O TIQUETES',
  2: 'FORMULARIO UNICO',
  3: 'OTROS',
  4: 'DOCUMENTO TRIBUTARIO ELECTRONICO (DTE)',
};

export const DOCUMENT_TYPES = {
  '03': 'COMPROBANTE DE CRÉDITO FISCAL',
  '05': 'NOTA DE CRÉDITO',
  '06': 'NOTA DE DÉBITO',
  12: 'DECLARACIÓN DE MERCANCÍAS',
  13: 'MANDAMIENTO DE INGRESO',
};

export const OPERATION_TYPES = {
  1: 'Gravada',
  2: 'No gravada o exenta',
  3: 'Excluido o no constituye renta',
  4: 'Mixta',
};

export const CLASSIFICATIONS = { 1: 'Costo', 2: 'Gasto' };

export const SECTORS = {
  1: 'Industria',
  2: 'Comercio',
  3: 'Agropecuaria',
  4: 'Servicios, profesiones, artes y oficios',
};

export const COST_TYPES = {
  1: 'Gastos de venta sin donación',
  2: 'Gastos de administración sin donación',
  3: 'Gastos financieros sin donación',
  4: 'Costo artículos producidos/comprados importaciones/internaciones',
  5: 'Costo artículos producidos/comprados interno',
  6: 'Costos indirectos de fabricación',
  7: 'Mano de obra',
};

export const DOCUMENT_CLASS_OPTIONS = toOptions(DOCUMENT_CLASSES);
export const DOCUMENT_TYPE_OPTIONS = toOptions(DOCUMENT_TYPES).sort((a, b) => a.value.localeCompare(b.value));
export const OPERATION_TYPE_OPTIONS = toOptions(OPERATION_TYPES);
export const CLASSIFICATION_OPTIONS = toOptions(CLASSIFICATIONS);
export const SECTOR_OPTIONS = toOptions(SECTORS);
export const COST_TYPE_OPTIONS = toOptions(COST_TYPES);

// Valores por defecto de una compra nueva: DTE + Crédito Fiscal, y la
// clasificación de renta que el negocio ya usa en su libro (1-2-2-2).
export const BOOK_DEFAULTS = {
  documentClass: '4',
  documentType: '03',
  operationType: '1',
  classification: '2',
  sector: '2',
  costType: '2',
};

// Columnas de montos del libro, en su orden. "main" es la que se usa casi
// siempre y se muestra de entrada en el formulario; las demás van plegadas.
export const BOOK_AMOUNT_COLUMNS = [
  { key: 'internalTaxed', code: 'COMPRASGR', label: 'Compras internas gravadas', main: true },
  { key: 'internalExempt', code: 'COMPRASEX', label: 'Compras internas exentas' },
  { key: 'internationTaxed', code: 'INTERGRAV', label: 'Internaciones gravadas' },
  { key: 'internationExempt', code: 'INTEREXEN', label: 'Internaciones exentas' },
  { key: 'importGoods', code: 'IMPORBIEN', label: 'Importaciones gravadas de bienes' },
  { key: 'importServices', code: 'IMPORSERV', label: 'Importaciones gravadas de servicios' },
  { key: 'importExempt', code: 'IMPOREXEN', label: 'Importaciones exentas' },
  { key: 'excludedSubject', code: 'SUJEX', label: 'Compras a sujetos excluidos' },
];

export const BOOK_AMOUNT_KEYS = BOOK_AMOUNT_COLUMNS.map((c) => c.key);

// Datos fiscales del negocio para el encabezado del libro impreso. Se
// imprimen solo si tienen valor: llénalos con el NRC y el NIT de la taquería.
export const BUSINESS_FISCAL = {
  name: 'Taquería El Corral',
  nrc: 'NRCTaquería123',
  nit: 'NITTaquería123',
};
