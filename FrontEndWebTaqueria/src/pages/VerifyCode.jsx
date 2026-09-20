import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthPanel from '../components/auth/AuthPanel';
import AuthError from '../components/auth/AuthError';
import DigitInput from '../components/auth/DigitInput';
import ConfirmModal from '../components/commons/ConfirmModal';
import FAIcon from '../components/commons/FAIcon';
import useRecoveryPassword from '../hooks/auth/useRecoveryPassword';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function VerifyCode() {
  const {
    email,
    digits,
    inputError,
    apiError,
    isLoading,
    isLoadingResend,
    resendSuccess,
    timer,
    success,
    showConfirmModal,
    openConfirmModal,
    closeConfirmModal,
    handleConfirmLeave,
    validateVerifyStep,
    handleDigitChange,
    handleKeyDown,
    handleVerifyCode,
    handleResendCode,
  } = useRecoveryPassword();

  const inputRefs = useRef([]);

  // Si se llega aquí sin haber pedido el código, el hook devuelve al paso 1.
  useEffect(() => {
    validateVerifyStep();
    // El hook se recrea en cada render; incluirlo dispararía la validación en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AuthPanel
        step="Paso 2 de 3"
        title={success ? 'Código verificado' : 'Revisa tu correo'}
        description={
          success
            ? 'Tu identidad quedó confirmada. Ya puedes definir una contraseña nueva.'
            : undefined
        }
      >
        {!success ? (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
            <p className="text-[13px] leading-relaxed text-inkalt -mt-2">
              Enviamos un código a {email ? <strong className="text-ink">{email}</strong> : 'tu correo'}.
              Expira en 15 minutos.
            </p>

            <div className="flex justify-between gap-2">
              {digits.map((digit, index) => (
                <DigitInput
                  key={index}
                  value={digit}
                  onChange={(val, i) => handleDigitChange(val, i, inputRefs)}
                  onKeyDown={(e, i) => handleKeyDown(e, i, inputRefs)}
                  inputRef={(el) => (inputRefs.current[index] = el)}
                  index={index}
                />
              ))}
            </div>

            {inputError && <p className="text-xs text-ac">{inputError}</p>}

            {resendSuccess && (
              <div className="flex items-center gap-2.5 border border-ok bg-oksoft px-3 py-2.5">
                <FAIcon icon="check-circle" size="sm" className="text-ok shrink-0" />
                <p className="text-[12.5px] text-ink">{resendSuccess}</p>
              </div>
            )}

            <AuthError error={apiError} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-center text-[13px] font-medium py-2.5 px-4 border border-ac bg-acsoft
                text-ac hover:bg-ac hover:text-white transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Verificando…' : 'Verificar código'}
            </button>

            <p className="text-center text-xs text-muted">
              ¿No llegó?{' '}
              <button
                type="button"
                onClick={handleResendCode}
                disabled={timer > 0 || isLoadingResend}
                className="text-ac hover:text-ink font-medium transition-colors disabled:text-muted disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoadingResend
                  ? 'Reenviando…'
                  : timer > 0
                  ? `Reenviar en ${formatTime(timer)}`
                  : 'Reenviar'}
              </button>
            </p>

            <button
              type="button"
              onClick={openConfirmModal}
              className="text-center text-xs text-muted hover:text-ac transition-colors cursor-pointer"
            >
              Volver a iniciar sesión
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5 border border-ok bg-oksoft px-3.5 py-3">
              <FAIcon icon="check-circle" size="sm" className="text-ok shrink-0" />
              <p className="text-[12.5px] text-ink">Código verificado correctamente</p>
            </div>
            <Link
              to="/reset-password"
              className="w-full text-center text-[13px] font-medium py-2.5 px-4 border border-ac bg-acsoft
                text-ac hover:bg-ac hover:text-white transition-colors"
            >
              Definir nueva contraseña
            </Link>
          </div>
        )}
      </AuthPanel>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmLeave}
        title="¿Volver al inicio de sesión?"
        message="¿Estás seguro de que deseas salir? Perderás el código ingresado y tendrás que volver a solicitarlo."
        confirmText="Sí, salir"
        cancelText="Continuar aquí"
      />
    </>
  );
}
