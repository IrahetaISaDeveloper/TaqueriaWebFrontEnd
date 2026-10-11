// Registro de la persona invitada: llega aquí desde el enlace del correo,
// crea su contraseña y, si quiere, sube su foto. Sigue el mismo diseño que el
// login (panel ilustrado a la izquierda en escritorio, formulario a la
// derecha), porque es la otra pantalla a la que se llega sin sesión.
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInvitation } from '../hooks/auth/useInvitation';
import { useTheme } from '@syscor/web-shared/src/context/themeContext';
import LoadingSpinner from '@syscor/web-shared/src/components/LoadingSpinner';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { PasswordInput, PasswordChecklist, PasswordMatch } from '../components/commons/PasswordFields';
import { ModalShell, ModalHeader, ModalBody, ModalFooter, FormSection, MODAL_BTN_SECONDARY, MODAL_BTN_PRIMARY } from '@syscor/web-shared/src/components/FormModal';
import { passwordMeetsRules } from '../utils/passwordRules';
import { translateEmployeeType } from '../constants/employeeTypes';
import { TERMS_SECTIONS, TERMS_VERSION } from '../constants/terms';

const inputClasses =
  'w-full px-3 py-2.5 text-[13px] bg-bg border border-linealt text-ink placeholder:text-muted ' +
  'focus:outline-none focus:border-ac focus:ring-1 focus:ring-acline transition-colors';

const labelClasses = 'kick block text-muted mb-1.5';

// Nombre del puesto en español: un admin es "Administrador"; un empleado,
// su puesto traducido (Cajero, Mesero...), nunca el valor crudo del backend.
const roleLabel = (role, type) => (role === 'admin' ? 'Administrador' : translateEmployeeType(type));

// Contenedor de las vistas simples (verificando, enlace inválido, éxito).
const CenteredCard = ({ logoSrc, children }) => (
  <div className="min-h-dvh flex items-center justify-center bg-surfalt p-4">
    <div className="bg-surface rounded-2xl border border-line shadow-2xl p-8 max-w-md w-full text-center">
      <img src={logoSrc} alt="SYSCOR" className="h-9 w-auto object-contain mx-auto mb-6" />
      {children}
    </div>
  </div>
);

// Términos y condiciones (provisionales) en una ventana, para no sacar a la
// persona del registro.
const TermsModal = ({ onClose, onAccept }) => (
  <ModalShell maxWidth="max-w-2xl">
    <ModalHeader icon="file-text" title="Términos y condiciones" badge="Provisional" badgeTone="warn" subtitle={TERMS_VERSION} onClose={onClose} />
    <ModalBody>
      {TERMS_SECTIONS.map((section) => (
        <FormSection key={section.title} icon={section.icon} title={section.title}>
          <div className="space-y-2">
            {section.paragraphs.map((p) => (
              <p key={p} className="text-[13px] leading-relaxed text-inkalt">{p}</p>
            ))}
          </div>
        </FormSection>
      ))}
    </ModalBody>
    <ModalFooter note="Al aceptar, se marca la casilla del registro.">
      <button type="button" onClick={onClose} className={MODAL_BTN_SECONDARY}>
        Cerrar
      </button>
      <button type="button" onClick={onAccept} className={MODAL_BTN_PRIMARY}>
        <FAIcon icon="check" size="xs" />
        Acepto los términos
      </button>
    </ModalFooter>
  </ModalShell>
);

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { theme } = useTheme();

  const { loading, validateInvitation, acceptInvitation } = useInvitation();

  // El rol sale de la ruta (/admin/accept-invitation o /employee/...).
  const [role] = useState(() => {
    const path = window.location.pathname;
    if (path.includes('/admin/')) return 'admin';
    if (path.includes('/employee/')) return 'employee';
    return null;
  });

  const [checking, setChecking] = useState(true);
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitedData, setInvitedData] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [terms, setTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  const logoSrc = theme === 'dark' ? '/logos/nav-dark-plain.png' : '/logos/nav-light-plain.png';
  const backgroundSrc = theme === 'dark' ? '/backgrounds/login-fondo-v2-oscuro.svg' : '/backgrounds/login-fondo-v2-claro.svg';

  // Validar el token de invitación al entrar
  useEffect(() => {
    const validate = async () => {
      if (!token || !role) {
        setErrors({ general: 'Enlace de invitación inválido.' });
        setChecking(false);
        return;
      }
      const result = await validateInvitation(token, role);
      if (result.success) {
        setInvitedData(result.data);
        setInvitationValid(true);
      } else {
        setErrors({ general: result.error });
      }
      setChecking(false);
    };
    validate();
  }, [token, role, validateInvitation]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // El botón solo se habilita cuando el servidor va a aceptar el registro.
  const canSubmit = passwordMeetsRules(password) && password === confirmPassword && terms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!passwordMeetsRules(password)) next.password = 'La contraseña todavía no cumple todos los requisitos';
    if (!confirmPassword) next.confirmPassword = 'Confirma tu contraseña';
    else if (password !== confirmPassword) next.confirmPassword = 'Las contraseñas no coinciden';
    if (!terms) next.terms = 'Debes aceptar los términos y condiciones';
    if (Object.keys(next).length > 0) {
      setErrors(next);
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
      setErrors({ general: result.error });
    }
  };

  // --- Verificando el enlace ---
  if (checking) {
    return (
      <CenteredCard logoSrc={logoSrc}>
        <div className="py-8">
          <LoadingSpinner color="red" />
          <p className="text-muted text-sm mt-4">Verificando invitación…</p>
        </div>
      </CenteredCard>
    );
  }

  // --- Enlace inválido o vencido ---
  if (!invitationValid) {
    return (
      <CenteredCard logoSrc={logoSrc}>
        <div className="mb-5 p-3.5 rounded-xl bg-acsoft border border-acline text-left flex items-start gap-3">
          <FAIcon icon="triangle-exclamation" size="sm" className="text-ac mt-0.5 shrink-0" />
          <p className="text-ac text-[13px]">{errors.general}</p>
        </div>
        <button type="button" onClick={() => navigate('/')} className={MODAL_BTN_SECONDARY}>
          <FAIcon icon="arrow-left" size="xs" />
          Volver al inicio de sesión
        </button>
      </CenteredCard>
    );
  }

  // --- Registro completado ---
  if (success) {
    return (
      <CenteredCard logoSrc={logoSrc}>
        <span className="w-11 h-11 rounded-full border border-ok flex items-center justify-center mx-auto mb-4">
          <FAIcon icon="check" className="text-ok" />
        </span>
        <h2 className="font-display text-[19px] text-ink mb-2">Registro completado</h2>
        <p className="text-[13px] text-inkalt mb-5">Te llevamos al inicio de sesión en unos segundos…</p>

        {hasPermissions && (
          <div className="p-4 rounded-xl bg-warnsoft border border-warn text-left">
            <p className="text-warn text-sm font-display font-medium mb-1">Se te otorgaron permisos en el sistema</p>
            <p className="text-warn text-[13px] mb-3">Te enviamos un código de acceso a tu correo. Búscalo para poder entrar.</p>
            <a
              href="https://mail.google.com/mail/u/0/#inbox"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warn text-white text-xs font-display font-medium"
            >
              <FAIcon icon="envelope" size="xs" />
              Abrir Gmail
            </a>
          </div>
        )}
      </CenteredCard>
    );
  }

  const firstName = invitedData?.personalInfo?.name || '';
  const puesto = roleLabel(role, invitedData?.personalInfo?.type);

  // --- Formulario de registro ---
  return (
    <div className="min-h-dvh bg-surface">
      <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(460px,42%)]">
        {/* Panel ilustrado (solo escritorio), igual que el login */}
        <div className="hidden lg:flex relative isolate overflow-hidden px-12 py-14 flex-col justify-between gap-9">
          <img src={backgroundSrc} alt="" aria-hidden="true" className="absolute inset-0 -z-10 w-full h-full object-cover" />
          <img src="/logos/nav-dark-plain.png" alt="SYSCOR" className="self-start h-[46px] w-auto object-contain" />

          <div>
            <p className="kick mb-4" style={{ color: theme === 'dark' ? 'var(--color-ac)' : '#e79a86' }}>
              Invitación · Taquería El Corral
            </p>
            <h1 className="font-display text-[38px] leading-[1.1] text-white max-w-[460px] mb-4">
              Te damos la bienvenida al equipo
            </h1>
            <p className="text-[13.5px] leading-relaxed text-white/75 max-w-[430px]">
              Solo falta crear tu contraseña. Con ella entrarás a SYSCOR con tu correo; si te asignan permisos, también
              recibirás un código de acceso.
            </p>
          </div>

          <div className="pt-6 border-t border-white/20 flex items-center gap-3">
            <FAIcon icon="shield" size="sm" className="text-white/60" />
            <p className="text-[12.5px] text-white/70">
              Nadie de la taquería te pedirá tu contraseña. Guárdala solo para ti.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-surface lg:border-l border-line px-6 py-9 sm:px-10 sm:py-12 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto flex flex-col gap-6">
            <img src={logoSrc} alt="SYSCOR" className="lg:hidden h-12 w-auto object-contain self-start" />

            <div>
              <h2 className="font-display text-[22px] text-ink mb-1">¡Hola{firstName ? `, ${firstName}` : ''}!</h2>
              <p className="text-[13px] text-muted">Crea tu contraseña para completar tu registro.</p>
            </div>

            {/* Datos de la invitación */}
            <div className="grid grid-cols-2 gap-3 p-3.5 border border-line bg-surfalt/40">
              <div className="min-w-0">
                <p className="kick text-muted mb-1">Correo</p>
                <p className="text-[13px] text-ink truncate">{invitedData?.email || '—'}</p>
              </div>
              <div className="min-w-0">
                <p className="kick text-muted mb-1">Puesto</p>
                <p className="text-[13px] text-ink truncate">{puesto}</p>
              </div>
            </div>

            {errors.general && (
              <div className="border border-acline bg-acsoft p-3">
                <p className="text-[13px] text-ac">{errors.general}</p>
              </div>
            )}

            {/* Contraseña */}
            <div>
              <label htmlFor="invite-password" className={labelClasses}>Contraseña <span className="text-ac">*</span></label>
              <PasswordInput
                id="invite-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: null })); }}
                placeholder="Crea una contraseña segura"
                className={inputClasses}
              />
              {errors.password && <p className="text-ac text-xs mt-1.5">{errors.password}</p>}
              <div className="mt-3 p-3.5 border border-line bg-surfalt/40">
                <PasswordChecklist password={password} />
              </div>
            </div>

            <div>
              <label htmlFor="invite-confirm" className={labelClasses}>Confirmar contraseña <span className="text-ac">*</span></label>
              <PasswordInput
                id="invite-confirm"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: null })); }}
                placeholder="Repite tu contraseña"
                className={inputClasses}
              />
              {errors.confirmPassword
                ? <p className="text-ac text-xs mt-1.5">{errors.confirmPassword}</p>
                : <PasswordMatch password={password} confirm={confirmPassword} />}
            </div>

            {/* Foto de perfil (opcional) */}
            <div>
              <p className={labelClasses}>Foto de perfil <span className="normal-case tracking-normal">(opcional)</span></p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-acline bg-acsoft flex items-center justify-center shrink-0">
                  {imagePreview
                    ? <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                    : <FAIcon icon="camera" className="text-ac" />}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3.5 py-2 text-[12.5px] font-medium border border-linealt text-inkalt hover:border-ac hover:text-ac transition-colors">
                    {imageFile ? 'Cambiar foto' : 'Elegir foto'}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="text-[12.5px] text-muted hover:text-ac transition-colors"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11.5px] text-muted mt-2">JPG, PNG o GIF.</p>
            </div>

            {/* Términos */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => { setTerms(e.target.checked); setErrors((p) => ({ ...p, terms: null })); }}
                  className="h-4 w-4 mt-0.5 accent-red-600 shrink-0"
                />
                <span className="text-[13px] text-inkalt">
                  He leído y acepto los{' '}
                  <button type="button" onClick={() => setTermsOpen(true)} className="text-ac underline underline-offset-2 hover:text-ink">
                    términos y condiciones
                  </button>
                </span>
              </label>
              {errors.terms && <p className="text-ac text-xs mt-1.5 ml-6">{errors.terms}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              title={canSubmit ? undefined : 'Completa la contraseña, confírmala y acepta los términos'}
              className="w-full flex items-center justify-center gap-2 text-[13px] font-medium py-3 px-4
                border border-ac bg-acsoft text-ac hover:bg-ac hover:text-white transition-colors
                disabled:opacity-50 disabled:hover:bg-acsoft disabled:hover:text-ac disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner color="red" size="sm" /> : <>Completar registro <FAIcon icon="arrow-right" size="xs" /></>}
            </button>
          </form>
        </div>
      </div>

      {termsOpen && (
        <TermsModal
          onClose={() => setTermsOpen(false)}
          onAccept={() => { setTerms(true); setErrors((p) => ({ ...p, terms: null })); setTermsOpen(false); }}
        />
      )}
    </div>
  );
}
