// Cómo dice Panchita las cosas en voz alta (montos, listas, pedidos).

// 6 → "6 dólares", 4.5 → "4 dólares con 50", 1.25 → "1 dólar con 25"
export const spokenMoney = (amount) => {
  const cents = Math.round(Number(amount || 0) * 100);
  const dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  const dollarWord = dollars === 1 ? 'dólar' : 'dólares';
  if (dollars === 0 && rest > 0) return `${rest} centavos`;
  return rest ? `${dollars} ${dollarWord} con ${rest}` : `${dollars} ${dollarWord}`;
};

// ["a", "b", "c"] → "a, b y c"
export const joinList = (items) => {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`;
};

export const plural = (count, singular, pluralForm) => `${count} ${count === 1 ? singular : pluralForm}`;

// "PL10-01" se lee mejor separado: "P L 10 01"
export const spokenCode = (code) => String(code || '').replace(/^([A-Z]{2})/, (m) => m.split('').join(' ') + ' ').replace('-', ' ');

// Cómo se nombra un pedido para recoger: por su número de cocina si lo tiene
export const spokenPickup = (pickup) =>
  `${pickup.kitchenNumber != null ? `la orden ${pickup.kitchenNumber}` : `el pedido ${spokenCode(pickup.code)}`} de ${pickup.customerName}`;

export const spokenItems = (items, max = 6) => {
  const parts = items.slice(0, max).map((item) => `${item.quantity} ${item.name}`);
  const more = items.length > max ? ` y ${plural(items.length - max, 'cosa más', 'cosas más')}` : '';
  return `${joinList(parts)}${more}`;
};
