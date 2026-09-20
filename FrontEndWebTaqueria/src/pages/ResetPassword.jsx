import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthPanel from '../components/auth/AuthPanel';
import AuthField from '../components/auth/AuthField';
import AuthError from '../components/auth/AuthError';
import ConfirmModal from '../components/commons/ConfirmModal';
import FAIcon from '../components/commons/FAIcon';
import useRecoveryPassword from '../hooks/auth/useRecoveryPassword';

// Fuerza de la contraseña: mide lo mismo que exige la validación (largo,
// mayúscula y número) más un punto extra por símbolo, para que la barra no
// prometa "buena" cuando el formulario todavía la va a rechazar.
const scorePassword = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
};

const STRENGTH_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Muy buena'];
const STRENGTH_COLORS = ['', 'bg-ac', 'bg-warn', 'bg-ok', 'bg-ok'];

export default function ResetPassword() {
  const {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    inputError,
    apiError,
    isLoading,
    success,
    handleResetPassword,
    showConfirmModal,
    openConfirmModal,
    closeConfirmModal,
    handleConfirmLeave,
    validateResetStep,
  } = useRecoveryPassword();

  // Si se llega aquí sin haber verificado el código, el hook devuelve atrás.
  useEffect(() => {
    validateResetStep();
    // El hook se recrea en cada render; incluirlo dispararía la validación en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = scorePassword(newPassword);

  return (
    <>
      <AuthPanel
        step={success ? 'Listo' : 'Paso 3 de 3'}
        title={success ? 'Contraseña actualizada' : 'Nueva contraseña'}
        description={
          success
            ? 'Ya puedes entrar a SYSCOR con tu correo (o tu código de acceso) y tu nueva contraseña.'
            : 'Mínimo 8 caracteres, con una mayúscula y un número.'
        }
      >
        {!success ? (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div>
              <AuthField
                id="new-password"
                label="Contraseña"
                icon="lock"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                disabled={isLoading}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              {/* Medidor de fuerza: cuatro tramos que se van llenando. */}
              {newPassword && (
                <div className="mt-2.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`h-0.5 flex-1 ${i <= score ? STRENGTH_COLORS[score] : 'bg-line'}`}
                      />
                    ))}
                  </div>
                  <p className="text-[11.5px] text-muted mt-1.5">Fuerza: {STRENGTH_LABELS[score]}</p>
                </div>
              )}
            </div>

            <AuthField
              id="confirm-password"
              label="Confirmar contraseña"
              icon="lock"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              disabled={isLoading}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={inputError}
            />

            <AuthError error={apiError} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-center text-[13px] font-medium py-2.5 px-4 border border-ac bg-acsoft
                text-ac hover:bg-ac hover:text-white transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Guardando…' : 'Guardar contraseña'}
            </button>

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
            <span className="w-11 h-11 border border-ok flex items-center justify-center">
              <FAIcon icon="check" className="text-ok" />
            </span>
            <Link
              to="/"
              className="w-full text-center text-[13px] font-medium py-2.5 px-4 border border-ac bg-acsoft
                text-ac hover:bg-ac hover:text-white transition-colors"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}
      </AuthPanel>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmLeave}
        title="¿Volver al inicio de sesión?"
        message="¿Estás seguro de que deseas salir? Perderás el avance y tendrás que solicitar un nuevo código."
        confirmText="Sí, salir"
        cancelText="Continuar aquí"
      />
    </>
  );
}
