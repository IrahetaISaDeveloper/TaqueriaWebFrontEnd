// hooks/useSpeech.js (compartido: Chef Panchita en cocina y en caja)
//
// Envoltura de la Web Speech API nativa del navegador:
//   - SpeechRecognition (escuchar). Solo existe en Chrome y Edge (con el
//     prefijo webkit) y exige https o localhost.
//   - SpeechSynthesis (hablar). Existe en todos los navegadores modernos.
//
// Dos formas de escuchar:
//   - 'once': quien la usa toca el micrófono y dice UNA frase.
//   - 'continuous': queda escuchando siempre, pero quien la usa solo atiende
//     lo que empieza con "Panchita" (cada sistema tiene su intérprete).
//     Chrome corta la escucha sola tras un rato de silencio; aquí se
//     reanuda sin que nadie toque nada.
//
// Mientras Panchita habla se deja de escuchar: si no, se oiría a sí misma
// por la bocina y se respondería en bucle.
import { useState, useEffect, useRef, useCallback } from 'react';

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const SPEECH_SUPPORT = {
  recognition: Boolean(SpeechRecognitionImpl),
  synthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
};

// Español de El Salvador; si el navegador no lo reconoce, el de México.
const PRIMARY_LANG = 'es-SV';
const FALLBACK_LANG = 'es-MX';

// Preferencia de voz para hablar: la variante latinoamericana más cercana
const VOICE_LANG_PREFERENCE = ['es-SV', 'es-MX', 'es-US', 'es-419', 'es-ES'];

const RESTART_DELAY_MS = 300;
const MAX_RESTART_DELAY_MS = 5000;

// Ejecuta `action` en el primer toque/tecla sobre la página (una sola vez).
// Es lo que los navegadores exigen para dejar hablar o escuchar a una página.
export const runOnFirstGesture = (action) => {
  const events = ['pointerdown', 'keydown'];
  const handler = () => {
    events.forEach((name) => window.removeEventListener(name, handler, true));
    action();
  };
  events.forEach((name) => window.addEventListener(name, handler, true));
  return () => events.forEach((name) => window.removeEventListener(name, handler, true));
};

const pickVoice = (voices) => {
  const spanish = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('es'));
  for (const lang of VOICE_LANG_PREFERENCE) {
    const match = spanish.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
    if (match) return match;
  }
  return spanish[0] || null;
};

const ERROR_MESSAGES = {
  'not-allowed': 'El navegador no tiene permiso de usar el micrófono. Actívalo en el candado de la barra de direcciones.',
  'service-not-allowed': 'El navegador no permite el reconocimiento de voz en esta página.',
  'audio-capture': 'No se encontró ningún micrófono conectado.',
  network: 'Se perdió la conexión con el servicio de voz. Reintentando…',
};

/**
 * @param {{ onResult: (alternatives: string[], meta: { mode: string }) => void }} options
 *   onResult recibe las transcripciones posibles de una frase (la más
 *   probable primero) y el modo en que se escuchó.
 */
export default function useSpeech({ onResult }) {
  const [mode, setModeState] = useState('off');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  // Frase que el navegador no dejó decir hasta que alguien toque la pantalla
  const [blockedSpeech, setBlockedSpeech] = useState(null);

  const recognitionRef = useRef(null);
  const modeRef = useRef('off');
  const speakingRef = useRef(false);
  const langRef = useRef(PRIMARY_LANG);
  const voiceRef = useRef(null);
  const restartTimerRef = useRef(null);
  const restartDelayRef = useRef(RESTART_DELAY_MS);
  const retryWithFallbackRef = useRef(false);
  // Lo que está diciendo ahora (para reconocer su propio eco)
  const speakingTextRef = useRef('');
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const setMode = useCallback((next) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  // Las voces del sistema cargan de forma asíncrona (sobre todo en Chrome)
  useEffect(() => {
    if (!SPEECH_SUPPORT.synthesis) return undefined;
    const loadVoices = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const startRecognitionRef = useRef(() => {});

  const scheduleRestart = useCallback(() => {
    clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'continuous' && !speakingRef.current && !recognitionRef.current) {
        startRecognitionRef.current();
      }
    }, restartDelayRef.current);
  }, []);

  const startRecognition = useCallback(() => {
    if (!SpeechRecognitionImpl || recognitionRef.current) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = langRef.current;
    recognition.continuous = modeRef.current === 'continuous';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      // Escuchar funcionó: el siguiente reinicio vuelve a ser inmediato
      restartDelayRef.current = RESTART_DELAY_MS;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const alternatives = Array.from(result, (alternative) => alternative.transcript).filter(Boolean);
        if (alternatives.length) {
          onResultRef.current?.(alternatives, {
            mode: modeRef.current,
            // Si estaba hablando, quien la usa decide si fue una interrupción
            // o solo su propia voz que se coló por el micrófono
            whileSpeaking: speakingRef.current,
            speakingText: speakingTextRef.current,
          });
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;

      if (event.error === 'language-not-supported' && langRef.current !== FALLBACK_LANG) {
        langRef.current = FALLBACK_LANG;
        retryWithFallbackRef.current = true;
        return; // onend la vuelve a abrir con el idioma de respaldo
      }

      setError(ERROR_MESSAGES[event.error] || 'El reconocimiento de voz falló. Intenta de nuevo.');

      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        // No tiene caso reintentar: hace falta que alguien lo arregle
        setMode('off');
      } else {
        restartDelayRef.current = Math.min(restartDelayRef.current * 2, MAX_RESTART_DELAY_MS);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (retryWithFallbackRef.current) {
        retryWithFallbackRef.current = false;
        startRecognitionRef.current();
        return;
      }
      if (modeRef.current === 'continuous') {
        if (!speakingRef.current) scheduleRestart();
      } else if (modeRef.current === 'once') {
        setMode('off');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      // InvalidStateError: ya estaba escuchando. Se ignora.
      console.warn('SpeechRecognition.start:', err);
      recognitionRef.current = null;
    }
  }, [scheduleRestart, setMode]);

  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  const abortRecognition = useCallback(() => {
    clearTimeout(restartTimerRef.current);
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback((nextMode = 'once') => {
    if (!SPEECH_SUPPORT.recognition) return;
    // Tocar el micrófono mientras habla la calla: el cocinero quiere decir
    // algo ya. Encender la escucha continua (también sola, al cargar o al
    // terminar una frase) NO la corta: la bienvenida, por ejemplo, se oye
    // completa y se puede interrumpir con la voz.
    if (nextMode === 'once' && speakingRef.current && SPEECH_SUPPORT.synthesis) window.speechSynthesis.cancel();
    abortRecognition();
    setError(null);
    restartDelayRef.current = RESTART_DELAY_MS;
    setMode(nextMode);
    startRecognition();
  }, [abortRecognition, setMode, startRecognition]);

  const stopListening = useCallback(() => {
    setMode('off');
    abortRecognition();
  }, [abortRecognition, setMode]);

  const speak = useCallback((text) => {
    if (!SPEECH_SUPPORT.synthesis || !text) return;
    const synth = window.speechSynthesis;

    const say = () => {
      speakingRef.current = true;
      speakingTextRef.current = text;
      setSpeaking(true);
      // Con escucha continua el micrófono SIGUE abierto mientras habla, para
      // que la puedan interrumpir ("Panchita, ya"). Si era una sola frase, ya
      // se escuchó: la respuesta la cierra.
      if (modeRef.current !== 'continuous') {
        if (modeRef.current === 'once') setMode('off');
        abortRecognition();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceRef.current?.lang || FALLBACK_LANG;
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = 1.05;

      const done = () => {
        speakingRef.current = false;
        speakingTextRef.current = '';
        setSpeaking(false);
        if (modeRef.current === 'continuous') scheduleRestart();
      };
      utterance.onend = done;
      utterance.onerror = (event) => {
        done();
        // Chrome no deja hablar a una página que nadie ha tocado desde que se
        // abrió (ej. la bienvenida al emparejar la pantalla desde el panel).
        // La frase se guarda y se dice al primer toque.
        if (event?.error === 'not-allowed') {
          setBlockedSpeech(text);
          runOnFirstGesture(() => {
            setBlockedSpeech(null);
            say();
          });
        }
      };

      synth.cancel();
      synth.speak(utterance);
    };

    say();
  }, [abortRecognition, scheduleRestart, setMode]);

  // Callarla a media frase (la interrumpieron)
  const stopSpeaking = useCallback(() => {
    if (SPEECH_SUPPORT.synthesis && speakingRef.current) window.speechSynthesis.cancel();
  }, []);

  // Al salir de la pantalla no se deja el micrófono abierto ni la voz sonando
  useEffect(() => () => {
    modeRef.current = 'off';
    clearTimeout(restartTimerRef.current);
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.abort();
    }
    if (SPEECH_SUPPORT.synthesis) window.speechSynthesis.cancel();
  }, []);

  return {
    supported: SPEECH_SUPPORT,
    mode,
    listening,
    speaking,
    error,
    blockedSpeech,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
