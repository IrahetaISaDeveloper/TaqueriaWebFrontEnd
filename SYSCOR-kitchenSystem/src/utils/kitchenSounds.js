// Sonidos de la pantalla de cocina, uno distinto por evento, para que la
// cocina sepa qué pasó sin voltear a ver la pantalla.
//
// Se generan con la Web Audio API (osciladores), sin archivos de audio: no
// hay nada que descargar y suenan al instante. Los navegadores no dejan
// sonar a una página que nadie ha tocado: el audio se desbloquea en el
// primer toque y, mientras tanto, los sonidos simplemente no suenan.
import { runOnFirstGesture } from '@syscor/web-shared/src/hooks/useSpeech';

// Cada sonido: notas [frecuencia Hz, inicio s, duración s], forma de onda y volumen
const SOUNDS = {
  // Pedido nuevo: dos tonos subiendo, llamativo
  created: { wave: 'triangle', gain: 0.35, notes: [[660, 0, 0.14], [880, 0.16, 0.14], [880, 0.34, 0.2]] },
  // Pasa a cocina: un golpe medio, corto
  preparing: { wave: 'sine', gain: 0.3, notes: [[523, 0, 0.18]] },
  // Lista: acorde que sube (do-mi-sol), de "terminado"
  ready: { wave: 'sine', gain: 0.3, notes: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.3]] },
  // Regresa a cocina / vuelve a la cola: dos tonos bajando
  reverted: { wave: 'triangle', gain: 0.3, notes: [[784, 0, 0.14], [523, 0.16, 0.22]] },
  // Atrasada (la marca el servidor): tres pulsos graves de alerta
  late: { wave: 'square', gain: 0.12, notes: [[330, 0, 0.12], [330, 0.2, 0.12], [330, 0.4, 0.12]] },
  // Cancelada o eliminada: tono grave que baja
  cancelled: { wave: 'sawtooth', gain: 0.12, notes: [[294, 0, 0.18], [196, 0.2, 0.35]] },
  // Cambio de pausa/espera (cliente agregando, mesero marchó...): toque suave
  updated: { wave: 'sine', gain: 0.18, notes: [[440, 0, 0.1]] },
};

let context = null;

const getContext = () => {
  if (context) return context;
  const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextImpl) return null;
  context = new AudioContextImpl();
  // Si el navegador lo creó "suspendido", se reanuda al primer toque
  if (context.state === 'suspended') runOnFirstGesture(() => context.resume());
  return context;
};

// Preparar el audio desde el arranque, para que el primer toque lo desbloquee
export const primeKitchenSounds = () => getContext();

export const playKitchenSound = (name) => {
  const sound = SOUNDS[name];
  const ctx = getContext();
  if (!sound || !ctx || ctx.state !== 'running') return;

  const start = ctx.currentTime + 0.01;
  for (const [frequency, offset, duration] of sound.notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = sound.wave;
    oscillator.frequency.value = frequency;
    // Entrada y salida suaves, para que no "truene" la bocina
    gain.gain.setValueAtTime(0, start + offset);
    gain.gain.linearRampToValueAtTime(sound.gain, start + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration + 0.02);
  }
};

// Qué sonido corresponde a un cambio de comanda (null = no suena)
export const soundForChange = (previous, next) => {
  if (!next) return 'cancelled';
  if (!previous) return next.status === 'ready' ? 'ready' : 'created';
  if (previous.status === next.status) {
    const holdChanged = Boolean(previous.hold?.active) !== Boolean(next.hold?.active);
    const waitingChanged = Boolean(previous.waiting) !== Boolean(next.waiting);
    return holdChanged || waitingChanged ? 'updated' : null;
  }
  switch (next.status) {
    case 'preparing':
      return previous.status === 'ready' ? 'reverted' : 'preparing';
    case 'ready':
      return 'ready';
    case 'atrasado':
      return 'late';
    case 'pending':
      return 'reverted';
    case 'cancelled':
    case 'delivered':
      return next.status === 'cancelled' ? 'cancelled' : null;
    default:
      return null;
  }
};
