// src/components/client/ClientDetailModal.jsx
// Ficha institucional del comensal: información general, direcciones,
// teléfonos registrados, historial de pedidos y control de estado.
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import FormModal, { FormSection, ModalAvatar, ReadField, CountBadge, FORM_LABEL } from '../commons/FormModal';
import { getClientPhones, PHONE_TYPE_LABELS } from '../../utils/customerPhones';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const ORDER_STATUS_LABELS = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  atrasado: 'Atrasado',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const ORDER_STATUS_STYLES = {
  delivered: 'bg-oksoft/20 text-ok border-ok/40',
  cancelled: 'bg-acsoft/20 text-ac border-acline',
  atrasado: 'bg-warnsoft/20 text-warn border-warn/40',
  preparing: 'bg-infosoft/20 text-info border-info/40',
  ready: 'bg-oksoft/20 text-ok border-ok/40',
  pending: 'bg-warnsoft/20 text-warn border-warn/40',
};

const toPhoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

const toWhatsAppNumber = (phone) => {
  const digits = toPhoneDigits(phone);
  if (!digits) return null;
  return digits.length === 8 ? `503${digits}` : digits;
};

const ClientDetailModal = ({
  isOpen,
  onClose,
  client,
  onToggleStatus,
  canManageStatus = false,
  fetchClientOrders,
}) => {
  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const clientId = client?._id;

  useEffect(() => {
    if (!isOpen || !clientId || !fetchClientOrders) return;

    let cancelled = false;
    setLoadingOrders(true);
    setOrders([]);
    setOrderSummary(null);

    fetchClientOrders(clientId).then((result) => {
      if (cancelled) return;
      if (result?.success) {
        setOrders(result.orders || []);
        setOrderSummary(result.summary);
      }
      setLoadingOrders(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, clientId, fetchClientOrders]);

  if (!isOpen || !client) return null;

  const firstName = client.personalInfo?.name || '';
  const lastName = client.personalInfo?.lastname || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Cliente';
  const addresses = client.personalInfo?.addresses || [];
  const phones = getClientPhones(client);
  const isVerified = !!client.loginInfo?.isVerified;
  const isActive = (client.status || 'active') === 'active';

  const email = client.loginInfo?.email;
  const primaryPhone = phones[0]?.number;
  const whatsappNumber = toWhatsAppNumber(primaryPhone);

  const handleToggleStatus = async () => {
    if (!onToggleStatus) return;
    setTogglingStatus(true);
    await onToggleStatus(client, isActive ? 'inactive' : 'active');
    setTogglingStatus(false);
  };

  const contactButton =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer';

  const registeredAt = client.createdAt
    ? new Date(client.createdAt).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const primaryPhoneLabel = phones[0]?.type && PHONE_TYPE_LABELS[phones[0].type]
    ? `Teléfono (${PHONE_TYPE_LABELS[phones[0].type]})`
    : 'Teléfono principal';

  return (
    <FormModal
      avatar={<ModalAvatar image={client.personalInfo?.image} name={fullName} />}
      title={fullName}
      badge={isActive ? 'Activo' : 'Inactivo'}
      badgeTone={isActive ? 'ok' : 'muted'}
      subtitle={email || 'Sin correo electrónico'}
      onClose={onClose}
      cancelLabel="Cerrar"
      footerNote={canManageStatus ? 'Ficha del cliente' : 'Modo solo lectura'}
    >
      {/* Aviso si la cuenta no está verificada */}
      {!isVerified && (
        <div className="bg-white dark:bg-surface border border-amber-300 dark:border-amber-500/40 rounded-xl p-3.5 shadow-2xs flex items-start gap-3">
          <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
            <FAIcon icon="triangle-exclamation" size="xs" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-display font-bold text-ink">Cuenta sin verificar</p>
            <p className="text-[11.5px] text-muted mt-0.5">
              El cliente todavía no confirma su correo electrónico.
            </p>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: Datos generales */}
      <FormSection
        icon="user"
        title="Datos generales"
        badge={isVerified && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10">
            <FAIcon icon="circle-check" size="xs" />
            Verificada
          </span>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
          <ReadField label="Nombre" value={firstName} />
          <ReadField label="Apellido" value={lastName} />
          <ReadField label={primaryPhoneLabel} value={primaryPhone} />
          <ReadField label="Correo electrónico" value={email} />
          <ReadField label="Fecha de registro" value={registeredAt} />
          <ReadField label="ID de cliente" value={clientId} mono />
        </div>

        {(email || primaryPhone) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-line">
            <span className={`${FORM_LABEL} mr-1`}>Contactar</span>
            {primaryPhone && (
              <a href={`tel:${toPhoneDigits(primaryPhone)}`} className={`${contactButton} border-ac/30 bg-ac/5 text-ac hover:bg-ac hover:text-white`}>
                <FAIcon icon="phone" size="xs" />
                Llamar
              </a>
            )}
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${contactButton} border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white`}
              >
                <FAIcon icon="paper-plane" size="xs" />
                WhatsApp
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className={`${contactButton} border-line bg-white dark:bg-surface text-inkalt hover:border-ac hover:text-ac`}>
                <FAIcon icon="envelope" size="xs" />
                Correo
              </a>
            )}
          </div>
        )}
      </FormSection>

      {/* SECCIÓN 2: Direcciones */}
      {addresses.length > 0 && (
        <FormSection
          icon="location-dot"
          title="Direcciones guardadas"
          badge={<CountBadge>{addresses.length} registrada{addresses.length === 1 ? '' : 's'}</CountBadge>}
        >
          <div className="space-y-2">
            {addresses.map((addr, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-line bg-surfalt/30 flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-ac/10 text-ac border border-ac/20 flex items-center justify-center shrink-0">
                  <FAIcon icon="location-dot" size="xs" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-ac/10 text-ac border border-ac/30 mb-1">
                    {addr.tag || 'Dirección'}
                  </span>
                  <p className="text-xs text-ink leading-relaxed break-words">{addr.details}</p>
                </div>
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* SECCIÓN 3: Teléfonos adicionales */}
      {phones.length > 1 && (
        <FormSection icon="phone" title="Teléfonos adicionales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {phones.slice(1).map((p, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-line bg-surfalt/30 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={FORM_LABEL}>{PHONE_TYPE_LABELS[p.type] || `Teléfono ${idx + 2}`}</p>
                  <p className="text-sm font-medium text-ink">{p.number}</p>
                </div>
                <a
                  href={`tel:${toPhoneDigits(p.number)}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-ac/30 bg-ac/5 text-ac hover:bg-ac hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Llamar a este número"
                >
                  <FAIcon icon="phone" size="xs" />
                </a>
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* SECCIÓN 4: Historial de pedidos */}
      {fetchClientOrders && (
        <FormSection
          icon="receipt"
          title="Historial de pedidos"
          badge={orderSummary && orderSummary.totalOrders > 0 && (
            <CountBadge>{orderSummary.deliveredOrders} entregados · {money(orderSummary.totalSpent)}</CountBadge>
          )}
        >
          {loadingOrders ? (
            <p className="py-6 rounded-lg border border-dashed border-line text-center text-xs text-muted">
              Cargando pedidos del cliente...
            </p>
          ) : orders.length === 0 ? (
            <p className="py-6 rounded-lg border border-dashed border-line text-center text-xs text-muted">
              Este cliente aún no registra pedidos en línea.
            </p>
          ) : (
            <div className="rounded-lg border border-line divide-y divide-line max-h-56 overflow-y-auto">
              {orders.map((order) => (
                <div key={order._id} className="p-3 bg-white dark:bg-surface hover:bg-ac/5 flex items-center justify-between gap-3 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-ac tabular-nums">{money(order.total)}</span>
                      <span className="text-xs text-muted">
                        · {order.items?.length || 0} producto{(order.items?.length || 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                      {order.isDelivery ? ' · A domicilio' : ' · Para recoger'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border shrink-0 ${
                      ORDER_STATUS_STYLES[order.status] || 'bg-surfalt text-inkalt border-line'
                    }`}
                  >
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      )}

      {/* SECCIÓN 5: Acciones de cuenta */}
      {canManageStatus && onToggleStatus && (
        <FormSection icon="shield" title="Acciones de cuenta">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted leading-relaxed max-w-sm">
              {isActive
                ? 'Dar de baja inhabilita el inicio de sesión y los pedidos en línea. El historial de compras se mantiene.'
                : 'Reactivar restaura el acceso normal con sus credenciales y direcciones existentes.'}
            </p>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className={`px-3 py-2 text-xs font-display font-semibold border inline-flex items-center gap-2 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0 disabled:opacity-50 ${
                isActive
                  ? 'bg-ac/10 border-ac/30 text-ac hover:bg-ac hover:text-white hover:border-ac'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <FAIcon icon={isActive ? 'user-slash' : 'user-check'} size="xs" />
              <span>{togglingStatus ? 'Guardando...' : isActive ? 'Dar de baja' : 'Reactivar cliente'}</span>
            </button>
          </div>
        </FormSection>
      )}
    </FormModal>
  );
};

export default ClientDetailModal;
