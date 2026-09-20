// Asistente de la pantalla de inicio de sesión.
//
// Solo explica cómo entrar al sistema: habla con un endpoint público sin
// herramientas (ver loginHelpController en el backend), porque quien
// pregunta todavía no tiene sesión. No consulta datos del negocio ni
// confirma si una cuenta existe.
//
// Cuando el asistente no puede resolver el problema, la salida son los tres
// canales de soporte, que están siempre a la vista al final del panel.
import { useState, useRef, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import PanchitaIcon from './PanchitaIcon';

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/chat/login-help`
  : '/api/chat/login-help';

// Datos de soporte. El correo es el de la taquería; el teléfono se usa tanto
// para llamada como para WhatsApp.
const SUPPORT_EMAIL = 'taqueriaelcorralsyscor@gmail.com';
const SUPPORT_PHONE = '7168-6876';
const SUPPORT_PHONE_INTL = '50371686876'; // formato internacional, para wa.me

// El botón para pasar al flujo de recuperación no aparece de entrada: solo
// cuando el usuario dice que ese es su problema. Ofrecerlo antes sería
// empujar a recuperar la contraseña a quien quizá solo tiene el correo mal
// escrito.
const RECOVERY_HINTS = [
  'olvid', 'no recuerdo', 'no me acuerdo', 'recuperar', 'restablecer',
  'resetear', 'cambiar mi contrase', 'perdi mi contrase', 'perdí mi contrase',
  'nueva contrase', 'no se mi contrase', 'no sé mi contrase',
];

// Sin tildes y en minúsculas, para que "olvidé" y "olvide" cuenten igual.
const normalize = (text) =>
  (text || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const mentionsPasswordTrouble = (text) => {
  const t = normalize(text);
  return RECOVERY_HINTS.some((hint) => t.includes(normalize(hint)));
};

// Atajos de lo que más se pregunta aquí, para no tener que escribir.
const QUICK_ASKS = [
  'No me llega el código',
  'Olvidé mi contraseña',
  '¿Qué es el código de acceso?',
];

const SUPPORT_LINKS = [
  { icon: 'phone', label: 'Llamar', href: `tel:+${SUPPORT_PHONE_INTL}`, text: SUPPORT_PHONE },
  { icon: 'mobile-screen', label: 'WhatsApp', href: `https://wa.me/${SUPPORT_PHONE_INTL}`, text: SUPPORT_PHONE },
  { icon: 'envelope', label: 'Correo', href: `mailto:${SUPPORT_EMAIL}`, text: SUPPORT_EMAIL },
];

const LoginHelpChat = ({ onClose, onStartRecovery }) => {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: '¡Hola! Soy Chef Panchita, tu asistente en SYSCOR. Puedo ayudarte con tu ingreso por correo, tu código de empleado o a recuperar tu contraseña. ¿En qué te ayudo hoy?',
    },
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [offerRecovery, setOfferRecovery] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  // El panel se abre con el foco en el campo, para poder escribir de una vez.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cada mensaje nuevo desplaza la conversación al final.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setSending(true);

    // Una vez ofrecido, se queda: si pregunta otra cosa después, el atajo
    // sigue a mano.
    if (mentionsPasswordTrouble(question)) setOfferRecovery(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history }),
      });
      const data = await res.json().catch(() => ({}));

      const reply = data.reply || data.message || 'No pude responder. Prueba contactando a soporte.';
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
      if (Array.isArray(data.history)) setHistory(data.history);

      // Tras un par de intercambios sin resolverse, los canales de soporte
      // dejan de estar plegados: es la salida real cuando el asistente no
      // alcanza.
      setShowSupport((prev) => prev || messages.filter((m) => m.role === 'user').length >= 1);
    } catch (err) {
      console.error('Error al consultar el asistente de acceso:', err);
      setMessages((prev) => [...prev, {
        role: 'model',
        text: 'No hay conexión con el asistente. Puedes escribir directamente a soporte.',
      }]);
      setShowSupport(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-line">
      {/* Encabezado */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
        <p className="text-sm font-display text-ink">Chef Panchita (Asistente inteligente)</p>
        <span className="kick text-muted border border-line px-1.5 py-0.5">Acceso</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar asistente"
          className="ml-auto text-muted hover:text-ink transition-colors"
        >
          <FAIcon icon="times" size="sm" />
        </button>
      </div>

      {/* Conversación */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          m.role === 'user' ? (
            <div key={i} className="self-end max-w-[85%] bg-acsoft border border-acline px-3 py-2">
              <p className="text-[12.5px] leading-relaxed text-ink">{m.text}</p>
            </div>
          ) : (
            // Mensaje ya respondido: lleva el retrato realista (el mismo en
            // ambos temas). El de línea queda solo para el "Escribiendo…".
            <div key={i} className="flex gap-2.5 max-w-[95%]">
              <PanchitaIcon variant="answered" className="w-7 h-12 self-start" />
              <p className="text-[12.5px] leading-relaxed text-inkalt pt-0.5">
                {m.text}
              </p>
            </div>
          )
        ))}

        {sending && (
          <div className="flex gap-2.5">
            <PanchitaIcon variant="avatar" className="w-7 h-12 self-start" />
            <p className="text-[12.5px] text-muted pt-0.5">Escribiendo…</p>
          </div>
        )}

        {/* Atajos: solo mientras la conversación no ha empezado */}
        {messages.length === 1 && !sending && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {QUICK_ASKS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="kick text-inkalt border border-line px-2 py-1.5 hover:border-ac hover:text-ac transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Pasar al flujo de recuperación: aparece cuando el usuario ha dicho
            que ese es su problema (ver mentionsPasswordTrouble). */}
        {onStartRecovery && offerRecovery && !sending && (
          <button
            type="button"
            onClick={onStartRecovery}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2.5 border border-acline bg-acsoft
              hover:border-ac transition-colors text-left"
          >
            <FAIcon icon="key" size="sm" className="text-ac shrink-0" />
            <span className="text-[12.5px] text-ink">Recuperar mi contraseña</span>
            <FAIcon icon="chevron-right" size="xs" className="text-ac ml-auto" />
          </button>
        )}

        {/* Soporte: la salida cuando el asistente no resuelve */}
        {showSupport && (
          <div className="mt-2 pt-3 border-t border-line">
            <p className="kick text-muted mb-2.5">¿Sigue sin resolverse? Contacta a soporte</p>
            <div className="flex flex-col gap-1.5">
              {SUPPORT_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith('http') ? '_blank' : undefined}
                  rel={l.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="flex items-center gap-2.5 px-3 py-2 border border-line hover:border-ac transition-colors group"
                >
                  <FAIcon icon={l.icon} size="sm" className="text-muted group-hover:text-ac transition-colors" />
                  <span className="text-[12.5px] text-ink">{l.label}</span>
                  <span className="num text-[11px] text-muted ml-auto truncate">{l.text}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Entrada */}
      <div className="px-4 py-3 border-t border-line">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 border border-linealt bg-bg px-3 py-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre el inicio de sesión…"
            maxLength={500}
            aria-label="Pregunta para el asistente"
            className="flex-1 min-w-0 bg-transparent text-[12.5px] text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Enviar"
            className="text-muted hover:text-ac transition-colors disabled:opacity-40"
          >
            <FAIcon icon="paper-plane" size="sm" />
          </button>
        </form>
        <p className="text-[11px] text-muted mt-2 leading-relaxed">
          Solo responde dudas del inicio de sesión. Nunca compartas tu contraseña por aquí.
        </p>
      </div>
    </div>
  );
};

export default LoginHelpChat;
