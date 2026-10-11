// Documentos imprimibles de la caja: el comprobante del cliente y el corte
// de caja (X parcial o Z de cierre), en formato de impresora térmica de 80 mm.
// Vive en el paquete compartido porque lo imprimen la caja
// (SYSCOR-cashierSystem) y el panel (Ajustes → Sistema de caja → cortes).
//
// Se arman como un documento HTML completo (con su propio CSS) en vez de
// imprimir la pantalla: así la vista previa (un <iframe srcDoc>) y lo que sale
// por la impresora son exactamente lo mismo, y el estilo de la aplicación no
// se cuela en el papel.
import QRCode from 'qrcode';
// Formatos que necesitan los documentos (los mismos de la caja)
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const formatDateTime = (date) =>
  new Date(date).toLocaleString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const amount = (n) => Number(n || 0).toFixed(2);

const PAPER_CSS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: 80mm; padding: 4mm 4mm 6mm; font-family: "IBM Plex Mono", "Courier New", monospace; font-size: 11px; line-height: 1.35; }
  .c { text-align: center; }
  .r { text-align: right; }
  .b { font-weight: 700; }
  .big { font-size: 15px; }
  .xl { font-size: 18px; }
  .muted { color: #444; }
  .small { font-size: 9.5px; }
  .tiny { font-size: 8.5px; word-break: break-all; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .hr2 { border-top: 2px solid #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row > span:last-child { text-align: right; white-space: nowrap; }
  .test { border: 1px solid #000; padding: 3px; margin: 6px 0; font-size: 9.5px; text-align: center; font-weight: 700; letter-spacing: .5px; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  td.q { width: 9mm; }
  td.t { width: 17mm; text-align: right; white-space: nowrap; }
  .qr { display: block; margin: 6px auto 2px; width: 30mm; height: 30mm; }
  .sign { margin-top: 18mm; border-top: 1px solid #000; padding-top: 2px; text-align: center; font-size: 9.5px; }
`;

const page = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>${PAPER_CSS}</style></head><body>${body}</body></html>`;

const issuerHeader = (issuer) => `
  <div class="c b big">${esc(issuer?.name || 'Taquería El Corral')}</div>
  <div class="c small">${esc(issuer?.legalName || '')}</div>
  <div class="c small">NIT ${esc(issuer?.nit)} · NRC ${esc(issuer?.nrc)}</div>
  <div class="c small">Giro: ${esc(issuer?.activity)}</div>
  <div class="c small">${esc(issuer?.address)}</div>
  ${issuer?.phone ? `<div class="c small">Tel. ${esc(issuer.phone)}</div>` : ''}
`;

const row = (label, value, cls = '') => `<div class="row ${cls}"><span>${label}</span><span>${value}</span></div>`;

// En el Crédito Fiscal los precios van sin IVA. Se reparten los centavos del
// redondeo en la última línea para que la suma cuadre con la base exacta.
const ccfLines = (items, base) => {
  const lines = items.map((item) => ({ ...item, net: round2(item.total / 1.13) }));
  const diff = round2(base - lines.reduce((sum, line) => sum + line.net, 0));
  if (lines.length > 0 && diff !== 0) lines[lines.length - 1].net = round2(lines[lines.length - 1].net + diff);
  return lines.map((line) => ({ ...line, unitNet: round2(line.net / (line.quantity || 1)) }));
};

const sourceLabel = (source) => {
  if (source?.kind === 'table') return `Mesa ${source.tableNumber}`;
  if (source?.kind === 'pickup') return 'Pedido para recoger';
  return 'Venta de mostrador';
};

/** HTML del comprobante del cliente (Factura o Crédito Fiscal). */
export const buildReceiptHtml = async (receipt, issuer, { copy = false } = {}) => {
  const isCcf = receipt.documentType === 'ccf';
  // Si el QR no se pudo generar, el comprobante sale igual (sin él)
  const qr = await QRCode.toDataURL(receipt.queryUrl, { margin: 0, width: 220 }).catch(() => '');

  const lines = isCcf ? ccfLines(receipt.items, receipt.base) : receipt.items;
  const itemsHtml = lines
    .map((item) => `
      <tr>
        <td class="q">${item.quantity}</td>
        <td>${esc(item.name)}<div class="small muted">@ ${amount(isCcf ? item.unitNet : item.unitPrice)}</div></td>
        <td class="t">${amount(isCcf ? item.net : item.total)}</td>
      </tr>`)
    .join('');

  const customer = receipt.customer || {};
  const receiverHtml = isCcf
    ? `
      <div class="hr"></div>
      <div class="b small">RECEPTOR</div>
      ${row('Nombre', esc(customer.name), 'small')}
      ${row('NIT', esc(customer.nit), 'small')}
      ${row('NRC', esc(customer.nrc), 'small')}
      ${row('Giro', esc(customer.activity), 'small')}
      <div class="small">Dirección: ${esc(customer.address)}</div>`
    : customer.name
      ? `<div class="small">Cliente: ${esc(customer.name)}</div>`
      : '';

  const totalsHtml = isCcf
    ? `
      ${row('Ventas gravadas', amount(receipt.base))}
      ${row('IVA 13%', amount(receipt.iva))}
      ${row('Total', amount(receipt.total), 'b')}`
    : `
      ${row('Sumas', amount(receipt.total))}
      ${row('<span class="muted small">IVA incluido (13%)</span>', `<span class="muted small">${amount(receipt.iva)}</span>`)}
      ${row('Total', amount(receipt.total), 'b')}`;

  const payment = receipt.payment || {};
  const paymentHtml = payment.method === 'cash'
    ? `${row('Efectivo recibido', amount(payment.received))}${row('Vuelto', amount(payment.change), 'b')}`
    : `${row(`Tarjeta ${esc(payment.cardBrand)}`, `**** ${esc(payment.cardLast4)}`)}${row('Autorización', esc(payment.authorizationCode))}<div class="small muted">Transacción aprobada (POS simulado)</div>`;

  const body = `
    ${issuerHeader(issuer)}
    <div class="hr2"></div>
    <div class="c b">${esc(receipt.documentLabel).toUpperCase()}</div>
    <div class="c small">Documento Tributario Electrónico · Tipo ${esc(receipt.dteType)}</div>
    <div class="test">DOCUMENTO DE PRUEBA · SIN VALIDEZ FISCAL</div>
    ${copy ? '<div class="c b small">*** COPIA ***</div>' : ''}
    <div class="small">Número de control:</div>
    <div class="tiny b">${esc(receipt.controlNumber)}</div>
    <div class="small">Código de generación:</div>
    <div class="tiny">${esc(receipt.generationCode)}</div>
    <div class="small">Sello de recepción:</div>
    <div class="tiny">${esc(receipt.receptionSeal)}</div>
    <div class="hr"></div>
    ${row('Fecha', formatDateTime(receipt.issuedAt), 'small')}
    ${row('Cajero', esc(receipt.cashier || '—'), 'small')}
    ${row('Origen', esc(sourceLabel(receipt.source)), 'small')}
    ${receipt.source?.orderCodes?.length ? row('Pedido(s)', esc(receipt.source.orderCodes.join(', ')), 'small') : ''}
    ${receiverHtml}
    <div class="hr"></div>
    <table>
      <tr class="b small"><td class="q">Cant</td><td>Descripción</td><td class="t">${isCcf ? 'Sin IVA' : 'Total'}</td></tr>
      ${itemsHtml}
    </table>
    <div class="hr"></div>
    ${totalsHtml}
    ${receipt.creditApplied > 0 ? row('Saldo a favor aplicado', `-${amount(receipt.creditApplied)}`) : ''}
    ${receipt.tip > 0 ? row('Propina (voluntaria)', amount(receipt.tip)) : ''}
    <div class="hr2"></div>
    ${row('TOTAL A PAGAR', `$${amount(receipt.amountDue)}`, 'b xl')}
    <div class="hr"></div>
    ${paymentHtml}
    <div class="hr"></div>
    ${qr ? `<img class="qr" src="${qr}" alt="QR de consulta" />` : ''}
    <div class="c small">Consulta este documento en el portal de Hacienda (ambiente de pruebas)</div>
    <div class="c b" style="margin-top:6px">¡Gracias por su visita!</div>
  `;

  return page(`${receipt.documentLabel} ${receipt.controlNumber}`, body);
};

/** HTML del corte de caja. kind: "X" (parcial, turno abierto) o "Z" (cierre). */
export const buildShiftReportHtml = (session, issuer, kind = 'Z') => {
  const s = session.summary || {};
  const cash = s.byMethod?.cash || { count: 0, amount: 0 };
  const card = s.byMethod?.card || { count: 0, amount: 0 };
  const diff = session.difference;
  const diffLabel = diff === null || diff === undefined ? 'Sin arqueo' : diff === 0 ? 'Cuadrada' : diff > 0 ? 'SOBRANTE' : 'FALTANTE';

  const movements = (session.movements || [])
    .map((m) => row(`${m.type === 'in' ? '+' : '−'} ${esc(m.reason)}`, amount(m.amount), 'small'))
    .join('');

  const body = `
    ${issuerHeader(issuer)}
    <div class="hr2"></div>
    <div class="c b big">CORTE ${kind}</div>
    <div class="c small">${kind === 'Z' ? 'Cierre de turno' : 'Parcial · el turno sigue abierto'}</div>
    <div class="hr"></div>
    ${row('Turno', esc(session.code), 'small')}
    ${row('Cajero', esc(session.cashier?.name), 'small')}
    ${row('Abrió', esc(session.openedBy || '—'), 'small')}
    ${row('Apertura', formatDateTime(session.openedAt), 'small')}
    ${kind === 'Z' && session.closedAt ? row('Cierre', formatDateTime(session.closedAt), 'small') : row('Emitido', formatDateTime(new Date()), 'small')}
    ${kind === 'Z' && session.closedBy?.name ? row('Cerró', esc(session.closedBy.name), 'small') : ''}
    <div class="hr"></div>
    <div class="b">VENTAS</div>
    ${row('Comprobantes', s.receipts ?? 0)}
    ${row('Ventas (IVA incluido)', amount(s.sales))}
    ${row('&nbsp; Base gravada', amount(s.base), 'small')}
    ${row('&nbsp; IVA 13%', amount(s.iva), 'small')}
    ${row('Propinas', amount(s.tips))}
    ${s.creditApplied > 0 ? row('Saldo a favor aplicado', amount(s.creditApplied)) : ''}
    <div class="hr"></div>
    <div class="b small">POR DOCUMENTO</div>
    ${row(`Facturas (${s.byDocument?.fcf?.count ?? 0})`, amount(s.byDocument?.fcf?.total), 'small')}
    ${row(`Créditos Fiscales (${s.byDocument?.ccf?.count ?? 0})`, amount(s.byDocument?.ccf?.total), 'small')}
    <div class="b small" style="margin-top:4px">POR ORIGEN</div>
    ${row(`Mesas (${s.bySource?.table?.count ?? 0})`, amount(s.bySource?.table?.total), 'small')}
    ${row(`Para recoger (${s.bySource?.pickup?.count ?? 0})`, amount(s.bySource?.pickup?.total), 'small')}
    ${row(`Mostrador (${s.bySource?.counter?.count ?? 0})`, amount(s.bySource?.counter?.total), 'small')}
    <div class="b small" style="margin-top:4px">FORMAS DE PAGO (cobrado)</div>
    ${row(`Efectivo (${cash.count})`, amount(cash.amount), 'small')}
    ${row(`Tarjeta (${card.count})`, amount(card.amount), 'small')}
    ${row('Total cobrado', amount(s.collected), 'small b')}
    <div class="hr"></div>
    <div class="b">EFECTIVO EN GAVETA</div>
    ${row('Fondo inicial', amount(s.openingFloat))}
    ${row('+ Cobros en efectivo', amount(cash.amount))}
    ${row('+ Entradas', amount(s.movementsIn))}
    ${row('− Salidas', amount(s.movementsOut))}
    ${row('= Esperado', amount(s.expectedCash), 'b')}
    ${kind === 'Z' ? `
      ${row('Contado', session.countedCash === null || session.countedCash === undefined ? '—' : amount(session.countedCash))}
      <div class="hr2"></div>
      ${row(`DIFERENCIA · ${diffLabel}`, diff === null || diff === undefined ? '—' : `${diff > 0 ? '+' : ''}${amount(diff)}`, 'b big')}
    ` : ''}
    ${movements ? `<div class="hr"></div><div class="b small">MOVIMIENTOS</div>${movements}` : ''}
    ${session.closingNotes ? `<div class="hr"></div><div class="small">Notas: ${esc(session.closingNotes)}</div>` : ''}
    ${kind === 'Z' ? '<div class="sign">Firma del cajero</div><div class="sign" style="margin-top:14mm">Firma del supervisor</div>' : ''}
    <div class="test">DOCUMENTO INTERNO · CAJA SIMULADA</div>
  `;

  return page(`Corte ${kind} ${session.code}`, body);
};

/**
 * Manda un documento HTML a la impresora sin abrir otra ventana: se carga en
 * un iframe oculto, se espera a que carguen sus imágenes (el QR) y se imprime.
 */
export const printHtml = (html) =>
  new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);

    const cleanup = () => {
      setTimeout(() => frame.remove(), 1000);
      resolve();
    };

    frame.onload = () => {
      const win = frame.contentWindow;
      const images = [...win.document.images];
      Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => { img.onload = done; img.onerror = done; }))))
        .then(() => {
          win.focus();
          win.print();
          cleanup();
        });
    };
    frame.srcdoc = html;
  });
