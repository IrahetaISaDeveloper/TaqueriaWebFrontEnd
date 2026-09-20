import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FAIcon from '../components/commons/FAIcon';
import LoginHelpChat from '../components/chat/LoginHelpChat';
import RecoveryFlow from '../components/auth/RecoveryFlow';
import { useTheme } from '../context/themeContext';
import { useAuth } from '../hooks/auth/useAuth';
import useLogin from '../hooks/auth/useLogin.js';
import useAccessCodeLogin from '../hooks/auth/useAccessCodeLogin.js';

// Lo que el sistema hace, en tres líneas. Va en el panel ilustrado porque es
// lo único que se le puede contar a alguien que todavía no entró.
const HIGHLIGHTS = [
  { icon: 'bolt', label: 'Comandas de cocina en tiempo real' },
  { icon: 'box', label: 'Inventario que descuenta al vender' },
  { icon: 'receipt', label: 'Reportes de IVA listos para declarar' },
];

// Interruptor de tema: dos mitades en una píldora, con la activa en el rojo
// del sistema. Vive aquí porque el login es la única pantalla a la que se
// llega sin sesión, y todavía no existe el menú de perfil.
const ThemeToggle = ({ theme, toggleTheme }) => (
  <button
    type="button"
    onClick={toggleTheme}
    aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    className="flex border border-line rounded-full overflow-hidden shrink-0"
  >
    <span className={`w-[30px] h-[26px] flex items-center justify-center transition-colors ${
      theme === 'light' ? 'bg-ac text-white' : 'text-muted'
    }`}>
      <FAIcon icon="sun" size="xs" />
    </span>
    <span className={`w-[30px] h-[26px] flex items-center justify-center transition-colors ${
      theme === 'dark' ? 'bg-ac text-white' : 'text-muted'
    }`}>
      <FAIcon icon="moon" size="xs" />
    </span>
  </button>
);

// Campo con icono a la izquierda. El ojo para revelar la contraseña solo
// aparece cuando el campo es de contraseña.
const Field = ({ id, label, icon, type, name, value, onChange, placeholder, disabled }) => {
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="kick block text-muted mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <FAIcon icon={icon} size="sm" />
        </span>
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-9 ${isPassword ? 'pr-10' : 'pr-3'} py-2.5 text-[13px] bg-bg border border-linealt
            text-ink placeholder:text-muted focus:outline-none focus:border-ac focus:ring-1 focus:ring-acline
            transition-colors disabled:opacity-60`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-inkalt transition-colors"
          >
            <FAIcon icon={visible ? 'eye-slash' : 'eye'} size="sm" />
          </button>
        )}
      </div>
    </div>
  );
};

// Aviso de error del formulario. Se repite en los dos accesos (correo y
// código), así que se declara una vez.
const ErrorNote = ({ error }) => {
  if (!error) return null;
  return (
    <div className="border border-acline bg-acsoft p-3">
      {typeof error === 'object' ? (
        <>
          <p className="text-[13px] font-medium text-ac">{error.title}</p>
          {error.message && <p className="text-xs text-ac mt-0.5">{error.message}</p>}
        </>
      ) : (
        <p className="text-[13px] text-ac whitespace-pre-line">{error}</p>
      )}
    </div>
  );
};

export default function Login() {
  const navigate = useNavigate();
  const { form, isLoading, error, handleChange, handleLogin } = useLogin();
  const { theme, toggleTheme } = useTheme();
  const { checkAuth } = useAuth();
  const { verifying, loggingIn, verifyCode, loginWithCode } = useAccessCodeLogin();

  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState(null);

  // Una vez el código es válido, se pasa a pedir la contraseña con el fondo
  // borroso, sin volver a pedir el correo.
  const [verifiedEmployee, setVerifiedEmployee] = useState(null); // { name } | null
  const [codePassword, setCodePassword] = useState('');
  const [codeLoginError, setCodeLoginError] = useState(null);
  // El panel lateral sirve para dos cosas: preguntarle a Panchita y
  // recuperar la contraseña. null = cerrado.
  const [panel, setPanel] = useState(null); // 'chat' | 'recovery' | null

  // El SVG del panel trae su propio degradado y su textura, y hay uno por
  // tema (el claro es crema, el oscuro azul noche).
  // Los fondos traen su propio degradado, su textura y el velo oscuro ya
  // aplicado, así que el panel no necesita ninguna capa extra encima.
  const backgroundSrc = theme === 'dark'
    ? '/backgrounds/login-fondo-v2-oscuro.svg'
    : '/backgrounds/login-fondo-v2-claro.svg';

  // localhost cuenta como origen seguro para el navegador, pero aquí interesa
  // el cifrado real del tráfico, así que solo se considera segura una
  // conexión por HTTPS.
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setCodeError(null);
    if (!accessCode.trim()) {
      setCodeError('Ingresa tu código de acceso');
      return;
    }
    const result = await verifyCode(accessCode.trim().toUpperCase());
    if (result.success) {
      setVerifiedEmployee({ name: result.name });
    } else {
      setCodeError(result.message);
    }
  };

  const handleCodeLogin = async (e) => {
    e.preventDefault();
    setCodeLoginError(null);
    if (!codePassword) {
      setCodeLoginError('Ingresa tu contraseña');
      return;
    }
    const result = await loginWithCode(accessCode.trim().toUpperCase(), codePassword);
    if (!result.success) {
      setCodeLoginError(result.message);
      return;
    }
    const currentUser = await checkAuth();
    if (!currentUser) {
      setCodeLoginError('Sesión iniciada pero no se pudo verificar. Intenta de nuevo.');
      return;
    }
    navigate('/dashboard');
  };

  const closeCodeLogin = () => {
    setVerifiedEmployee(null);
    setCodePassword('');
    setCodeLoginError(null);
  };

  return (
    <div className="min-h-screen bg-surface">
      <div
        className={`min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,38%)]
          transition-[filter] duration-200 ${panel ? 'blur-sm pointer-events-none select-none' : ''}`}
        // Con el panel abierto el login queda detrás y fuera de alcance: se
        // desenfoca y deja de recibir clics y foco, para que no se pueda
        // escribir a ciegas en un formulario que no se está viendo.
        aria-hidden={panel ? 'true' : undefined}
        inert={panel ? '' : undefined}
      >

        {/* --- Panel ilustrado --- */}
        <div className="relative isolate overflow-hidden px-7 py-9 sm:px-12 sm:py-14 flex flex-col justify-between gap-9">
          {/* El fondo va como <img> y no como background-image para que el
              navegador lo trate como un recurso normal: se precarga, se
              cachea y no depende de recalcular CSS al cambiar de tema. */}
          <img
            src={backgroundSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 w-full h-full object-cover"
          />

          {/* El logo va siempre en su versión clara: bajo el velo, el panel
              es oscuro en los dos temas. */}
          <img
            src="/logos/nav-dark-plain.png"
            alt="SYSCOR"
            className="self-start h-[46px] w-auto object-contain"
          />

          <div>
            <p
              className="kick mb-4"
              style={{ color: theme === 'dark' ? 'var(--color-ac)' : '#e79a86' }}
            >
              Sistema de control (Syscor) · Taquería El Corral
            </p>
            <h1 className="font-display text-[28px] sm:text-[38px] leading-[1.1] text-white w-full sm:max-w-[460px] mb-4">
              Todo el local en una sola pantalla
            </h1>
            <p className="text-[13.5px] leading-relaxed text-white/75 w-full sm:max-w-[430px] mb-7">
              Pedidos, mesas, inventario, personal y el IVA del mes. Entra con tu correo
              o con el código que te dio el administrador.
            </p>

            <ul className="flex flex-col gap-3">
              {HIGHLIGHTS.map((h) => (
                <li key={h.icon} className="flex items-center gap-2.5 text-[13px] text-white/80">
                  <FAIcon icon={h.icon} size="sm" className="text-ac shrink-0" />
                  {h.label}
                </li>
              ))}
            </ul>
          </div>

      {/* Bloque de soporte de acceso: Ofrece ayuda mediante el bot "Chef Panchita" 
              para usuarios que no pueden iniciar sesión, evitando incluir métricas o 
              datos estáticos que requerirían actualización manual. */}
          <div className="pt-6 border-t border-white/20">
            <p className="kick text-white/55 mb-3">¿Problemas para entrar?</p>
            <ul className="flex flex-col gap-2 text-[12.5px] text-white/70 mb-5">
              <li>
                Si tienes problemas para acceder, habla con nuestra asistente <span className="text-white">Chef Panchita</span> para ayudarte a solucionarlo de inmediato.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setPanel('chat')}
              className="inline-flex items-center gap-2 px-3.5 py-2 mb-5 border border-white/30 text-white/85
                text-[12.5px] hover:border-white hover:text-white transition-colors"
            >
              {/* Este botón vive sobre el panel ilustrado, que bajo el velo
                  es oscuro en los dos temas: por eso lleva siempre el retrato
                  de trazo blanco y no el que corresponde al tema. */}
              <img
                src="https://res.cloudinary.com/ddisnfuwo/image/upload/v1789535305/panchita-icono-medio-solo-linea-blanca.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                className="w-5 h-5 object-contain shrink-0"
              />
              Preguntar a Chef Panchita
            </button>

            <p className="num text-[11px] text-white/50">v2.0</p>
          </div>
        </div>

        {/* --- Formulario --- */}
        <div className="bg-surface border-t lg:border-t-0 lg:border-l border-line
          px-7 py-9 sm:px-10 sm:py-12 flex flex-col justify-center gap-6">

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-[22px] text-ink mb-1">Portal administrador</h2>
              <p className="text-[12.5px] text-muted">Ingrese sus credenciales</p>
            </div>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Field
              id="login-email"
              label="Correo electrónico"
              icon="envelope"
              placeholder="admin@corral.com"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled={isLoading}
            />
            <Field
              id="login-password"
              label="Contraseña"
              icon="lock"
              placeholder="••••••••"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              disabled={isLoading}
            />

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => setPanel('recovery')}
                className="text-xs text-ac hover:text-ink transition-colors cursor-pointer"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            <ErrorNote error={error} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 text-[13px] font-medium py-3 px-4
                border border-ac bg-acsoft text-ac hover:bg-ac hover:text-white transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Iniciando…' : 'Iniciar sesión'}
              {!isLoading && <FAIcon icon="arrow-right" size="xs" />}
            </button>
          </form>

          {/* Acceso alterno para empleados con permisos */}
          <div className="pt-5 border-t border-line">
            <p className="text-[12.5px] text-inkalt mb-2.5">
              ¿Empleado con permisos? Ingresa tu código de acceso:
            </p>
            <form onSubmit={handleVerifyCode} className="flex gap-2">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value); if (codeError) setCodeError(null); }}
                placeholder="Ej. A3F92C"
                maxLength={8}
                aria-label="Código de acceso"
                className="num flex-1 min-w-0 px-3 py-2.5 text-[13px] bg-bg border border-linealt text-ink
                  placeholder:text-muted uppercase tracking-[0.18em] focus:outline-none focus:border-ac
                  focus:ring-1 focus:ring-acline transition-colors"
              />
              <button
                type="submit"
                disabled={verifying}
                className="shrink-0 px-4 py-2.5 text-[12.5px] font-medium border border-linealt text-inkalt
                  hover:border-ac hover:text-ac transition-colors disabled:opacity-60"
              >
                {verifying ? '…' : 'Continuar'}
              </button>
            </form>
            {codeError && <p className="text-ac text-xs mt-2">{codeError}</p>}
          </div>

          {/* El sello de cifrado se muestra solo si la conexión lo está de
              verdad: la cookie de sesión únicamente viaja como "secure" bajo
              HTTPS (ver cookieConfig en el backend), y en desarrollo esto
              corre sobre HTTP plano. Afirmarlo siempre sería mentir justo en
              la pantalla donde se escribe una contraseña. */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
            {isSecure ? (
              <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                <FAIcon icon="shield-alt" size="xs" className="text-ok" />
                Conexión cifrada
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11.5px] text-warn">
                <FAIcon icon="triangle-exclamation" size="xs" />
                Conexión sin cifrar
              </span>
            )}
            <span className="text-[11.5px] text-muted">
              Soporte · <span className="num">7168-6876</span>
            </span>
          </div>
        </div>
      </div>

      {/* Asistente de acceso: panel lateral en escritorio, pantalla completa
          en móvil (donde un panel estrecho no se podría leer). */}
      {panel && (
        <>
          <button
            type="button"
            aria-label="Cerrar panel"
            onClick={() => setPanel(null)}
            className="fixed inset-0 z-40 bg-black/25 cursor-default"
          />
          <div className="fixed z-50 inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[380px]">
            {panel === 'chat' ? (
              <LoginHelpChat
                onClose={() => setPanel(null)}
                onStartRecovery={() => setPanel('recovery')}
              />
            ) : (
              <RecoveryFlow
                onBackToChat={() => setPanel('chat')}
                onClose={() => setPanel(null)}
                onDone={() => setPanel(null)}
              />
            )}
          </div>
        </>
      )}

      {/* Fondo borroso + contraseña, una vez el código fue validado */}
      {verifiedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-surface border border-line max-w-sm w-full p-6 sm:p-8">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-acsoft flex items-center justify-center mx-auto mb-3">
                <FAIcon icon="lock" className="text-ac" />
              </div>
              <p className="font-display text-lg text-ink">Hola, {verifiedEmployee.name}</p>
              <p className="text-[12.5px] text-muted mt-0.5">Ingresa tu contraseña para continuar</p>
            </div>

            <form onSubmit={handleCodeLogin} className="flex flex-col gap-4">
              <Field
                id="code-login-password"
                label="Contraseña"
                icon="lock"
                placeholder="••••••••"
                type="password"
                name="codePassword"
                value={codePassword}
                onChange={(e) => { setCodePassword(e.target.value); if (codeLoginError) setCodeLoginError(null); }}
                disabled={loggingIn}
              />

              <ErrorNote error={codeLoginError} />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeCodeLogin}
                  disabled={loggingIn}
                  className="flex-1 px-4 py-2.5 text-[13px] font-medium border border-linealt text-inkalt hover:border-ink transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="flex-1 px-4 py-2.5 text-[13px] font-medium border border-ac bg-acsoft text-ac hover:bg-ac hover:text-white transition-colors disabled:opacity-60"
                >
                  {loggingIn ? 'Ingresando…' : 'Ingresar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
