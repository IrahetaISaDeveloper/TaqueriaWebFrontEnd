// Venta de mostrador → datos del cobro. Lo usan el botón "Cobrar" de la
// canasta y Chef Panchita ("cobra la venta"), para que ambos manden
// exactamente lo mismo al servidor.
import { round2 } from './format';

// Lo que va debajo del nombre en la canasta y en el detalle del cobro
export const lineDetail = (line) =>
  [
    line.selectedSelectiveItems.length ? line.selectedSelectiveItems.join(', ') : null,
    line.drinkName ? `Bebida: ${line.drinkName}` : null,
    line.selectedExtras.length ? `+ ${line.selectedExtras.map((e) => e.name).join(', ')}` : null,
    line.comment ? `“${line.comment}”` : null,
  ].filter(Boolean).join(' · ');

export const cartTotal = (cart) => round2(cart.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));

export const cartCount = (cart) => cart.lines.reduce((sum, line) => sum + line.quantity, 0);

let uidSeed = 0;
export const nextLineUid = () => {
  uidSeed += 1;
  return `line-${uidSeed}`;
};

// Línea sencilla de la canasta (sin opciones)
export const simpleLine = (product, quantity = 1) => ({
  uid: nextLineUid(),
  product,
  quantity,
  selectedSelectiveItems: [],
  selectedDrinkId: null,
  drinkName: null,
  selectedExtras: [],
  comment: '',
  unitPrice: product.price,
});

// ¿El producto obliga a elegir algo antes de venderse? (platillos de un combo)
export const needsChoices = (product) => Boolean(product.selective && (product.selectiveOptions || []).length > 0);

export const buildCounterCharge = (cart) => ({
  kind: 'counter',
  title: 'Cobrar venta de mostrador',
  subtitle: `${cart.fulfillment === 'dine_in' ? 'Para comer aquí' : 'Para llevar'}${cart.customerName ? ` · ${cart.customerName}` : ''}`,
  items: cart.lines.map((line) => ({
    name: line.product.name,
    quantity: line.quantity,
    total: round2(line.unitPrice * line.quantity),
    notes: lineDetail(line),
  })),
  total: cartTotal(cart),
  creditApplied: 0,
  request: {
    source: 'counter',
    sale: {
      customerName: cart.customerName,
      fulfillment: cart.fulfillment,
      items: cart.lines.map((line) => ({
        productType: line.product.productType,
        productId: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        selectedSelectiveItems: line.selectedSelectiveItems,
        selectedDrinkId: line.selectedDrinkId || undefined,
        selectedExtras: line.selectedExtras.map((e) => ({ extraId: e.extraId, name: e.name })),
        comment: line.comment || undefined,
      })),
    },
  },
});

// Lo mismo para una mesa o un pedido para recoger (pantalla y voz)
export const buildTableCharge = (tab) => ({
  kind: 'table',
  title: `Cobrar Mesa ${tab.number}`,
  subtitle: [tab.customerName, tab.waiters.length ? `Atendió ${tab.waiters.join(', ')}` : null].filter(Boolean).join(' · '),
  items: tab.items,
  total: tab.total,
  creditApplied: 0,
  request: { source: 'table', tableId: tab.tableId },
});

export const buildPickupCharge = (pickup) => ({
  kind: 'pickup',
  title: `Cobrar pedido ${pickup.code}`,
  subtitle: `${pickup.customerName} · ${pickup.fulfillment === 'dine_in' ? 'reserva para comer en el local' : 'para recoger'}`,
  items: pickup.items,
  total: pickup.total,
  creditApplied: pickup.creditApplied,
  request: { source: 'pickup', orderId: pickup.orderId },
});
