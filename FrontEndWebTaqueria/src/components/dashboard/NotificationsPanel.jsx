// src/components/dashboard/NotificationsPanel.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import FAIcon from '../commons/FAIcon';
import { useAuth } from '../../hooks/auth/useAuth';
import {
  useNotifications,
  isNotificationRead,
  formatRelativeTime,
  SEVERITY_STYLES,
} from '../../hooks/useNotifications';

// Panel desplegable que se abre al hacer clic en la campana del TopBar.
// Muestra los últimos movimientos del sistema; el historial completo está en /notificaciones.
const NotificationsPanel = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } = useNotifications();

  if (!isOpen) return null;

  // Solo las primeras del listado: el resto se consulta en la página completa
  const visibleNotifications = notifications.slice(0, 8);

  const handleItemClick = (notification) => {
    if (!isNotificationRead(notification, user?.id)) {
      markRead(notification._id);
    }
  };

  return (
    <>
      {/* Capa que cierra el panel al hacer clic en cualquier otro lado. En
          móvil además oscurece el fondo para darle foco al panel centrado. */}
      <div className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent" onClick={onClose} aria-hidden="true" />

      <div
        className="fixed left-1/2 top-20 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm
          sm:absolute sm:left-auto sm:top-full sm:right-0 sm:translate-x-0 sm:mt-2
          z-50 bg-surface rounded-none border border-line overflow-hidden"
        role="dialog"
        aria-label="Notificaciones"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div>
            <h3 className="font-display font-bold text-ink text-sm">Notificaciones</h3>
            <p className="text-xs text-muted">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-display font-semibold text-ac hover:text-ac transition-colors"
            >
              Marcar todas
            </button>
          )}
        </div>

        {/* Listado */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Cargando notificaciones...</p>
          ) : error ? (
            <p className="px-4 py-8 text-center text-sm text-muted">{error}</p>
          ) : visibleNotifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <FAIcon icon="bell-slash" size="2xl" className="text-muted mb-2" />
              <p className="text-sm text-muted">No hay movimientos todavía</p>
            </div>
          ) : (
            visibleNotifications.map((notification) => {
              const isRead = isNotificationRead(notification, user?.id);

              return (
                <button
                  key={notification._id}
                  onClick={() => handleItemClick(notification)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-line transition-colors hover:bg-surfalt ${
                    isRead ? 'opacity-60' : 'bg-acsoft/40'
                  }`}
                >
                  <span
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                      SEVERITY_STYLES[notification.severity] || SEVERITY_STYLES.info
                    }`}
                  >
                    <FAIcon icon={notification.icon || 'bell'} size="sm" />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-semibold text-ink text-xs mb-0.5">
                      {notification.title}
                    </span>
                    <span className="block text-xs text-inkalt leading-snug break-words">
                      {notification.message}
                    </span>
                    <span className="block text-[11px] text-muted mt-1">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>

                  {!isRead && (
                    <span className="shrink-0 w-2 h-2 mt-1 rounded-full bg-ac" aria-label="Sin leer" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Pie con enlace al historial completo */}
        <Link
          to="/notificaciones"
          onClick={onClose}
          className="block px-4 py-3 text-center text-xs font-display font-semibold text-inkalt hover:bg-surfalt border-t border-line transition-colors"
        >
          Ver todas las notificaciones
        </Link>
      </div>
    </>
  );
};

export default NotificationsPanel;
