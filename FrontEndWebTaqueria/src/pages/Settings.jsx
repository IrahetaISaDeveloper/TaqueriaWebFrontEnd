// src/pages/settings.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import Card from '../components/commons/Card';
import FAIcon from '../components/commons/FAIcon';
import ImageCropModal from '../components/commons/ImageCropModal';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import { useAuth } from '../hooks/auth/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../context/themeContext';
import { hasPermission } from '../constants/permissions';

const TABS = [
  // "profile" y "appearance" son datos propios/preferencia local: cualquier
  // sesión iniciada los ve. "operation" y "notifications" son configuración
  // general del sistema, así que solo se muestran a quien tiene el permiso
  // "settings" (siempre true para admin, ver adminOnly más abajo).
  { id: 'profile', label: 'Perfil y cuenta', icon: 'user' },
  { id: 'appearance', label: 'Apariencia', icon: 'moon' },
  { id: 'operation', label: 'Operación', icon: 'sliders', adminOnly: true },
  { id: 'notifications', label: 'Notificaciones', icon: 'bell', adminOnly: true },
];

// Descripción de cada categoría, para que se entienda qué se apaga al desactivarla
const NOTIFICATION_CATEGORIES = [
  { id: 'orders', label: 'Órdenes', icon: 'receipt', description: 'Pedidos creados, cambios de estado y cancelaciones' },
  { id: 'inventory', label: 'Inventario', icon: 'box', description: 'Altas, ajustes de existencias y alertas de stock bajo' },
  { id: 'tables', label: 'Mesas', icon: 'chair', description: 'Mesas habilitadas y cambios de disponibilidad' },
  { id: 'menu', label: 'Menú', icon: 'utensils', description: 'Platillos, bebidas, combos y extras del menú' },
  { id: 'staff', label: 'Personal', icon: 'user-tie', description: 'Invitaciones, altas y cambios en el equipo' },
  { id: 'clients', label: 'Clientes', icon: 'users', description: 'Registro y actualización de clientes' },
];

// Secciones que tienen su propio umbral de "agotado" configurable. Inventario
// no aparece aquí: desde que el umbral es obligatorio por insumo (ver
// InventoryModal), ya no tiene sentido un umbral general para toda la sección.
const LOW_STOCK_SECTIONS = [
  { id: 'drinks', label: 'Bebidas' },
  { id: 'saucers', label: 'Platillos' },
  { id: 'extras', label: 'Extras' },
  { id: 'combos', label: 'Combos' },
];

// Interruptor reutilizable con el estilo del sistema
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
      checked ? 'bg-ac' : 'bg-linealt'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-surface rounded-full transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

function SettingsContent() {
  const { user } = useAuth();
  const { settings, loading, saving, saveSettings } = useSettings();
  const { savingProfile, savingPassword, updateProfile, changePassword } = useProfile();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  // Solo el administrador puede modificar la configuración global del negocio
  const isAdmin = user?.role === 'admin';
  // Un empleado con el permiso "settings" también puede ver/editar esa
  // configuración general; sin él, solo ve su propio perfil y apariencia.
  const canSeeSystemSettings = hasPermission(user, 'settings');
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || canSeeSystemSettings);

  // --- Perfil ---
  // Guardamos solo lo que el usuario va escribiendo (el "borrador"). Mientras no
  // toque nada, el formulario muestra directamente los datos de la sesión, así no
  // hace falta sincronizar con un efecto cuando esos datos terminan de cargar.
  const [profileDraft, setProfileDraft] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  // Archivo recién elegido en el input, pendiente de recortar/ajustar en el modal
  const [rawImageFile, setRawImageFile] = useState(null);

  const profileForm = profileDraft ?? {
    name: user?.name || '',
    lastname: user?.lastname || '',
  };

  // Vista previa de la foto seleccionada, antes de guardarla. Crear y liberar
  // la URL temporal del navegador (Blob URL) es justo el tipo de sincronización
  // con un sistema externo para el que existen los efectos: se crea cuando
  // cambia el archivo y se libera automáticamente en la limpieza del efecto.
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
      // Descartamos el borrador para volver a mostrar lo que devolvió el servidor
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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

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
  // Mismo enfoque que el perfil: mientras no se edite nada se muestran los
  // valores que vienen del servidor, sin efectos de sincronización.
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
  // Se guarda al instante al pulsar el interruptor: son cambios de un solo clic
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

  const inputClass =
    'w-full px-4 py-2.5 text-sm bg-surface border border-line rounded-none text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-200 transition-all disabled:bg-surfalt disabled:text-muted';
  const labelClass = 'block text-sm font-display font-semibold text-inkalt mb-1.5';
  const buttonClass =
    'flex items-center gap-2 px-5 py-2.5 bg-ac text-white rounded-none font-display font-semibold text-sm transition-all hover:bg-ac disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <>
    <div className="p-6 sm:p-8">
      {/* Encabezado */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1 sm:mb-2">
          Ajustes
        </h1>
        <p className="text-sm sm:text-base text-inkalt">
          Configura tu cuenta y el funcionamiento del sistema
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-none text-sm font-display font-medium transition-all ${
                isActive
                  ? 'bg-ac text-white'
                  : 'bg-surface text-inkalt hover:bg-surface hover:text-ink border border-line'
              }`}
            >
              <FAIcon icon={tab.icon} size="sm" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- Perfil y cuenta --- */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-display font-bold text-ink mb-1">Mi perfil</h2>
            <p className="text-sm text-inkalt mb-5">
              Así te ve el resto del equipo dentro del sistema
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                {imagePreview || user?.image ? (
                  <img
                    src={imagePreview || user.image}
                    alt={user?.name || 'Perfil'}
                    className={`w-16 h-16 rounded-full object-cover ${
                      imagePreview ? 'ring-2 ring-red-400' : 'ring-2 ring-white'
                    }`}
                  />
                ) : (
                  <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center text-white font-display font-bold text-lg ring-2 ring-white">
                    {`${user?.name?.[0] || ''}${user?.lastname?.[0] || ''}`.toUpperCase() || '?'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <label className={labelClass}>Foto de perfil</label>
                  <input
                    type="file"
                    accept="image/*"
                    // Abrimos el modal de ajuste con el archivo elegido; el
                    // input se limpia para poder volver a elegir la misma foto después
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      if (selected) setRawImageFile(selected);
                      e.target.value = '';
                    }}
                    className="block w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-none file:border-0 file:text-xs file:font-display file:font-semibold file:bg-surfalt file:text-inkalt hover:file:bg-line file:cursor-pointer"
                  />
                  {imageFile && (
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-ok">Foto lista para guardar</p>
                      <button
                        type="button"
                        onClick={() => setRawImageFile(imageFile)}
                        className="text-xs text-muted hover:text-ac shrink-0"
                      >
                        Ajustar
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageFile(null)}
                        className="text-xs text-muted hover:text-ac shrink-0"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="profile-name">Nombre</label>
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
                <label className={labelClass} htmlFor="profile-lastname">Apellido</label>
                <input
                  id="profile-lastname"
                  type="text"
                  value={profileForm.lastname}
                  onChange={(e) => setProfileDraft({ ...profileForm, lastname: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Rol</label>
                <input type="text" value={user?.role || ''} className={inputClass} disabled />
                <p className="text-xs text-muted mt-1">
                  El rol solo lo puede cambiar un administrador
                </p>
              </div>

              <button type="submit" disabled={savingProfile} className={buttonClass}>
                <FAIcon icon="floppy-disk" size="sm" />
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-display font-bold text-ink mb-1">Contraseña</h2>
            <p className="text-sm text-inkalt mb-5">
              Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="current-password">Contraseña actual</label>
                <input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="new-password">Nueva contraseña</label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="confirm-password">Confirmar nueva contraseña</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>

              <button type="submit" disabled={savingPassword} className={buttonClass}>
                <FAIcon icon="key" size="sm" />
                {savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* --- Apariencia --- */}
      {activeTab === 'appearance' && (
        <Card className="p-4 sm:p-6 max-w-2xl">
          <h2 className="text-lg font-display font-bold text-ink mb-1">Apariencia</h2>
          <p className="text-sm text-inkalt mb-5">
            Elige cómo se ve el sistema en este navegador. Es una preferencia personal: no afecta a los demás usuarios.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`text-left p-4 rounded-none border-2 transition-all ${
                theme === 'light' ? 'border-acline' : 'border-line hover:border-linealt'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-none bg-surfalt border border-line flex items-center justify-center">
                  <FAIcon icon="sun" className="text-warn" />
                </div>
                {theme === 'light' && <FAIcon icon="circle-check" className="text-ac" />}
              </div>
              <p className="font-display font-semibold text-ink text-sm">Claro</p>
              <p className="text-xs text-muted mt-0.5">El estilo por defecto del sistema</p>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`text-left p-4 rounded-none border-2 transition-all ${
                theme === 'dark' ? 'border-acline' : 'border-line hover:border-linealt'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                {/* Muestra literal de la paleta oscura (ver index.css): estos
                    colores van en duro a propósito, para que se vean igual
                    aunque el sistema esté en modo claro. */}
                <div className="w-10 h-10 rounded-none bg-[#161826] border border-[#3f424d] flex items-center justify-center">
                  <FAIcon icon="moon" className="text-[#e08472]" />
                </div>
                {theme === 'dark' && <FAIcon icon="circle-check" className="text-ac" />}
              </div>
              <p className="font-display font-semibold text-ink text-sm">Oscuro</p>
              <p className="text-xs text-muted mt-0.5">Fondos oscuros en todo el sistema</p>
            </button>
          </div>
        </Card>
      )}

      {/* --- Operación --- */}
      {activeTab === 'operation' && canSeeSystemSettings && (
        <Card className="p-4 sm:p-6 max-w-2xl">
          <h2 className="text-lg font-display font-bold text-ink mb-1">
            Operación e inventario
          </h2>
          <p className="text-sm text-inkalt mb-5">
            Estos valores afectan a todo el equipo, no solo a tu cuenta
          </p>

          {!isAdmin && (
            <div className="mb-5 bg-warnsoft/80 border border-warn text-warn text-xs sm:text-sm rounded-none p-3">
              Solo un administrador puede modificar estos ajustes. Puedes verlos pero no cambiarlos.
            </div>
          )}

          <form onSubmit={handleOperationSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>Umbral de "agotado" por sección</label>
              <p className="text-xs text-muted mb-3">
                Cuando una sección baje de su propio umbral, el sistema genera una alerta
                automática y la marca como crítica en el panel. Cada área puede tener un
                número distinto.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LOW_STOCK_SECTIONS.map((section) => (
                  <div key={section.id}>
                    <label className="block text-xs font-display font-medium text-inkalt mb-1" htmlFor={`low-stock-${section.id}`}>
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

            <div className="flex items-start justify-between gap-4 py-3 border-t border-line">
              <div>
                <p className="font-display font-semibold text-ink text-sm">
                  Refrescar el panel automáticamente
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Recarga los datos del panel sin que tengas que actualizar la página
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
              <p className="text-xs text-muted mt-1">Mínimo 10 segundos</p>
            </div>

            {isAdmin && (
              <button type="submit" disabled={saving} className={buttonClass}>
                <FAIcon icon="floppy-disk" size="sm" />
                {saving ? 'Guardando...' : 'Guardar ajustes'}
              </button>
            )}
          </form>
        </Card>
      )}

      {/* --- Notificaciones --- */}
      {activeTab === 'notifications' && canSeeSystemSettings && (
        <Card className="p-4 sm:p-6 max-w-2xl">
          <h2 className="text-lg font-display font-bold text-ink mb-1">
            Preferencias de notificaciones
          </h2>
          <p className="text-sm text-inkalt mb-5">
            Elige qué movimientos del sistema quedan registrados en la campana
          </p>

          {!isAdmin && (
            <div className="mb-5 bg-warnsoft/80 border border-warn text-warn text-xs sm:text-sm rounded-none p-3">
              Solo un administrador puede modificar estas preferencias.
            </div>
          )}

          <div className="divide-y divide-line">
            {NOTIFICATION_CATEGORIES.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="shrink-0 w-9 h-9 rounded-full bg-surfalt text-muted flex items-center justify-center">
                    <FAIcon icon={category.icon} size="sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink text-sm">
                      {category.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{category.description}</p>
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

          <p className="text-xs text-muted mt-4">
            Desactivar una categoría no borra las notificaciones existentes: solo deja de
            registrar las nuevas.
          </p>
        </Card>
      )}
    </div>

    <ImageCropModal
      file={rawImageFile}
      onCancel={() => setRawImageFile(null)}
      onConfirm={(croppedFile) => {
        setImageFile(croppedFile);
        setRawImageFile(null);
      }}
    />
    </>
  );
}

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
        <Sidebar activeMenu="settings" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <SettingsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
