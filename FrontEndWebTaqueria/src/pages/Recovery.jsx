import { Link } from 'react-router-dom';
import AuthPanel from '../components/auth/AuthPanel';
import AuthField from '../components/auth/AuthField';
import AuthError from '../components/auth/AuthError';
import FAIcon from '../components/commons/FAIcon';
import useRecoveryPassword from '../hooks/auth/useRecoveryPassword';

export default function Recovery() {
  const {
    email,
    inputError,
    apiError,
    isLoading,
    success,
    handleEmailChange,
    handleRequestCode,
  } = useRecoveryPassword();

  return (
    <AuthPanel
      step="Paso 1 de 3"
      title={success ? 'Revisa tu correo' : 'Recuperar contraseña'}
      description={
        success
          ? 'Si ese correo está registrado, recibirás un código de 6 caracteres. Revisa también la carpeta de spam.'
          : 'Escribe el correo de tu cuenta. Te enviaremos un código de 6 caracteres para continuar.'
      }
    >
      {!success ? (
        <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
          <AuthField
            id="recovery-email"
            label="Correo electrónico"
            icon="envelope"
            type="email"
            placeholder="admin@corral.com"
            value={email}
            disabled={isLoading}
            onChange={handleEmailChange}
            error={inputError}
          />

          <AuthError error={apiError} />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full text-center text-[13px] font-medium py-2.5 px-4 border border-ac bg-acsoft
              text-ac hover:bg-ac hover:text-white transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Enviando…' : 'Enviar código'}
          </button>

          <Link
            to="/"
            className="text-center text-xs text-muted hover:text-ac transition-colors"
          >
            Volver a iniciar sesión
          </Link>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5 border border-ok bg-oksoft px-3.5 py-3">
            <FAIcon icon="check-circle" size="sm" className="text-ok shrink-0" />
            <p className="text-[12.5px] text-ink">Correo enviado correctamente</p>
          </div>
          <Link
            to="/verify-code"
            className="w-full text-center text-[13px] font-medium py-2.5 px-4 border border-ac bg-acsoft
              text-ac hover:bg-ac hover:text-white transition-colors"
          >
            Ya tengo el código
          </Link>
          <Link to="/" className="text-center text-xs text-muted hover:text-ac transition-colors">
            Volver a iniciar sesión
          </Link>
        </div>
      )}
    </AuthPanel>
  );
}
