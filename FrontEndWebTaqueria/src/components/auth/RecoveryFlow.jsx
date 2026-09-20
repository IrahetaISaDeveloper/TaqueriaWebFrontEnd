// Flujo de recuperación de contraseña dentro del panel del asistente.
//
// Los tres pasos ocurren aquí mismo, sin cambiar de pantalla: el hook
// useRecoveryPassword avisa del avance con `onStep` en vez de navegar (ver
// el propio hook). Las pantallas completas (/recovery, /verify-code,
// /reset-password) siguen existiendo y comparten esa misma lógica.
import { useState, useRef, useEffect } from 'react';
import AuthField from './AuthField';
import AuthError from './AuthError';
import DigitInput from './DigitInput';
import FAIcon from '../commons/FAIcon';
import useRecoveryPassword from '../../hooks/auth/useRecoveryPassword';

// Los tres tramos de la barra de progreso.
const STEPS = [
  { id: 'request', label: 'Correo' },
  { id: 'verify', label: 'Código' },
  { id: 'reset', label: 'Nueva clave' },
];

// Requisitos de la contraseña. Se muestran como lista que se va marcando,
// en lugar de una barra de "fuerza": así el usuario ve exactamente qué le
// falta para que el formulario la acepte, no una valoración difusa.
const RULES = [
  { id: 'len', label: '8 caracteres', test: (pw) => pw.length >= 8 },
  { id: 'upper', label: 'Una mayúscula', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'digit', label: 'Un número', test: (pw) => /[0-9]/.test(pw) },
];

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const PrimaryAction = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`text-center text-[13px] font-medium py-2.5 px-4 border border-ac bg-acsoft
      text-ac hover:bg-ac hover:text-white transition-colors disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

const RecoveryFlow = ({ onBackToChat, onClose, onDone }) => {
  const [step, setStep] = useState('request');

  const {
    email, digits, inputError, apiError, isLoading, isLoadingResend,
    resendSuccess, timer, success, newPassword, setNewPassword,
    confirmPassword, setConfirmPassword, handleEmailChange, handleRequestCode,
    handleVerifyCode, handleResendCode, handleDigitChange, handleKeyDown,
    handleResetPassword,
  } = useRecoveryPassword({
    onStep: (next) => setStep(next),
    // Terminar o cancelar no navega: lo resuelve el panel.
    onExit: () => onDone?.(),
  });

  const inputRefs = useRef([]);

  // El paso 3 termina en "listo", que es una vista propia dentro del panel.
  const currentStep = step === 'reset' && success ? 'done' : step;
  const activeIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Al llegar al paso del código, el foco va a la primera casilla.
  useEffect(() => {
    if (step === 'verify') inputRefs.current[0]?.focus();
  }, [step]);

  return (
    <div className="flex flex-col h-full bg-surface border-l border-line">
      {/* Encabezado */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
        <button
          type="button"
          onClick={onBackToChat}
          aria-label="Volver al chat"
          className="w-6 h-6 flex items-center justify-center border border-line text-muted hover:text-ink hover:border-linealt transition-colors"
        >
          <FAIcon icon="chevron-left" size="xs" />
        </button>
        <p className="text-sm font-display text-ink">Recuperar contraseña</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="ml-auto text-muted hover:text-ink transition-colors"
        >
          <FAIcon icon="times" size="sm" />
        </button>
      </div>

      {/* Progreso: tres tramos, el cursado en acento y los pendientes en gris */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        {STEPS.map((s, i) => (
          <div key={s.id}>
            <span
              className={`block h-0.5 mb-2 ${
                i <= (activeIndex === -1 ? STEPS.length : activeIndex) ? 'bg-ac' : 'bg-line'
              }`}
            />
            <span className={`kick ${i === activeIndex ? 'text-ink' : 'text-muted'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
        {/* --- Paso 1: correo --- */}
        {currentStep === 'request' && (
          <>
            <h2 className="font-display text-[19px] leading-tight text-ink mb-2">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-[13px] leading-relaxed text-inkalt mb-5">
              Escribe el correo de tu cuenta y te enviamos un código de 6 caracteres.
            </p>

            <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
              <AuthField
                id="panel-recovery-email"
                label="Correo electrónico"
                type="email"
                placeholder="admin@corral.com"
                value={email}
                disabled={isLoading}
                onChange={handleEmailChange}
                error={inputError}
                autoFocus
              />
              <AuthError error={apiError} />
              <PrimaryAction type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Enviando…' : 'Enviar código'}
              </PrimaryAction>
            </form>

            {/* Qué esperar del proceso, para que nadie abandone a medias
                pensando que el código no llegará. */}
            <div className="mt-6 pt-5 border-t border-line">
              <p className="kick text-muted mb-3">Qué va a pasar</p>
              <ol className="flex flex-col gap-2.5">
                {[
                  'Recibes un código que vence en 15 minutos.',
                  'Lo escribes aquí mismo, sin salir del login.',
                  'Defines tu nueva contraseña y entras.',
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 text-[12.5px] leading-relaxed text-inkalt">
                    <span className="num text-muted shrink-0">{i + 1}</span>
                    {text}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {/* --- Paso 2: código --- */}
        {currentStep === 'verify' && (
          <>
            <h2 className="font-display text-[19px] leading-tight text-ink mb-2">Revisa tu correo</h2>
            <p className="text-[13px] leading-relaxed text-inkalt mb-5">
              Código enviado a {email ? <strong className="text-ink">{email}</strong> : 'tu correo'}.
            </p>

            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <div className="flex justify-between gap-1.5">
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
              <AuthError error={apiError} />

              <div className="flex gap-2">
                <PrimaryAction type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Verificando…' : 'Verificar'}
                </PrimaryAction>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={timer > 0 || isLoadingResend}
                  className="shrink-0 px-3.5 py-2.5 text-[12.5px] border border-linealt text-inkalt
                    hover:border-ac hover:text-ac transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingResend
                    ? '…'
                    : timer > 0
                    ? <>Reenviar <span className="num">{formatTime(timer)}</span></>
                    : 'Reenviar'}
                </button>
              </div>

              {resendSuccess && (
                <div className="flex items-center gap-2.5 border border-ok bg-oksoft px-3 py-2.5">
                  <FAIcon icon="check-circle" size="sm" className="text-ok shrink-0" />
                  <p className="text-[12.5px] text-ink">{resendSuccess}</p>
                </div>
              )}
            </form>

            <div className="mt-4 border-l-2 border-ac bg-surfalt px-3.5 py-3">
              <p className="text-[12.5px] leading-relaxed text-inkalt">
                Si no aparece en unos minutos, busca en <strong className="text-ink">Spam</strong> o
                en <strong className="text-ink">Promociones</strong>.
              </p>
            </div>
          </>
        )}

        {/* --- Paso 3: nueva contraseña --- */}
        {currentStep === 'reset' && (
          <>
            <h2 className="font-display text-[19px] leading-tight text-ink mb-2">
              Define tu nueva contraseña
            </h2>
            <p className="text-[13px] leading-relaxed text-inkalt mb-5">
              Cerraremos las demás sesiones al guardarla.
            </p>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div>
                <AuthField
                  id="panel-new-password"
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  disabled={isLoading}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />

                {/* Requisitos: se marcan conforme se cumplen */}
                <div className="mt-2.5">
                  <div className="flex gap-1.5 mb-2">
                    {RULES.map((r) => (
                      <span
                        key={r.id}
                        className={`h-0.5 flex-1 ${r.test(newPassword) ? 'bg-ac' : 'bg-line'}`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {RULES.map((r) => {
                      const ok = r.test(newPassword);
                      return (
                        <span
                          key={r.id}
                          className={`text-[11.5px] inline-flex items-center gap-1 ${ok ? 'text-ac' : 'text-muted'}`}
                        >
                          <FAIcon icon={ok ? 'check' : 'circle-info'} size="xs" />
                          {r.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <AuthField
                id="panel-confirm-password"
                label="Confirmar"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                disabled={isLoading}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={inputError}
              />

              <AuthError error={apiError} />

              <PrimaryAction type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Guardando…' : 'Guardar y entrar'}
              </PrimaryAction>
            </form>
          </>
        )}

        {/* --- Final --- */}
        {currentStep === 'done' && (
          <>
            <span className="w-11 h-11 border border-ok flex items-center justify-center mb-4">
              <FAIcon icon="check" className="text-ok" />
            </span>
            <h2 className="font-display text-[19px] leading-tight text-ink mb-2">
              Contraseña actualizada
            </h2>
            <p className="text-[13px] leading-relaxed text-inkalt mb-5">
              Ya puedes entrar a SYSCOR con tu correo (o tu código de acceso) y tu nueva contraseña.
            </p>
            <PrimaryAction type="button" onClick={onDone} className="w-full">
              Ir a iniciar sesión
            </PrimaryAction>
          </>
        )}
      </div>

      {/* Pie: la salida cuando el flujo no basta */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-t border-line">
        <span className="text-[12px] text-muted">¿Sigues sin poder entrar?</span>
        <button
          type="button"
          onClick={onBackToChat}
          className="text-[12px] font-medium text-ac hover:text-ink transition-colors"
        >
          Chat con Panchita
        </button>
      </div>
    </div>
  );
};

export default RecoveryFlow;
