import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// El progreso del flujo de recuperación expira a los 15 minutos. Si el
// usuario deja la pestaña abierta a medias por más tiempo que esto, se le
// pide reiniciar el proceso — evita que alguien reanude un flujo viejo
// horas después solo porque el dato seguía en el navegador.
const RECOVERY_FLOW_TTL_MS = 15 * 60 * 1000;

/**
 * Flujo de recuperación de contraseña.
 *
 * Sirve a dos presentaciones a la vez: las pantallas completas (/recovery,
 * /verify-code, /reset-password) y el panel que se abre sobre el login. En
 * las pantallas hay que navegar entre rutas para avanzar de paso; dentro del
 * panel no, porque los tres pasos ocurren en el mismo sitio.
 *
 * Por eso el avance no se hace aquí directamente: se delega en `onStep`. Si
 * no se pasa (caso de las pantallas), se cae al `navigate` de siempre, así
 * que el comportamiento anterior no cambia.
 */
export default function useRecoveryPassword({ onStep, onExit } = {}) {
  const navigate = useNavigate();

  // Avanzar de paso: el panel lo resuelve cambiando lo que muestra; las
  // pantallas, cambiando de ruta.
  const goToStep = (step, route) => {
    if (onStep) {
      onStep(step);
      return;
    }
    navigate(route, { replace: true });
  };

  // Salir del flujo (cancelar o terminar).
  const leaveFlow = () => {
    if (onExit) {
      onExit();
      return;
    }
    navigate('/', { replace: true });
  };

  // Usamos sessionStorage (no localStorage): se borra automáticamente al
  // cerrar la pestaña o el navegador. Esto es justo lo que necesitamos
  // para datos de un flujo temporal como este — localStorage persistiría
  // para siempre y permitiría reanudar un flujo abandonado días después.
  const [email, setEmail] = useState(() => sessionStorage.getItem('recovery_email') || '');
  const [role, setRole] = useState(() => sessionStorage.getItem('recovery_role') || 'admin');

  // Paso 2: Código
  const [digits, setDigits] = useState(['', '', '', '', '', '']);

  // Paso 3: Nueva contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Control Modal de Confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Estados de control UI
  const [inputError, setInputError] = useState('');
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingResend, setIsLoadingResend] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [success, setSuccess] = useState(false);

  // Temporizador de 120s para reenvío
  const [timer, setTimer] = useState(() => {
    const savedEndTime = sessionStorage.getItem('recovery_timer_end');
    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            sessionStorage.removeItem('recovery_timer_end');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Limpia todo el rastro del flujo de recuperación en sessionStorage
  const clearRecoveryData = () => {
    sessionStorage.removeItem('recovery_email');
    sessionStorage.removeItem('recovery_role');
    sessionStorage.removeItem('recovery_timer_end');
    sessionStorage.removeItem('recovery_step');
    sessionStorage.removeItem('recovery_expires');
  };

  // Marca en qué paso va el flujo, junto con una marca de expiración.
  // Cada vez que se avanza de paso, se "renueva" la ventana de 15 min.
  const setRecoveryStep = (step) => {
    sessionStorage.setItem('recovery_step', step);
    sessionStorage.setItem('recovery_expires', (Date.now() + RECOVERY_FLOW_TTL_MS).toString());
  };

  // Revisa si el flujo sigue vigente (no ha pasado el tiempo límite desde
  // el último paso completado). Si expiró, limpia todo y regresa false.
  const isRecoveryFlowValid = () => {
    const expiresAt = sessionStorage.getItem('recovery_expires');
    if (!expiresAt) return false;
    if (Date.now() > parseInt(expiresAt, 10)) {
      clearRecoveryData();
      return false;
    }
    return true;
  };

  // --- CONTROL DEL MODAL DE SALIDA ---
  const openConfirmModal = () => setShowConfirmModal(true);
  const closeConfirmModal = () => setShowConfirmModal(false);

  // Limpiar todo y redirigir reemplazando el historial
  const handleConfirmLeave = () => {
    clearRecoveryData();
    setShowConfirmModal(false);
    leaveFlow();
  };

  // --- VALIDADORES DE GUARDIA DE RUTA ---
  // Llama a esto al cargar /verify-code.
  // Requiere: que exista un correo guardado Y que el flujo no haya expirado.
  const validateVerifyStep = () => {
    const storedEmail = sessionStorage.getItem('recovery_email');
    if (!storedEmail || !isRecoveryFlowValid()) {
      leaveFlow();
    }
  };

  // Llama a esto al cargar /reset-password.
  // Requiere: que el paso guardado sea "verified" Y que no haya expirado.
  const validateResetStep = () => {
    const step = sessionStorage.getItem('recovery_step');
    if (step !== 'verified' || !isRecoveryFlowValid()) {
      leaveFlow();
    }
  };

  // --- PASO 1: Solicitar código ---
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (apiError) setApiError(null);
    if (inputError) setInputError('');
  };

  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    setApiError(null);
    setInputError('');

    if (!email.trim()) {
      setInputError('El correo es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setInputError('Ingresa un correo válido');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/recovery-password/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          userType: role,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setApiError({
          title: data.title || 'Correo no encontrado',
          message: data.message || 'Verifique e inténtelo de nuevo.',
        });
        return;
      }

      sessionStorage.setItem('recovery_email', email.trim());
      sessionStorage.setItem('recovery_role', role);
      setRecoveryStep('requested');

      setSuccess(true);
      setTimeout(() => {
        // replace: true evita que al darle atrás en el navegador vuelva al formulario de solicitar código
        goToStep('verify', '/verify-code');
      }, 1200);
    } catch (err) {
      console.error('Error enviando código:', err);
      setApiError({
        title: 'Error de conexión',
        message: 'No se pudo comunicar con el servidor. Intente más tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0 || isLoadingResend) return;

    const storedEmail = sessionStorage.getItem('recovery_email') || email;
    const storedRole = sessionStorage.getItem('recovery_role') || role;

    if (!storedEmail) {
      leaveFlow();
      return;
    }

    setIsLoadingResend(true);
    setApiError(null);
    setResendSuccess('');

    try {
      const response = await fetch(`${API_URL}/auth/recovery-password/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: storedEmail,
          userType: storedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setApiError({
          title: data.title || 'Error al reenviar',
          message: data.message || 'No se pudo reenviar el código.',
        });
        return;
      }

      const endTime = Date.now() + 120 * 1000;
      sessionStorage.setItem('recovery_timer_end', endTime.toString());
      setTimer(120);

      // Reenviar código también renueva la ventana de expiración del flujo
      setRecoveryStep('requested');

      setResendSuccess('¡Código reenviado con éxito!');
    } catch (err) {
      console.error('Error reenviando código:', err);
      setApiError({
        title: 'Error de conexión',
        message: 'No se pudo reenviar el código. Intente de nuevo.',
      });
    } finally {
      setIsLoadingResend(false);
    }
  };

  // --- PASO 2: Verificar Código ---
  const handleDigitChange = (value, index, inputRefs) => {
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (apiError) setApiError(null);
    if (inputError) setInputError('');

    if (value && index < 5 && inputRefs?.current) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index, inputRefs) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    setApiError(null);
    setInputError('');

    const codeRequest = digits.join('');
    if (codeRequest.length < 6) {
      setInputError('Ingresa el código completo de 6 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/recovery-password/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ codeRequest }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setApiError({
          title: data.title || 'Código inválido',
          message: data.message || 'El código es incorrecto o ha expirado.',
        });
        return;
      }

      sessionStorage.removeItem('recovery_timer_end');
      // Marcamos que ya fue verificado correctamente (y renovamos la expiración)
      setRecoveryStep('verified');

      setSuccess(true);
      setTimeout(() => {
        // Reemplaza la vista para no poder volver a meter el código
        goToStep('reset', '/reset-password');
      }, 1000);
    } catch (err) {
      console.error('Error verificando código:', err);
      setApiError({
        title: 'Error de conexión',
        message: 'No se pudo verificar el código. Intente de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- PASO 3: Restablecer Contraseña ---
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setApiError(null);
    setInputError('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setInputError('Por favor, ingresa y confirma la nueva contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      setInputError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setInputError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/recovery-password/new-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newPassword,
          confirmNewPassword: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setApiError({
          title: data.title || 'Error de actualización',
          message: data.message || 'No se pudo actualizar la contraseña.',
        });
        return;
      }

      // Limpiamos todo el rastro del flujo
      clearRecoveryData();

      setSuccess(true);
      // En el panel no se redirige sola: el usuario cierra cuando quiera,
      // así que la salida automática solo aplica a las pantallas completas.
      if (!onExit) {
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      }
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      setApiError({
        title: 'Error de conexión',
        message: 'No se pudo actualizar la contraseña. Intente más tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    setEmail,
    role,
    setRole,
    digits,
    setDigits,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showConfirmModal,
    openConfirmModal,
    closeConfirmModal,
    handleConfirmLeave,
    validateVerifyStep,
    validateResetStep,
    inputError,
    apiError,
    isLoading,
    isLoadingResend,
    resendSuccess,
    timer,
    success,
    handleEmailChange,
    handleRequestCode,
    handleResendCode,
    handleDigitChange,
    handleKeyDown,
    handleVerifyCode,
    handleResetPassword,
  };
}