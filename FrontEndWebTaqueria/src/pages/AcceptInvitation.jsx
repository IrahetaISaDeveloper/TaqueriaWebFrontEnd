import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInvitation } from '../hooks/auth/useInvitation';
import LoadingSpinner from '../components/commons/LoadingSpinner';
import Logo from '../components/commons/Logo';

// Estilos base para inputs clay (los mismos que usamos en todo el sistema)
const inputClasses =
  'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt placeholder:text-muted text-sm';

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { loading, error, validateInvitation, acceptInvitation, reset } = useInvitation();

  const [checking, setChecking] = useState(true);
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitedData, setInvitedData] = useState(null);
  const [role, setRole] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [terms, setTerms] = useState(false);

  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Determina el rol según la ruta actual (admin o employee)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/admin/')) setRole('admin');
    else if (path.includes('/employee/')) setRole('employee');
  }, []);

  // Validar el token de invitación al montar el componente
  useEffect(() => {
    const validate = async () => {
      if (!token || !role) {
        setValidationErrors({ general: 'Enlace de invitación inválido.' });
        setChecking(false);
        return;
      }
      const result = await validateInvitation(token, role);
      if (result.success) {
        setInvitedData(result.data);
        setInvitationValid(true);
      } else {
        setValidationErrors({ general: result.error });
      }
      setChecking(false);
    };
    validate();
  }, [token, role, validateInvitation]);

  // Manejo de la imagen de perfil
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!password) errors.password = 'La contraseña es requerida';
    else if (password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres';
    if (!confirmPassword) errors.confirmPassword = 'Confirma tu contraseña';
    else if (password !== confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
    if (!terms) errors.terms = 'Debes aceptar los términos y condiciones';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const result = await acceptInvitation(token, password, imageFile, role);
    if (result.success) {
      const grantedPermissions = !!result.data?.hasPermissions;
      setHasPermissions(grantedPermissions);
      setSuccess(true);
      // Si tiene permisos, le damos más tiempo a que lea el aviso del código
      // de acceso antes de mandarlo al login.
      setTimeout(() => navigate('/'), grantedPermissions ? 8000 : 2500);
    } else {
      setValidationErrors({ general: result.error });
    }
  };

  // --- VISTA MIENTRAS SE VERIFICA EL TOKEN ---
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surfalt p-4">
        <div className="bg-surface rounded-none border border-line p-8 max-w-md w-full text-center">
          <Logo variant="auth" height={90} className="mx-auto" />
          <div className="py-10">
            <LoadingSpinner color="red" />
            <p className="text-muted text-sm mt-4 font-medium">Verificando invitación...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA SI LA INVITACIÓN NO ES VÁLIDA ---
  if (!invitationValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surfalt p-4">
        <div className="bg-surface rounded-none border border-line p-8 max-w-md w-full text-center">
          <Logo variant="auth" height={90} className="mx-auto" />
          <div className="py-6">
            <div className="mb-4 p-3 bg-acsoft border border-acline rounded-none">
              <p className="text-ac text-sm">{validationErrors.general}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-ac hover:text-ac text-sm font-display font-semibold transition-colors"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA DE ÉXITO TRAS COMPLETAR EL REGISTRO ---
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surfalt p-4">
        <div className="bg-surface rounded-none border border-line p-8 max-w-md w-full text-center">
          <Logo variant="auth" height={90} className="mx-auto" />
          <div className="py-6 space-y-3">
            <div className="p-3 bg-oksoft border border-ok rounded-none">
              <p className="text-ok text-sm font-medium">
                ✓ Registro completado exitosamente. Redirigiendo al inicio de sesión...
              </p>
            </div>

            {hasPermissions && (
              <div className="p-4 bg-warnsoft border border-warn rounded-none text-left">
                <p className="text-warn text-sm font-display font-semibold mb-1">
                  Se te han otorgado permisos en el sistema.
                </p>
                <p className="text-warn text-sm mb-3">
                  Código de acceso enviado a tu correo. Revisa tu correo para encontrarlo.
                </p>
                <a
                  href="https://mail.google.com/mail/u/0/#inbox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-warn hover:bg-warn text-white text-xs font-display font-semibold transition-colors"
                >
                  Abrir Gmail
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- FORMULARIO DE REGISTRO ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-surfalt p-4">
      <div className="bg-surface rounded-none border border-line p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Logo variant="auth" height={90} className="mx-auto" />
        </div>

        <div className="text-center mb-6">
          <p className="text-ink font-display font-bold text-lg">¡Hola, {invitedData?.personalInfo?.name}!</p>
          <p className="text-inkalt text-sm mt-1">
            {role === 'admin'
              ? 'Crea tu contraseña para completar tu registro como Administrador'
              : `Crea tu contraseña para completar tu registro como ${invitedData?.personalInfo?.type || 'Empleado'}`
            }
          </p>
        </div>

        {validationErrors.general && (
          <div className="mb-4 p-3 bg-acsoft border border-acline rounded-none">
            <p className="text-ac text-sm text-center">{validationErrors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña */}
          <div className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Contraseña <span className="text-ac">*</span>
            </label>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: null }));
              }}
              className={inputClasses}
            />
            {validationErrors.password && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.password}</p>}
          </div>

          {/* Confirmar contraseña */}
          <div className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Confirmar contraseña <span className="text-ac">*</span>
            </label>
            <input
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (validationErrors.confirmPassword) setValidationErrors(prev => ({ ...prev, confirmPassword: null }));
              }}
              className={inputClasses}
            />
            {validationErrors.confirmPassword && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.confirmPassword}</p>}
          </div>

          {/* Subida de foto de perfil (opcional) */}
          <div className="mb-4">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Foto de perfil (opcional)
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {imagePreview && (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-acline">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <label className="cursor-pointer bg-surfalt hover:bg-line px-4 py-2 rounded-none transition font-display font-semibold text-sm text-inkalt">
                <span>Seleccionar imagen</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="text-ac text-sm font-display font-semibold hover:text-ac transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
            <p className="text-xs text-muted mt-1">Formatos permitidos: JPG, PNG, GIF</p>
          </div>

          {/* Aceptación de términos */}
          <div className="mb-6">
            <label className="flex items-start cursor-pointer p-3 bg-surface rounded-none border border-line transition-shadow">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => {
                  setTerms(e.target.checked);
                  if (validationErrors.terms) setValidationErrors(prev => ({ ...prev, terms: null }));
                }}
                className="h-4 w-4 text-ac focus:ring-red-500 border-linealt rounded mt-0.5 accent-red-500"
              />
              <span className="ml-2 text-sm text-inkalt">
                Acepto los{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-ac hover:text-ac underline font-medium">
                  términos y condiciones
                </a>
              </span>
            </label>
            {validationErrors.terms && <p className="text-ac text-xs mt-2 ml-6">{validationErrors.terms}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ac hover:bg-ac text-white font-display font-semibold py-3 rounded-none transition disabled:opacity-50 flex items-center justify-center
              active:"
          >
            {loading ? <LoadingSpinner color="white" size="sm" /> : 'Completar registro'}
          </button>
        </form>
      </div>
    </div>
  );
}