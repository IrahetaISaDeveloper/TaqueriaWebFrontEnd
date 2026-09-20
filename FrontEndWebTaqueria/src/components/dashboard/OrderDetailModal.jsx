// src/components/dashboard/OrderDetailModal.jsx
import React from 'react';
import FAIcon from '../commons/FAIcon';

const STATUS_LABELS = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  atrasado: 'Atrasado',
  ready: 'Listo',
  delivered: 'Completado',
  cancelled: 'Cancelado',
};

const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  card_on_delivery: 'Tarjeta contraentrega',
  online: 'Pagado en línea',
};

const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
};

const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-start gap-3 py-2">
    {icon && <FAIcon icon={icon} size="sm" className="text-muted mt-0.5 w-4" />}
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted font-display font-semibold">{label}</p>
      <p className="text-sm text-ink font-medium break-words">{value || '—'}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-surface rounded-none border border-line p-4 mb-4">
    <h4 className="text-xs font-display font-bold uppercase tracking-wide text-muted mb-1">{title}</h4>
    <div className="divide-y divide-line">{children}</div>
  </div>
);

const OrderDetailModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const isOnline = order.orderType === 'online';
  const customerName = order.customer?.personalInfo
    ? `${order.customer.personalInfo.name || ''} ${order.customer.personalInfo.lastname || ''}`.trim()
    : '';
  const contactName = order.contact?.name || customerName;
  const contactLastname = order.contact?.lastname || '';
  const contactEmail = order.contact?.email || order.customer?.loginInfo?.email;
  const waiterName = order.waiter ? `${order.waiter.name || ''} ${order.waiter.lastname || ''}`.trim() : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none border border-line max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-white font-display font-bold text-lg">
              Pedido #{(order._id || '').toString().slice(-4).toUpperCase()}
            </h3>
            <p className="text-white/80 text-xs">{isOnline ? 'Pedido en línea' : 'Pedido en local'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10">
            <FAIcon icon="times" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <Section title="Estado del pedido">
            <div className="flex items-center gap-2 py-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-display font-semibold bg-acsoft text-ac border border-acline">
                {STATUS_LABELS[order.status] || order.status}
              </span>
              {order.createdAt && (
                <span className="text-xs text-muted">
                  {new Date(order.createdAt).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </Section>

          {isOnline ? (
            <>
              <Section title="Información de contacto">
                <InfoRow icon="user" label="Nombre" value={`${contactName} ${contactLastname}`.trim()} />
                <InfoRow icon="envelope" label="Correo electrónico" value={contactEmail} />
              </Section>

              <Section title="Tipo de entrega">
                <InfoRow
                  icon={order.isDelivery ? 'motorcycle' : 'store'}
                  label="Modalidad"
                  value={order.isDelivery ? 'Entrega a domicilio' : 'Para recoger en el local'}
                />
                {order.isDelivery && <InfoRow icon="location-dot" label="Dirección" value={order.deliveryAddress} />}
                {order.scheduledFor && (
                  <InfoRow
                    icon="calendar-clock"
                    label="Programado para"
                    value={new Date(order.scheduledFor).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' })}
                  />
                )}
              </Section>

              {order.receivedBy?.name && (
                <Section title="Información adicional">
                  <InfoRow icon="user-group" label="Recibe el pedido" value={`${order.receivedBy.name} ${order.receivedBy.lastname || ''}`.trim()} />
                </Section>
              )}
            </>
          ) : (
            <Section title="Detalle del pedido">
              <InfoRow icon="user" label="Cliente / Familia" value={order.localCustomerName} />
              <InfoRow icon="user-tie" label="Mesero" value={waiterName} />
              <InfoRow icon="chair" label="Mesa" value={order.table?.number ? `Mesa ${order.table.number}` : '—'} />
            </Section>
          )}

          <Section title="Productos">
            {(order.items || []).length === 0 ? (
              <p className="text-sm text-muted py-2">Sin productos registrados</p>
            ) : (
              order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-inkalt">{item.quantity}× {item.name}</span>
                  <span className="font-display font-semibold text-ink">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between pt-2 text-sm font-display font-bold text-ink">
              <span>Total</span>
              <span>${(Number(order.total) || 0).toFixed(2)}</span>
            </div>
          </Section>

          <Section title="Información de pago">
            <InfoRow icon="credit-card" label="Método de pago" value={PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod} />
            <InfoRow icon="circle-check" label="Estado del pago" value={PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus} />
          </Section>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
