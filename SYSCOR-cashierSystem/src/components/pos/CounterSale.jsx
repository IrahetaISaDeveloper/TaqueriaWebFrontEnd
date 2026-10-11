// components/pos/CounterSale.jsx
//
// Venta de mostrador: alguien llega a pedir a la caja. Se arma el pedido
// desde el menú, se cobra en el momento y entra a cocina como cualquier
// otro (con su número de cocina). Cuando cocina lo marca listo aparece en
// "Por entregar".
import { useMemo, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { FORM_INPUT, FORM_LABEL } from '@syscor/web-shared/src/components/FormModal';
import { MENU_SECTIONS } from '../../hooks/useCashierMenu';
import ProductOptionsModal from './ProductOptionsModal';
import { money } from '../../utils/format';
import { lineDetail, nextLineUid, simpleLine, cartTotal, cartCount, buildCounterCharge } from '../../utils/counterCharge';

// Nombre visible de una categoría. Las bebidas guardan "casa"/"tercero";
// platillos y combos ya guardan el nombre ("Tacos", "familiar"...).
const CATEGORY_LABELS = { casa: 'De la casa', tercero: 'De terceros', individual: 'Individual', duo: 'Dúo', familiar: 'Familiar' };
const categoryLabel = (value) => CATEGORY_LABELS[value] || value;

// Valores distintos de un campo, en orden alfabético
const distinct = (list, field) =>
  [...new Set(list.map((p) => p[field]).filter(Boolean))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), 'es'));

const normalize = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ¿El producto pide elegir algo antes de agregarse?
const hasOptions = (product) =>
  (product.selective && (product.selectiveOptions || []).length > 0) ||
  (product.drinks || []).length > 0 ||
  (product.extras || []).length > 0;

const chipClass = (active) =>
    `px-3 py-1 rounded-full border text-[12.5px] transition-colors cursor-pointer ${
      active ? 'border-ac bg-ac text-white' : 'border-line bg-surface text-inkalt hover:border-ac hover:text-ac'
    }`;

// El menú llega de PosScreen (Chef Panchita también lo usa para agregar
// productos por voz).
export default function CounterSale({ cart, setCart, onCharge, menuState }) {
  const { menu, extrasById, loading, error, refetch } = menuState;
  const [section, setSection] = useState('saucers');
  const [search, setSearch] = useState('');
  // Filtros dentro de la sección: categoría y, si la tiene, subcategoría
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [optionsFor, setOptionsFor] = useState(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const sectionItems = useMemo(() => menu[section] || [], [menu, section]);
  const categories = useMemo(() => distinct(sectionItems, 'category'), [sectionItems]);
  const subcategories = useMemo(
    () => (category ? distinct(sectionItems.filter((p) => p.category === category), 'subcategory') : []),
    [sectionItems, category]
  );

  const products = useMemo(() => {
    const term = normalize(search.trim());
    // La búsqueda recorre todo el menú, sin importar sección ni filtros
    if (term) return MENU_SECTIONS.flatMap((s) => menu[s.id]).filter((p) => normalize(p.name).includes(term));
    return sectionItems.filter(
      (p) => (!category || p.category === category) && (!subcategory || p.subcategory === subcategory)
    );
  }, [menu, sectionItems, search, category, subcategory]);

  const total = cartTotal(cart);
  const itemCount = cartCount(cart);

  const addLine = (line) => {
    setCart((prev) => ({ ...prev, lines: [...prev.lines, { uid: nextLineUid(), ...line }] }));
    setOptionsFor(null);
  };

  const handlePick = (product) => {
    if (hasOptions(product)) {
      setOptionsFor(product);
      return;
    }
    // Sin opciones: si ya está en la canasta tal cual, se suma uno
    setCart((prev) => {
      const same = prev.lines.find((l) => l.product.id === product.id && !l.comment && l.selectedExtras.length === 0);
      if (same) {
        return { ...prev, lines: prev.lines.map((l) => (l.uid === same.uid ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l)) };
      }
      return { ...prev, lines: [...prev.lines, simpleLine(product)] };
    });
  };

  const changeQty = (uid, delta) =>
    setCart((prev) => ({
      ...prev,
      lines: prev.lines
        .map((l) => (l.uid === uid ? { ...l, quantity: Math.min(50, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    }));

  const startCharge = () => {
    setMobileCartOpen(false);
    onCharge(buildCounterCharge(cart));
  };

  const cartPanel = (
        <div className="rounded-lg overflow-hidden border border-linealt bg-surface border-t-2 border-t-ac lg:sticky lg:top-0 flex flex-col max-h-[88dvh] lg:max-h-[calc(100dvh-14rem)]">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <p className="kick text-inkalt">VENTA · <span className="num">{itemCount}</span> {itemCount === 1 ? 'PRODUCTO' : 'PRODUCTOS'}</p>
            {cart.lines.length > 0 && (
              <button type="button" onClick={() => setCart((prev) => ({ ...prev, lines: [] }))} className="text-[12px] text-muted hover:text-ac cursor-pointer">
                Vaciar
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4">
            {cart.lines.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">
                Toca un producto del menú para agregarlo.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {cart.lines.map((line) => (
                  <li key={line.uid} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] text-ink leading-snug">{line.product.name}</p>
                        {lineDetail(line) && <p className="text-[11.5px] text-muted mt-0.5">{lineDetail(line)}</p>}
                      </div>
                      <span className="num text-[13.5px] text-ink shrink-0">{money(line.unitPrice * line.quantity)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center border border-line rounded-md">
                        <button type="button" onClick={() => changeQty(line.uid, -1)} className="w-7 h-7 text-inkalt hover:text-ac cursor-pointer" aria-label="Quitar uno">
                          <FAIcon icon={line.quantity === 1 ? 'trash' : 'minus'} size="xs" />
                        </button>
                        <span className="w-8 text-center num text-[13px]">{line.quantity}</span>
                        <button type="button" onClick={() => changeQty(line.uid, 1)} className="w-7 h-7 text-inkalt hover:text-ac cursor-pointer" aria-label="Agregar uno">
                          <FAIcon icon="plus" size="xs" />
                        </button>
                      </div>
                      <span className="text-[11.5px] text-muted num">@ {money(line.unitPrice)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-3 border-t border-line space-y-3">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-surfalt border border-line rounded-lg">
              {[
                { value: 'pickup', label: 'Para llevar', icon: 'shopping-bag' },
                { value: 'dine_in', label: 'Comer aquí', icon: 'armchair' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCart((prev) => ({ ...prev, fulfillment: option.value }))}
                  className={`px-2 py-1.5 rounded-md text-[12.5px] font-display font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    cart.fulfillment === option.value ? 'bg-ac text-white' : 'text-inkalt hover:text-ac'
                  }`}
                >
                  <FAIcon icon={option.icon} size="sm" />
                  {option.label}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="counter-name" className={FORM_LABEL}>Nombre para llamar al cliente</label>
              <input
                id="counter-name"
                className={FORM_INPUT}
                value={cart.customerName}
                onChange={(e) => setCart((prev) => ({ ...prev, customerName: e.target.value }))}
                maxLength={60}
                placeholder="Ej. Pedro"
              />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="kick text-inkalt">TOTAL</span>
              <span className="num text-3xl font-semibold text-ink">{money(total)}</span>
            </div>
            <button
              type="button"
              onClick={startCharge}
              disabled={cart.lines.length === 0}
              className="w-full py-3 rounded-lg bg-ac hover:bg-ac/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-semibold inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <FAIcon icon="cash-register" />
              Cobrar {money(total)}
            </button>
          </div>
        </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 lg:pb-0">
      {/* --- Menú --- */}
      <div className="lg:col-span-8 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex flex-nowrap gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
            {MENU_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSection(s.id); setSearch(''); setCategory(null); setSubcategory(null); }}
                className={`kick inline-flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  section === s.id && !search ? 'bg-acsoft text-ac' : 'text-inkalt hover:text-ac'
                }`}
              >
                <FAIcon icon={s.icon} size="sm" />
                {s.label}
                <span className="num opacity-75">{menu[s.id].length}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <FAIcon icon="magnifying-glass" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en todo el menú"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-surface text-[13px] text-ink placeholder:text-muted focus:outline-none focus:border-ac"
            />
          </div>
        </div>

        {/* Filtros por categoría (y subcategoría) de la sección */}
        {!search && categories.length > 1 && (
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => { setCategory(null); setSubcategory(null); }} className={chipClass(!category)}>
                Todas <span className="num opacity-75">{sectionItems.length}</span>
              </button>
              {categories.map((value) => (
                <button key={value} type="button" onClick={() => { setCategory(value); setSubcategory(null); }} className={chipClass(category === value)}>
                  {categoryLabel(value)}{' '}
                  <span className="num opacity-75">{sectionItems.filter((p) => p.category === value).length}</span>
                </button>
              ))}
            </div>
            {subcategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pl-3 border-l-2 border-acline">
                <button type="button" onClick={() => setSubcategory(null)} className={chipClass(!subcategory)}>
                  Todo {categoryLabel(category).toLowerCase()}
                </button>
                {subcategories.map((value) => (
                  <button key={value} type="button" onClick={() => setSubcategory(value)} className={chipClass(subcategory === value)}>
                    {value}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted py-10 text-center">Cargando el menú...</p>
        ) : error ? (
          <div className="rounded-lg border border-warn bg-warnsoft text-warn px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={refetch} className="underline cursor-pointer">Reintentar</button>
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-inkalt border border-dashed border-linealt rounded-lg px-4 py-6 text-center">
            {search ? 'Ningún producto coincide con la búsqueda.' : 'No hay productos disponibles en esta sección.'}
          </p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))' }}>
            {products.map((product) => (
              <button
                key={`${product.productType}-${product.id}`}
                type="button"
                onClick={() => handlePick(product)}
                className="group text-left rounded-lg overflow-hidden border border-line bg-surface hover:border-ac transition-colors cursor-pointer flex flex-col active:scale-[0.98]"
              >
                <div className="aspect-[4/3] bg-surfalt overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <FAIcon icon="utensils" size="lg" />
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex-1 flex flex-col">
                  <p className="text-[13px] text-ink font-medium leading-snug line-clamp-2">{product.name}</p>
                  {(product.subcategory || product.category) && (
                    <p className="text-[11px] text-muted mt-0.5 truncate">{product.subcategory || categoryLabel(product.category)}</p>
                  )}
                  <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
                    <span className="num text-[14px] font-semibold text-ac">{money(product.price)}</span>
                    {hasOptions(product) && <span className="kick text-muted">OPCIONES</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- Canasta: columna fija en pantallas anchas --- */}
      <div className="hidden lg:block lg:col-span-4">
        {cartPanel}
      </div>

      {/* --- Canasta en el teléfono: barra fija abajo que la abre --- */}
      <div className="lg:hidden">
        {cart.lines.length > 0 && !mobileCartOpen && (
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="fixed left-4 right-4 bottom-4 z-30 px-4 py-3.5 rounded-lg bg-ac text-white font-display font-semibold flex items-center justify-between gap-3 shadow-lg cursor-pointer active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2.5">
              <FAIcon icon="shopping-bag" />
              Ver venta · <span className="num">{itemCount}</span>
            </span>
            <span className="num">{money(total)}</span>
          </button>
        )}
        {mobileCartOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={() => setMobileCartOpen(false)}>
            <div className="w-full max-h-[88dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="self-center mb-2 px-4 py-1.5 rounded-full bg-surface text-[13px] text-inkalt inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FAIcon icon="chevron-down" size="sm" />
                Seguir agregando
              </button>
              {cartPanel}
            </div>
          </div>
        )}
      </div>

      {optionsFor && (
        <ProductOptionsModal product={optionsFor} extrasById={extrasById} onClose={() => setOptionsFor(null)} onAdd={addLine} />
      )}
    </div>
  );
}
