// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import PageShell from '../components/commons/PageShell';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { PasswordInput, PasswordChecklist, PasswordMatch } from '../components/commons/PasswordFields';
import { passwordMeetsRules } from '../utils/passwordRules';
import ImageCropModal from '../components/commons/ImageCropModal';
import ConfirmModal from '@syscor/web-shared/src/components/ConfirmModal';
import { ToastProvider, useToast } from '@syscor/web-shared/src/components/ToastProvider';
import { useAuth } from '@syscor/web-shared/src/hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import useKitchenDevices from '../hooks/useKitchenDevices';
import PairKitchenModal from '../components/kitchen/PairKitchenModal';
import KitchenDevicesList from '../components/kitchen/KitchenDevicesList';
import CashierSettingsPanel from '../components/cashier/CashierSettingsPanel';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '@syscor/web-shared/src/context/themeContext';
import { hasPermission } from '../constants/permissions';

const TABS = [
  // "profile" y "appearance" son datos propios/preferencia local: cualquier
  // sesión iniciada los ve. "operation" y "notifications" son configuración
  // general del sistema, así que solo se muestran a quien tiene el permiso
  // "settings" (siempre true para admin, ver adminOnly más abajo).
  { id: 'profile', label: 'PERFIL Y CUENTA' },
  { id: 'appearance', label: 'APARIENCIA' },
  { id: 'operation', label: 'OPERACIÓN', adminOnly: true },
  { id: 'kitchen', label: 'SISTEMA DE COCINA', adminOnly: true },
  { id: 'cashier', label: 'SISTEMA DE CAJA', adminOnly: true },
  { id: 'notifications', label: 'NOTIFICACIONES', adminOnly: true },
];

// Dirección de la pantalla de cocina (proyecto SYSCOR-kitchenSystem). En
// desarrollo corre junto al panel en el puerto 5174; en producción se define
// VITE_KITCHEN_URL y, si falta, simplemente no se muestra el botón de abrirla.
const KITCHEN_URL = import.meta.env.VITE_KITCHEN_URL || (import.meta.env.DEV ? 'http://localhost:5174' : '');

// Mismos límites que valida el backend (settingsController.KITCHEN_MINUTES_RANGE)
const KITCHEN_MINUTES_MIN = 1;
const KITCHEN_MINUTES_MAX = 180;

const formatChangedAt = (date) =>
  date ? new Date(date).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' }) : '';

// Descripción de cada categoría, para que se entienda qué se apaga al desactivarla
const NOTIFICATION_CATEGORIES = [
  {
    id: 'orders',
    label: 'Órdenes',
    icon: 'receipt',
    description: 'Pedidos creados, cambios de estado y cancelaciones',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: 'box',
    description: 'Altas, ajustes de existencias y alertas de stock bajo',
  },
  {
    id: 'tables',
    label: 'Mesas',
    icon: 'chair',
    description: 'Mesas habilitadas y cambios de disponibilidad',
  },
  {
    id: 'menu',
    label: 'Menú',
    icon: 'utensils',
    description: 'Platillos, bebidas, combos y extras del menú',
  },
  {
    id: 'staff',
    label: 'Personal',
    icon: 'user-tie',
    description: 'Invitaciones, altas y cambios en el equipo',
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: 'users',
    description: 'Registro y actualización de clientes',
  },
];

// Secciones que tienen su propio umbral de "agotado" configurable.
const LOW_STOCK_SECTIONS = [
  { id: 'drinks', label: 'Bebidas' },
  { id: 'saucers', label: 'Platillos' },
  { id: 'extras', label: 'Extras' },
  { id: 'combos', label: 'Combos' },
];

// Interruptor institucional reutilizable
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-ac' : 'bg-line'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

const inputClass =
  'w-full px-4 py-2.5 bg-surface border border-line rounded-none focus:outline-none focus:border-ac text-sm text-ink placeholder:text-muted/70 transition-colors disabled:bg-surfalt/60 disabled:text-muted cursor-text';

const labelClass =
  'kick block text-ink mb-2';

const buttonClass =
  'inline-flex items-center gap-2 px-6 py-2.5 bg-ac hover:opacity-90 text-white font-bold text-sm rounded-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs';

function SettingsContent() {
  const { user } = useAuth();
  const { settings, loading, saving, saveSettings, setKitchenSettings } = useSettings();
  const { savingProfile, savingPassword, updateProfile, changePassword } = useProfile();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  // Solo el administrador puede modificar la configuración global del negocio
  const isAdmin = user?.role === 'admin';
  const canSeeSystemSettings = hasPermission(user, 'settings');
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || canSeeSystemSettings);

  // --- Perfil ---
  const [profileDraft, setProfileDraft] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [rawImageFile, setRawImageFile] = useState(null);

  const profileForm = profileDraft ?? {
    name: user?.name || '',
    lastname: user?.lastname || '',
  };

  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile({ ...profileForm, image: imageFile });
    if (result.success) {
      addToast('Perfil actualizado correctamente', 'success');
      setImageFile(null);
      setProfileDraft(null);
    } else {
      addToast(result.message, 'error');
    }
  };

  // --- Contraseña ---
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Solo se habilita el botón cuando el servidor la va a aceptar: contraseña
  // actual escrita, nueva que cumple todas las reglas y confirmación igual.
  const canChangePassword =
    !!passwordForm.currentPassword &&
    passwordMeetsRules(passwordForm.newPassword) &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordMeetsRules(passwordForm.newPassword)) {
      addToast('La nueva contraseña no cumple todos los requisitos', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('La confirmación no coincide con la nueva contraseña', 'error');
      return;
    }

    const result = await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });

    if (result.success) {
      addToast('Contraseña actualizada correctamente', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      addToast(result.message, 'error');
    }
  };

  // --- Operación ---
  const [operationDraft, setOperationDraft] = useState(null);
  const operationForm = operationDraft ?? settings.operation;

  const handleOperationSubmit = async (e) => {
    e.preventDefault();
    const result = await saveSettings({ operation: operationForm });
    if (result.success) {
      addToast('Ajustes de operación guardados', 'success');
      setOperationDraft(null);
    } else {
      addToast(result.message, 'error');
    }
  };

  // --- Notificaciones ---
  const handleNotificationToggle = async (category, value) => {
    const result = await saveSettings({ notifications: { [category]: value } });
    if (result.success) {
      addToast(
        `Notificaciones de ${category} ${value ? 'activadas' : 'desactivadas'}`,
        'success'
      );
    } else {
      addToast(result.message, 'error');
    }
  };

  // --- Sistema de cocina ---
  // La pantalla de cocina no tiene login: se habilita emparejándola. Encender
  // el interruptor pide el código que muestra la pantalla; el servidor le
  // entrega su token de dispositivo por socket y sale sola del lobby. Apagarlo
  // es el kill switch: todas las pantallas pierden su acceso al instante.
  const kitchenDevices = useKitchenDevices({ enabled: isAdmin });
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [confirmKitchenOff, setConfirmKitchenOff] = useState(false);
  const [deviceToUnpair, setDeviceToUnpair] = useState(null);
  const [kitchenDraft, setKitchenDraft] = useState(null);
  const kitchenTimesForm = kitchenDraft ?? {
    warningMinutes: settings.kitchen.warningMinutes,
    maxMinutes: settings.kitchen.maxMinutes,
  };

  const handlePairKitchen = async (code) => {
    const enabling = !settings.kitchen.enabled;
    const result = await kitchenDevices.pairDevice(code);
    if (result.success) {
      setKitchenSettings(result.kitchen);
      addToast(
        enabling
          ? 'Sistema de cocina habilitado: la pantalla ya está recibiendo comandas'
          : 'Pantalla emparejada: ya está recibiendo comandas',
        'success'
      );
    }
    return result;
  };

  const handleDisableKitchen = async () => {
    const result = await kitchenDevices.disableKitchen();
    setConfirmKitchenOff(false);
    if (result.success) {
      setKitchenSettings(result.kitchen);
      addToast('Sistema de cocina deshabilitado: las pantallas volvieron al lobby', 'success');
    } else {
      addToast(result.message, 'error');
    }
  };

  const handleUnpairDevice = async () => {
    const result = await kitchenDevices.unpairDevice(deviceToUnpair.deviceId);
    setDeviceToUnpair(null);
    if (result.success) addToast('Pantalla desvinculada: volvió al lobby', 'success');
    else addToast(result.message, 'error');
  };

  // Encender pide el código de la pantalla; apagar saca a la cocina de sus
  // comandas a media operación, así que se confirma.
  const handleKitchenToggle = (value) => {
    if (value) setPairModalOpen(true);
    else setConfirmKitchenOff(true);
  };

  const handleKitchenTimesSubmit = async (e) => {
    e.preventDefault();
    const warningMinutes = Number(kitchenTimesForm.warningMinutes);
    const maxMinutes = Number(kitchenTimesForm.maxMinutes);
    const inRange = (value) =>
      Number.isInteger(value) && value >= KITCHEN_MINUTES_MIN && value <= KITCHEN_MINUTES_MAX;

    if (!inRange(warningMinutes) || !inRange(maxMinutes)) {
      addToast(`Los tiempos deben ser minutos enteros entre ${KITCHEN_MINUTES_MIN} y ${KITCHEN_MINUTES_MAX}`, 'error');
      return;
    }
    if (warningMinutes >= maxMinutes) {
      addToast('La advertencia (amarillo) debe llegar antes que el tiempo máximo (rojo)', 'error');
      return;
    }

    const result = await saveSettings({ kitchen: { warningMinutes, maxMinutes } });
    if (result.success) {
      setKitchenDraft(null);
      addToast('Tiempos de alerta de cocina guardados', 'success');
    } else {
      addToast(result.message, 'error');
    }
  };

  const initials =
    `${user?.name?.[0] || ''}${user?.lastname?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <PageShell
      activeMenu="settings"
      title="Ajustes"
      subtitle="Configura tu cuenta y el funcionamiento del sistema"
      tabs={visibleTabs.map((tab) => ({
        key: tab.id,
        label: tab.label,
        active: activeTab === tab.id,
        onClick: () => setActiveTab(tab.id),
      }))}
      tabsLabel="Secciones de ajustes"
    >
      {/* --- Pestaña: Perfil y cuenta --- */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Tarjeta Mi perfil */}
          <div className="border border-line bg-surface p-6 sm:p-7 border-l-2 border-l-ac space-y-6">
            <div>
              <p className="kick text-ac mb-1.5">
                DATOS PERSONALES · SESIÓN ACTIVA
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-ink">Mi perfil</h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                Así te ve el resto del equipo dentro del sistema
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {/* Foto de perfil */}
              <div className="flex items-center gap-4 p-4 bg-surfalt/30 border border-line">
                {imagePreview || user?.image ? (
                  <img
                    src={imagePreview || user.image}
                    alt={user?.name || 'Perfil'}
                    className="w-16 h-16 object-cover border border-line shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-acsoft text-ac border border-acline/60 flex items-center justify-center font-display font-bold text-lg shadow-xs shrink-0">
                    {initials}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <label className={labelClass}>Foto de perfil</label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label
                      htmlFor="profile-image-upload"
                      className="px-3.5 py-2 bg-surface border border-line hover:border-ac hover:text-ac text-xs sm:text-sm font-semibold text-ink cursor-pointer transition-colors shadow-xs"
                    >
                      <FAIcon icon="camera" size="xs" className="mr-1.5" />
                      Seleccionar foto
                    </label>
                    <input
                      id="profile-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        if (selected) setRawImageFile(selected);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />

                    {imageFile ? (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-ok font-semibold flex items-center gap-1">
                          <FAIcon icon="check" size="xs" /> Lista
                        </span>
                        <button
                          type="button"
                          onClick={() => setRawImageFile(imageFile)}
                          className="text-xs sm:text-sm text-muted hover:text-ac underline cursor-pointer"
                        >
                          Ajustar
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageFile(null)}
                          className="text-xs sm:text-sm text-muted hover:text-ac p-1 cursor-pointer"
                          title="Descartar nueva foto"
                        >
                          <FAIcon icon="times" size="xs" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-muted truncate">
                        Formatos JPG o PNG
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="profile-name">
                    Nombre <span className="text-ac font-bold">*</span>
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileDraft({ ...profileForm, name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="profile-lastname">
                    Apellido <span className="text-ac font-bold">*</span>
                  </label>
                  <input
                    id="profile-lastname"
                    type="text"
                    value={profileForm.lastname}
                    onChange={(e) => setProfileDraft({ ...profileForm, lastname: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Rol en el sistema</label>
                <input
                  type="text"
                  value={user?.role === 'admin' ? 'Administrador' : 'Empleado operativo'}
                  className={inputClass}
                  disabled
                />
                <p className="text-xs text-muted mt-1.5">
                  El rol solo lo puede cambiar un administrador desde el módulo de personal.
                </p>
              </div>

              {user?.email && (
                <div>
                  <label className={labelClass}>Correo electrónico</label>
                  <input type="text" value={user.email} className={inputClass} disabled />
                </div>
              )}

              <div className="pt-2">
                <button type="submit" disabled={savingProfile} className={buttonClass}>
                  <FAIcon icon="floppy-disk" size="sm" />
                  <span>{savingProfile ? 'Guardando...' : 'Guardar cambios de perfil'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tarjeta Contraseña */}
          <div className="border border-line bg-surface p-6 sm:p-7 border-l-2 border-l-ac space-y-6">
            <div>
              <p className="kick text-ac mb-1.5">
                SEGURIDAD · CREDENCIALES
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-ink">Contraseña</h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                Mientras escribes la nueva contraseña verás qué requisitos ya cumple y qué tan segura es.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="current-password">
                  Contraseña actual <span className="text-ac font-bold">*</span>
                </label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="new-password">
                  Nueva contraseña <span className="text-ac font-bold">*</span>
                </label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
                <div className="mt-3 p-3.5 bg-surfalt/40 border border-line">
                  <PasswordChecklist password={passwordForm.newPassword} />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="confirm-password">
                  Confirmar nueva contraseña <span className="text-ac font-bold">*</span>
                </label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
                <PasswordMatch
                  password={passwordForm.newPassword}
                  confirm={passwordForm.confirmPassword}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword || !canChangePassword}
                  className={buttonClass}
                  title={canChangePassword ? undefined : 'Completa los requisitos y confirma la nueva contraseña'}
                >
                  <FAIcon icon="key" size="sm" />
                  <span>{savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Pestaña: Apariencia --- */}
      {activeTab === 'appearance' && (
        <div className="max-w-2xl border border-line bg-surface p-6 sm:p-7 border-l-2 border-l-ac space-y-6">
          <div>
            <p className="kick text-ac mb-1.5">
              PREFERENCIAS VISUALES
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Apariencia</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Elige cómo se ve el sistema en este navegador. Es una preferencia personal y no afecta
              a los demás usuarios.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`text-left p-5 rounded-none border-2 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-ac bg-surfalt/40 shadow-xs'
                  : 'border-line hover:border-linealt bg-surface'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-none bg-surfalt border border-line flex items-center justify-center">
                  <FAIcon icon="sun" className="text-warn text-lg" />
                </div>
                {theme === 'light' && (
                  <span className="text-xs num font-bold text-ac flex items-center gap-1.5">
                    <FAIcon icon="circle-check" size="xs" /> ACTIVO
                  </span>
                )}
              </div>
              <p className="font-display font-semibold text-ink text-base">Modo Claro</p>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                El estilo estándar de alto contraste
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`text-left p-5 rounded-none border-2 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-ac bg-surfalt/40 shadow-xs'
                  : 'border-line hover:border-linealt bg-surface'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-none bg-[#161826] border border-[#3f424d] flex items-center justify-center">
                  <FAIcon icon="moon" className="text-[#e08472] text-lg" />
                </div>
                {theme === 'dark' && (
                  <span className="text-xs num font-bold text-ac flex items-center gap-1.5">
                    <FAIcon icon="circle-check" size="xs" /> ACTIVO
                  </span>
                )}
              </div>
              <p className="font-display font-semibold text-ink text-base">Modo Oscuro</p>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                Fondos oscuros para trabajar de noche
              </p>
            </button>
          </div>
        </div>
      )}

      {/* --- Pestaña: Operación --- */}
      {activeTab === 'operation' && canSeeSystemSettings && (
        <div className="max-w-2xl border border-line bg-surface p-6 sm:p-7 border-l-2 border-l-ac space-y-6">
          <div>
            <p className="kick text-ac mb-1.5">
              GESTIÓN GLOBAL DEL SISTEMA
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Operación e inventario</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Estos valores afectan a todo el restaurante y sincronizan las alertas del sistema.
            </p>
          </div>

          {!isAdmin && (
            <div className="bg-warnsoft/30 border border-warn text-warn text-xs sm:text-sm p-3.5 flex items-center gap-2.5">
              <FAIcon icon="triangle-exclamation" size="sm" />
              <span>Solo un administrador puede modificar estos ajustes. Puedes verlos pero no cambiarlos.</span>
            </div>
          )}

          <form onSubmit={handleOperationSubmit} className="space-y-6">
            <div>
              <label className={labelClass}>Umbral de "agotado" por sección</label>
              <p className="text-xs sm:text-sm text-muted mb-3.5 leading-relaxed">
                Cuando una categoría baje de su umbral, el sistema emite una alerta automática y la
                marca como crítica en el panel.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {LOW_STOCK_SECTIONS.map((section) => (
                  <div key={section.id}>
                    <label
                      className="block text-xs num font-medium text-inkalt mb-1.5"
                      htmlFor={`low-stock-${section.id}`}
                    >
                      {section.label}
                    </label>
                    <input
                      id={`low-stock-${section.id}`}
                      type="number"
                      min="0"
                      value={operationForm.lowStockThresholds?.[section.id] ?? 10}
                      onChange={(e) =>
                        setOperationDraft({
                          ...operationForm,
                          lowStockThresholds: {
                            ...operationForm.lowStockThresholds,
                            [section.id]: e.target.value,
                          },
                        })
                      }
                      className={inputClass}
                      disabled={!isAdmin || loading}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 py-4 border-t border-line">
              <div>
                <p className="font-semibold text-ink text-sm sm:text-base">
                  Refrescar el panel automáticamente
                </p>
                <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                  Recarga los datos de ventas y órdenes sin necesidad de actualizar la página
                </p>
              </div>
              <Toggle
                checked={Boolean(operationForm.autoRefreshDashboard)}
                onChange={(value) =>
                  setOperationDraft({ ...operationForm, autoRefreshDashboard: value })
                }
                disabled={!isAdmin || loading}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="refresh-seconds">
                Intervalo de refresco (segundos)
              </label>
              <input
                id="refresh-seconds"
                type="number"
                min="10"
                value={operationForm.dashboardRefreshSeconds}
                onChange={(e) =>
                  setOperationDraft({ ...operationForm, dashboardRefreshSeconds: e.target.value })
                }
                className={inputClass}
                disabled={!isAdmin || loading || !operationForm.autoRefreshDashboard}
              />
              <p className="text-xs text-muted mt-1.5">Mínimo 10 segundos</p>
            </div>

            {isAdmin && (
              <div className="pt-2">
                <button type="submit" disabled={saving} className={buttonClass}>
                  <FAIcon icon="floppy-disk" size="sm" />
                  <span>{saving ? 'Guardando...' : 'Guardar ajustes de operación'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* --- Pestaña: Sistema de cocina --- */}
      {activeTab === 'kitchen' && canSeeSystemSettings && (
        <div className="max-w-2xl border border-line bg-surface p-6 sm:p-7 border-l-2 border-l-ac space-y-6">
          <div>
            <p className="kick text-ac mb-1.5">
              PANTALLA DE COMANDAS · KDS
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Sistema de cocina</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              La pantalla de cocina muestra un código en su lobby. Al habilitar, escribe ese código:
              la pantalla recibe su acceso y pasa sola a las comandas, sin que nadie la recargue.
            </p>
          </div>

          {!isAdmin && (
            <div className="bg-warnsoft/30 border border-warn text-warn text-xs sm:text-sm p-3.5 flex items-center gap-2.5">
              <FAIcon icon="triangle-exclamation" size="sm" />
              <span>Solo un administrador puede habilitar o deshabilitar el sistema de cocina.</span>
            </div>
          )}

          <div
            className={`flex items-center justify-between gap-4 p-4 border ${
              settings.kitchen.enabled ? 'border-ok bg-oksoft' : 'border-line bg-surfalt/40'
            }`}
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <span
                className={`shrink-0 w-10 h-10 border flex items-center justify-center ${
                  settings.kitchen.enabled ? 'border-ok text-ok' : 'border-line text-muted'
                }`}
              >
                <FAIcon icon="utensils" weight={settings.kitchen.enabled ? 'fill' : 'regular'} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm sm:text-base">
                  {settings.kitchen.enabled ? 'Habilitado' : 'Deshabilitado'}
                </p>
                <p className="text-xs sm:text-sm text-muted mt-0.5 leading-relaxed">
                  {settings.kitchen.changedAt
                    ? `${settings.kitchen.enabled ? 'Habilitado' : 'Deshabilitado'} por ${settings.kitchen.changedBy || 'un administrador'} · ${formatChangedAt(settings.kitchen.changedAt)}`
                    : 'Todavía no se ha habilitado nunca'}
                </p>
              </div>
            </div>

            <Toggle
              checked={Boolean(settings.kitchen.enabled)}
              onChange={handleKitchenToggle}
              disabled={!isAdmin || saving || loading}
            />
          </div>

          <ul className="space-y-2.5 text-xs sm:text-sm text-inkalt leading-relaxed">
            <li className="flex gap-2.5">
              <FAIcon icon="list-check" size="sm" className="text-ac mt-0.5 shrink-0" />
              <span>
                Con el sistema habilitado, la cola avanza sola: si no hay ninguna comanda en cocina,
                el pedido nuevo entra directo a <strong>En cocina</strong>; si ya hay una, queda{' '}
                <strong>Pendiente</strong> y entra en cuanto la anterior se marca como Lista.
              </span>
            </li>
            <li className="flex gap-2.5">
              <FAIcon icon="circle-info" size="sm" className="text-ac mt-0.5 shrink-0" />
              <span>
                Deshabilitarlo no borra ni cambia ningún pedido: la cocina vuelve al flujo manual de
                la app de empleados.
              </span>
            </li>
            <li className="flex gap-2.5">
              <FAIcon icon="shield-halved" size="sm" className="text-ac mt-0.5 shrink-0" />
              <span>
                Las pantallas de cocina no inician sesión: se emparejan con el código que muestran y
                su acceso solo sirve para ver comandas y marcarlas en cocina o listas.
              </span>
            </li>
          </ul>

          {/* Solo el admin empareja y ve las pantallas (GET /kitchen/devices es solo admin) */}
          {isAdmin && (
          <div className="pt-5 border-t border-line">
            <KitchenDevicesList
              devices={kitchenDevices.devices}
              loading={kitchenDevices.loading}
              busy={kitchenDevices.busy}
              isAdmin={isAdmin}
              systemEnabled={Boolean(settings.kitchen.enabled)}
              onUnpair={setDeviceToUnpair}
              onPairAnother={() => setPairModalOpen(true)}
            />
          </div>
          )}

          <form onSubmit={handleKitchenTimesSubmit} className="space-y-4 pt-5 border-t border-line">
            <div>
              <label className={labelClass}>Alertas de tiempo de los tickets</label>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Minutos desde que se pidió la comanda. Antes de la advertencia el ticket se ve normal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs num font-medium text-inkalt mb-1.5" htmlFor="kitchen-warning">
                  Advertencia (amarillo)
                </label>
                <input
                  id="kitchen-warning"
                  type="number"
                  min={KITCHEN_MINUTES_MIN}
                  max={KITCHEN_MINUTES_MAX}
                  value={kitchenTimesForm.warningMinutes}
                  onChange={(e) => setKitchenDraft({ ...kitchenTimesForm, warningMinutes: e.target.value })}
                  className={inputClass}
                  disabled={!isAdmin || loading}
                />
              </div>
              <div>
                <label className="block text-xs num font-medium text-inkalt mb-1.5" htmlFor="kitchen-max">
                  Tiempo máximo (rojo parpadeante)
                </label>
                <input
                  id="kitchen-max"
                  type="number"
                  min={KITCHEN_MINUTES_MIN}
                  max={KITCHEN_MINUTES_MAX}
                  value={kitchenTimesForm.maxMinutes}
                  onChange={(e) => setKitchenDraft({ ...kitchenTimesForm, maxMinutes: e.target.value })}
                  className={inputClass}
                  disabled={!isAdmin || loading}
                />
              </div>
            </div>

            {/* Vista previa de cómo cambia el ticket con el tiempo */}
            <div className="flex flex-wrap gap-2 text-[11px] num">
              <span className="px-2.5 py-1 border border-line text-inkalt">
                0–{Math.max(0, Number(kitchenTimesForm.warningMinutes) - 1)} min · normal
              </span>
              <span className="px-2.5 py-1 border border-warn bg-warnsoft text-warn">
                {kitchenTimesForm.warningMinutes}–{Math.max(0, Number(kitchenTimesForm.maxMinutes) - 1)} min · demora
              </span>
              <span className="px-2.5 py-1 border border-ac bg-acsoft text-ac">
                {kitchenTimesForm.maxMinutes}+ min · superó el máximo
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isAdmin && (
                <button type="submit" disabled={saving} className={buttonClass}>
                  <FAIcon icon="floppy-disk" size="sm" />
                  <span>{saving ? 'Guardando...' : 'Guardar tiempos'}</span>
                </button>
              )}
              {KITCHEN_URL && (
                <a
                  href={KITCHEN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-ac text-ac bg-surface text-sm font-medium hover:bg-ac hover:text-white transition-colors"
                >
                  <FAIcon icon="arrow-right" size="sm" />
                  <span>Abrir pantalla de cocina</span>
                </a>
              )}
            </div>
          </form>
        </div>
      )}

      {/* --- Pestaña: Notificaciones --- */}
      {/* --- Pestaña: Sistema de caja --- */}
      {activeTab === 'cashier' && canSeeSystemSettings && <CashierSettingsPanel isAdmin={isAdmin} />}

      {activeTab === 'notifications' && canSeeSystemSettings && (
        <div className="max-w-2xl border border-line bg-surface p-6 sm:p-7 border-l-2 border-l-ac space-y-6">
          <div>
            <p className="kick text-ac mb-1.5">
              CANAL DE AVISOS
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Preferencias de notificaciones</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Elige qué eventos quedan registrados en la campana de notificaciones.
            </p>
          </div>

          {!isAdmin && (
            <div className="bg-warnsoft/30 border border-warn text-warn text-xs sm:text-sm p-3.5 flex items-center gap-2.5">
              <FAIcon icon="triangle-exclamation" size="sm" />
              <span>Solo un administrador puede modificar estas preferencias globales.</span>
            </div>
          )}

          <div className="divide-y divide-line/60">
            {NOTIFICATION_CATEGORIES.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <span className="shrink-0 w-9 h-9 rounded-none border border-line bg-surfalt text-ink flex items-center justify-center">
                    <FAIcon icon={category.icon} size="sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm sm:text-base">{category.label}</p>
                    <p className="text-xs sm:text-sm text-muted mt-0.5 leading-relaxed">{category.description}</p>
                  </div>
                </div>

                <Toggle
                  checked={Boolean(settings.notifications[category.id])}
                  onChange={(value) => handleNotificationToggle(category.id, value)}
                  disabled={!isAdmin || saving || loading}
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Desactivar una categoría no borra las notificaciones existentes: solo deja de registrar
            los nuevos eventos.
          </p>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmKitchenOff}
        onClose={() => setConfirmKitchenOff(false)}
        onConfirm={handleDisableKitchen}
        loading={kitchenDevices.busy}
        variant="warning"
        icon="utensils"
        title="Deshabilitar sistema de cocina"
        message="Todas las pantallas de cocina pierden su acceso en este momento y vuelven al lobby. Para volver a usarlas habrá que emparejarlas otra vez. Los pedidos no se pierden ni cambian de estado."
        confirmText="Deshabilitar"
      />

      <ConfirmModal
        isOpen={Boolean(deviceToUnpair)}
        onClose={() => setDeviceToUnpair(null)}
        onConfirm={handleUnpairDevice}
        loading={kitchenDevices.busy}
        variant="warning"
        icon="ban"
        title="Desvincular pantalla de cocina"
        message={`La pantalla ${deviceToUnpair?.shortId || ''} pierde su acceso en este momento y vuelve al lobby. Las demás pantallas siguen igual.`}
        confirmText="Desvincular"
      />

      <PairKitchenModal
        isOpen={pairModalOpen}
        onClose={() => setPairModalOpen(false)}
        onPair={handlePairKitchen}
        busy={kitchenDevices.busy}
        enablesSystem={!settings.kitchen.enabled}
      />

      <ImageCropModal
        file={rawImageFile}
        onCancel={() => setRawImageFile(null)}
        onConfirm={(croppedFile) => {
          setImageFile(croppedFile);
          setRawImageFile(null);
        }}
      />
    </PageShell>
  );
}

export default function Settings() {
  return (
    <ToastProvider>
      <SettingsContent />
    </ToastProvider>
  );
}
