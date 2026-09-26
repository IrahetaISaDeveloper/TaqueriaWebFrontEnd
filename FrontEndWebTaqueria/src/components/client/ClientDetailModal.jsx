// src/components/client/ClientDetailModal.jsx
// Ficha institucional del comensal: información general, direcciones,
// teléfonos registrados, historial de pedidos y control de estado.
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
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
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'C';

  const handleToggleStatus = async () => {
    if (!onToggleStatus) return;
    setTogglingStatus(true);
    await onToggleStatus(client, isActive ? 'inactive' : 'active');
    setTogglingStatus(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      {/* Contenedor del Modal con borde superior rojo institucional de acento */}
      <div className="bg-surface rounded-none border border-line border-t-4 border-t-ac max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cabecera con acento institucional y avatar estilizado */}
        <div className="bg-surface border-b border-line px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {client.personalInfo?.image ? (
              <img
                src={client.personalInfo.image}
                alt={fullName}
                className="w-12 h-12 object-cover border border-acline/60 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 bg-acsoft text-ac border border-acline/60 flex items-center justify-center font-display font-bold text-base shrink-0 shadow-xs">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="kick text-[10px] font-bold text-ac tracking-wider mb-0.5">
                FICHA DE CLIENTE
              </p>
              <h3 className="text-lg sm:text-xl font-display font-bold text-ink leading-tight truncate">
                {fullName}
              </h3>
              <p className="text-xs text-muted font-mono truncate">{email || 'Sin correo electrónico'}</p>
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

        {/* Barra de estado y contacto rápido */}
        <div className="px-5 sm:px-6 py-2.5 bg-surfalt/40 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border ${
                isVerified
                  ? 'bg-oksoft/20 text-ok border-ok/40'
                  : 'bg-warnsoft/20 text-warn border-warn/40'
              }`}
            >
              <FAIcon icon={isVerified ? 'circle-check' : 'circle-exclamation'} size="xs" />
              {isVerified ? 'Cuenta verificada' : 'Sin verificar'}
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border border-line bg-surface text-ink">
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-ok' : 'bg-muted'}`} />
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* Botones de contacto con color sutil */}
          {(email || primaryPhone) && (
            <div className="flex items-center gap-1.5">
              {primaryPhone && (
                <a
                  href={`tel:${toPhoneDigits(primaryPhone)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-acline/60 bg-acsoft/20 text-ac hover:bg-ac hover:text-white transition-colors cursor-pointer"
                >
                  <FAIcon icon="phone" size="xs" />
                  <span>Llamar</span>
                </a>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-ok/40 bg-oksoft/20 text-ok hover:bg-ok hover:text-white transition-colors cursor-pointer"
                >
                  <FAIcon icon="paper-plane" size="xs" />
                  <span>WhatsApp</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-line bg-surface text-ink hover:border-ac hover:text-ac transition-colors cursor-pointer"
                >
                  <FAIcon icon="envelope" size="xs" />
                  <span>Correo</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Contenido scrolleable del modal */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-5">
          {/* 1. Datos generales con borde rojo sutil a la izquierda */}
          <div className="bg-surface border border-line border-l-2 border-l-ac p-4 sm:p-5 shadow-xs">
            <h4 className="kick text-[11px] font-bold text-ac tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
              DATOS GENERALES Y CONTACTO
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="flex items-start gap-2.5">
                <span className="w-5 text-center text-ac mt-0.5 shrink-0">
                  <FAIcon icon="envelope" size="sm" />
                </span>
                <div className="min-w-0">
                  <p className="kick text-[10px] text-muted tracking-wider mb-0.5">CORREO ELECTRÓNICO</p>
                  <p className="text-sm font-medium text-ink break-all">{email || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 text-center text-ok mt-0.5 shrink-0">
                  <FAIcon icon="phone" size="sm" />
                </span>
                <div className="min-w-0">
                  <p className="kick text-[10px] text-muted tracking-wider mb-0.5">
                    TELÉFONO {phones[0]?.type ? `(${PHONE_TYPE_LABELS[phones[0].type]?.toUpperCase()})` : 'PRINCIPAL'}
                  </p>
                  <p className="text-sm font-mono font-medium text-ink">{primaryPhone || 'Sin teléfono'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 text-center text-warn mt-0.5 shrink-0">
                  <FAIcon icon="calendar" size="sm" />
                </span>
                <div className="min-w-0">
                  <p className="kick text-[10px] text-muted tracking-wider mb-0.5">FECHA DE REGISTRO</p>
                  <p className="text-sm text-ink font-medium">
                    {client.createdAt
                      ? new Date(client.createdAt).toLocaleDateString('es-SV', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 text-center text-muted mt-0.5 shrink-0">
                  <FAIcon icon="id-card" size="sm" />
                </span>
                <div className="min-w-0">
                  <p className="kick text-[10px] text-muted tracking-wider mb-0.5">ID DE CLIENTE</p>
                  <p className="text-xs font-mono text-muted">{clientId || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Direcciones guardadas con borde rojo sutil a la izquierda */}
          {addresses.length > 0 && (
            <div className="bg-surface border border-line border-l-2 border-l-ac p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="kick text-[11px] font-bold text-ac tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
                  DIRECCIONES GUARDADAS
                </h4>
                <span className="text-[11px] font-mono text-muted">
                  {addresses.length} registrada{addresses.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-2">
                {addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surfalt/30 border border-line flex items-start gap-3 hover:border-acline/40 transition-colors"
                  >
                    <span className="w-5 text-center text-ac mt-0.5 shrink-0">
                      <FAIcon icon="location-dot" size="sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-acsoft text-ac border border-acline/40 mb-1">
                        {addr.tag || 'Dirección'}
                      </span>
                      <p className="text-xs text-ink font-medium leading-relaxed break-words">
                        {addr.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Otros teléfonos con borde rojo sutil a la izquierda */}
          {phones.length > 1 && (
            <div className="bg-surface border border-line border-l-2 border-l-ac p-4 sm:p-5 shadow-xs">
              <h4 className="kick text-[11px] font-bold text-ac tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
                TELÉFONOS ADICIONALES
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {phones.slice(1).map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-surfalt/30 border border-line flex items-center justify-between gap-2 hover:border-acline/40 transition-colors"
                  >
                    <div>
                      <p className="kick text-[9.5px] text-muted font-bold">
                        {PHONE_TYPE_LABELS[p.type] || `TELÉFONO ${idx + 2}`}
                      </p>
                      <p className="text-xs font-mono font-medium text-ink">{p.number}</p>
                    </div>
                    <a
                      href={`tel:${toPhoneDigits(p.number)}`}
                      className="w-7 h-7 flex items-center justify-center border border-acline/50 bg-surface text-ac hover:bg-ac hover:text-white transition-colors cursor-pointer"
                      title="Llamar a este número"
                    >
                      <FAIcon icon="phone" size="xs" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Historial de pedidos con borde rojo sutil a la izquierda */}
          {fetchClientOrders && (
            <div className="bg-surface border border-line border-l-2 border-l-ac p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="kick text-[11px] font-bold text-ac tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
                  HISTORIAL DE PEDIDOS EN LÍNEA
                </h4>
                {orderSummary && orderSummary.totalOrders > 0 && (
                  <span className="text-[11px] font-mono text-ac font-semibold">
                    {orderSummary.deliveredOrders} entregados · {money(orderSummary.totalSpent)}
                  </span>
                )}
              </div>

              {loadingOrders ? (
                <div className="p-6 bg-surfalt/20 border border-line text-center text-xs text-muted">
                  Cargando pedidos del comensal...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-6 bg-surfalt/20 border border-line text-center text-xs text-muted">
                  Este comensal aún no registra pedidos en línea en el sistema.
                </div>
              ) : (
                <div className="border border-line divide-y divide-line/60 max-h-56 overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="p-3 bg-surface hover:bg-acsoft/10 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="num font-bold text-sm text-ac">{money(order.total)}</span>
                          <span className="text-xs text-muted font-sans font-normal">
                            · {order.items?.length || 0} producto{(order.items?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString('es-SV', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                          {order.isDelivery ? ' · A domicilio' : ' · Para recoger'}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 text-[10.5px] font-display font-medium border shrink-0 ${
                          ORDER_STATUS_STYLES[order.status] || 'bg-surfalt text-inkalt border-line'
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Acciones de cuenta con borde rojo sutil a la izquierda */}
          {canManageStatus && onToggleStatus && (
            <div className="bg-surface border border-line border-l-2 border-l-ac p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="text-xs font-bold text-ink mb-1">
                  {isActive ? 'Desactivar cuenta del cliente' : 'Reactivar cuenta del cliente'}
                </h5>
                <p className="text-xs text-muted leading-relaxed max-w-sm">
                  {isActive
                    ? 'Inhabilita el inicio de sesión y pedidos en línea. El historial de compras y comprobantes se mantiene intacto.'
                    : 'Restaura el acceso normal a la plataforma con sus credenciales y direcciones existentes.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-display font-semibold transition-colors disabled:opacity-50 cursor-pointer border shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-acsoft/20 border-acline text-ac hover:bg-ac hover:text-white'
                    : 'bg-oksoft/20 border-ok text-ok hover:bg-ok hover:text-white'
                }`}
              >
                <FAIcon icon={isActive ? 'user-slash' : 'user-check'} size="xs" />
                <span>
                  {togglingStatus
                    ? 'Guardando...'
                    : isActive
                    ? 'Dar de baja'
                    : 'Reactivar'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="px-5 sm:px-6 py-3 border-t border-line bg-surface flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-display font-semibold text-inkalt hover:text-ac hover:border-acline border border-line bg-surfalt hover:bg-acsoft/20 transition-colors cursor-pointer"
          >
            Cerrar ficha
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailModal;
