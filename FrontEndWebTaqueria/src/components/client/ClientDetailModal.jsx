// src/components/client/ClientDetailModal.jsx
// Ficha del cliente: sus datos, su historial de pedidos y las acciones de
// contacto rápido (llamar, escribir, WhatsApp).
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Etiquetas de estado de pedido, mismas que usa el Dashboard.
const ORDER_STATUS_LABELS = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  atrasado: 'Atrasado',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const ORDER_STATUS_STYLES = {
  delivered: 'bg-oksoft text-ok border-ok',
  cancelled: 'bg-acsoft text-ac border-acline',
  atrasado: 'bg-warnsoft text-warn border-warn',
};

// Deja solo los dígitos del teléfono para armar los enlaces de llamada y
// WhatsApp. Los números salvadoreños se guardan como "7000-1234", y sin
// limpiarlos el enlace no funciona.
const toPhoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

// WhatsApp necesita el código de país. Si el número viene con 8 dígitos
// (formato local de El Salvador), se le antepone el 503.
const toWhatsAppNumber = (phone) => {
  const digits = toPhoneDigits(phone);
  if (!digits) return null;
  return digits.length === 8 ? `503${digits}` : digits;
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    <FAIcon icon={icon} size="sm" className="text-muted mt-0.5 w-4" />
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

const ClientDetailModal = ({
  isOpen,
  onClose,
  client,
  // Opcionales: si no se pasan, el modal sigue funcionando como vista de
  // solo lectura (así no rompe a quien lo use sin acciones).
  onToggleStatus,
  canManageStatus = false,
  fetchClientOrders,
}) => {
  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const clientId = client?._id;

  // El historial se pide al abrir la ficha, no con la lista de clientes:
  // son hasta 50 pedidos por persona y solo se miran de uno en uno.
  useEffect(() => {
    if (!isOpen || !clientId || !fetchClientOrders) return;

    let cancelled = false;
    setLoadingOrders(true);
    setOrders([]);
    setOrderSummary(null);

    fetchClientOrders(clientId).then((result) => {
      // Si el usuario cerró la ficha o abrió otra mientras cargaba, se
      // descarta la respuesta para no pintar los pedidos de otra persona.
      if (cancelled) return;
      if (result?.success) {
        setOrders(result.orders);
        setOrderSummary(result.summary);
      }
      setLoadingOrders(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, clientId, fetchClientOrders]);

  if (!isOpen || !client) return null;

  const fullName = `${client.personalInfo?.name || ''} ${client.personalInfo?.lastname || ''}`.trim() || 'Cliente';
  const addresses = client.personalInfo?.addresses || [];
  const phones = client.personalInfo?.phones || [];
  const isVerified = !!client.loginInfo?.isVerified;
  const isActive = (client.status || 'active') === 'active';

  const email = client.loginInfo?.email;
  const primaryPhone = phones[0];
  const whatsappNumber = toWhatsAppNumber(primaryPhone);

  const handleToggleStatus = async () => {
    if (!onToggleStatus) return;
    setTogglingStatus(true);
    await onToggleStatus(client, isActive ? 'inactive' : 'active');
    setTogglingStatus(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none border border-line max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {client.personalInfo?.image ? (
              <img src={client.personalInfo.image} alt={fullName} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/80 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface/20 flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
                {fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-white font-display font-bold text-lg truncate">{fullName}</h3>
              <p className="text-white/80 text-xs truncate">{client.loginInfo?.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10 shrink-0">
            <FAIcon icon="times" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-2.5 py-1 rounded-full text-xs font-display font-semibold ${isVerified ? 'bg-oksoft text-ok border border-ok' : 'bg-warnsoft text-warn border border-warn'}`}>
              {isVerified ? 'Cuenta verificada' : 'Sin verificar'}
            </span>
            {/* Una cuenta desactivada no puede iniciar sesión, así que
                conviene que se vea de inmediato al abrir la ficha. */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-display font-semibold border ${isActive ? 'bg-infosoft text-info border-info' : 'bg-acsoft text-ac border-acline'}`}>
              {isActive ? 'Cuenta activa' : 'Cuenta desactivada'}
            </span>
          </div>

          {/* Contacto rápido: los enlaces nativos del teléfono/correo evitan
              tener que copiar el número a mano para llamar o escribir. */}
          {(email || primaryPhone) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {primaryPhone && (
                <a
                  href={`tel:${toPhoneDigits(primaryPhone)}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-none bg-surface text-inkalt text-xs font-display font-semibold border border-line hover:bg-surfalt transition-colors"
                >
                  <FAIcon icon="phone" size="xs" /> Llamar
                </a>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-none bg-oksoft text-ok text-xs font-display font-semibold border border-ok hover:bg-oksoft transition-colors"
                >
                  <FAIcon icon="paper-plane" size="xs" /> WhatsApp
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-none bg-surface text-inkalt text-xs font-display font-semibold border border-line hover:bg-surfalt transition-colors"
                >
                  <FAIcon icon="envelope" size="xs" /> Correo
                </a>
              )}
            </div>
          )}

          <Section title="Contacto">
            <InfoRow icon="envelope" label="Correo electrónico" value={client.loginInfo?.email} />
            <InfoRow icon="phone" label="Teléfono" value={phones[0]} />
            <InfoRow icon="calendar" label="Registrado el" value={client.createdAt ? new Date(client.createdAt).toLocaleDateString('es-SV', { dateStyle: 'long' }) : null} />
          </Section>

          {addresses.length > 0 && (
            <Section title="Direcciones">
              {addresses.map((addr, idx) => (
                <InfoRow key={idx} icon="location-dot" label={addr.tag || 'Dirección'} value={addr.details} />
              ))}
            </Section>
          )}

          {phones.length > 1 && (
            <Section title="Otros teléfonos">
              {phones.slice(1).map((p, idx) => (
                <InfoRow key={idx} icon="phone" label={`Teléfono ${idx + 2}`} value={p} />
              ))}
            </Section>
          )}

          {/* Historial de pedidos. Solo los pedidos en línea llevan cliente
              con cuenta: los de local los anota el mesero sin asociarlos. */}
          {fetchClientOrders && (
            <div className="bg-surface rounded-none border border-line p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-display font-bold uppercase tracking-wide text-muted">
                  Historial de pedidos
                </h4>
                {orderSummary && orderSummary.totalOrders > 0 && (
                  <span className="text-xs text-muted">
                    {orderSummary.deliveredOrders} entregados · {money(orderSummary.totalSpent)}
                  </span>
                )}
              </div>

              {loadingOrders ? (
                <p className="text-sm text-muted py-3 text-center">Cargando historial...</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted py-3 text-center">
                  Este cliente todavía no ha hecho pedidos en línea.
                </p>
              ) : (
                <ul className="divide-y divide-line max-h-56 overflow-y-auto">
                  {orders.map((order) => (
                    <li key={order._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {money(order.total)}
                          <span className="text-xs text-muted font-normal ml-2">
                            {order.items?.length || 0} producto{(order.items?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString('es-SV', { dateStyle: 'medium' })
                            : '—'}
                          {order.isDelivery ? ' · A domicilio' : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-semibold border shrink-0 ${ORDER_STATUS_STYLES[order.status] || 'bg-surfalt text-inkalt border-line'}`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Dar de baja/alta. Solo aparece para quien tenga el permiso
              "clients_manage_status": ver la ficha no basta para cerrarle
              el acceso a alguien. */}
          {canManageStatus && onToggleStatus && (
            <div className="bg-surface rounded-none border border-line p-4">
              <h4 className="text-xs font-display font-bold uppercase tracking-wide text-muted mb-1">
                Estado de la cuenta
              </h4>
              <p className="text-xs text-muted mb-3">
                {isActive
                  ? 'Al desactivarla, el cliente no podrá iniciar sesión. Su historial de pedidos se conserva.'
                  : 'Al reactivarla, el cliente podrá volver a iniciar sesión con sus mismas credenciales.'}
              </p>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-none text-sm font-display font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                  isActive
                    ? 'bg-ac text-white hover:bg-ac'
                    : 'bg-ok text-white hover:bg-ok'
                }`}
              >
                <FAIcon icon={isActive ? 'ban' : 'check-circle'} size="sm" />
                {togglingStatus
                  ? 'Guardando...'
                  : isActive ? 'Desactivar cliente' : 'Reactivar cliente'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailModal;
