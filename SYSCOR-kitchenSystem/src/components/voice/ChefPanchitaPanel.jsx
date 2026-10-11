// components/voice/ChefPanchitaPanel.jsx
//
// Chef Panchita, el asistente de voz de cocina. Toda la lógica vive en
// hooks/useChefPanchita.js; esto solo la muestra:
//   - En pantallas anchas (xl), un panel fijo a la derecha del tablero.
//   - En tablets y teléfonos, un botón flotante que abre el mismo panel.
import { useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import PanchitaIcon from '@syscor/web-shared/src/components/PanchitaIcon';
import VoiceHelpModal from './VoiceHelpModal';

const TONE_CLASS = {
  ok: 'text-ink',
  warn: 'text-warn',
  error: 'text-ac',
};

const statusText = ({ supported, mode, listening, speaking }) => {
  if (!supported.recognition) return 'Este navegador no reconoce voz';
  if (speaking) {
    return mode === 'continuous'
      ? 'Hablando… di «ya» o «Panchita» para interrumpir'
      : 'Hablando… toca el micrófono para interrumpir';
  }
  if (mode === 'once') return listening ? 'Te escucho…' : 'Preparando micrófono…';
  if (mode === 'continuous' && listening) return 'Escuchando: di «Panchita…»';
  return 'Toca el micrófono y habla';
};

// Interruptor del mismo estilo que el de Ajustes del panel
const Switch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-ac' : 'bg-line'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transition duration-200 ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

// Contenido del panel, igual en el lateral y en el flotante
function PanchitaConsole({ panchita, onHelp, headerAction }) {
  const { supported, mode, listening, speaking, error, blockedSpeech, log, continuous, setContinuous, startListening, stopListening } = panchita;
  const canListen = supported.recognition;

  const handleMic = () => {
    if (mode === 'once') stopListening();
    else startListening('once');
  };

  return (
    <>
      <header className="flex items-center gap-3 px-5 py-4 border-b border-line">
        <PanchitaIcon variant={speaking ? 'avatar' : 'icon'} className="w-8 h-8" />
        <div className="min-w-0">
          <p className="text-[15px] font-display font-semibold text-ink leading-tight">Chef Panchita</p>
          <p className="kick text-muted mt-0.5">ASISTENTE DE VOZ</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onHelp}
            aria-label="Ver comandos de voz"
            title="Comandos de voz"
            className="text-ac hover:opacity-80 transition-opacity cursor-pointer"
          >
            <FAIcon icon="question" />
          </button>
          {headerAction}
        </div>
      </header>

      <div className="px-5 py-5 flex items-center gap-4 border-b border-line">
        <button
          type="button"
          onClick={handleMic}
          disabled={!canListen}
          aria-label={speaking ? 'Interrumpir a Panchita' : mode === 'once' ? 'Dejar de escuchar' : 'Hablar con Panchita'}
          className={`relative shrink-0 w-14 h-14 rounded-full border-2 border-ac flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            listening ? 'mic-pulse bg-ac text-surface' : 'text-ac hover:bg-acsoft'
          }`}
        >
          <FAIcon icon={canListen ? 'microphone' : 'microphone-slash'} size="xl" weight={listening ? 'fill' : 'regular'} className="relative" />
        </button>
        <div className="min-w-0">
          <p className="text-[15px] text-ink font-semibold" aria-live="polite">{statusText({ supported, mode, listening, speaking })}</p>
          <p className="text-[12.5px] text-inkalt mt-1 leading-snug">Ej.: «Panchita, marca la orden 3 como lista»</p>
        </div>
      </div>

      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-line">
        <div className="min-w-0">
          <p className="text-[14px] text-ink font-medium">Escucha continua</p>
          <p className="text-[12px] text-inkalt">Solo atiende lo que empieza con «Panchita»</p>
        </div>
        <Switch checked={continuous} onChange={setContinuous} disabled={!canListen} label="Escucha continua" />
      </div>

      {blockedSpeech && (
        <p className="mx-5 mt-4 rounded-md border border-acline bg-acsoft text-ac text-[12.5px] px-3 py-2 flex gap-2">
          <FAIcon icon="hand-pointer" size="sm" className="mt-0.5 shrink-0" />
          <span>Toca la pantalla para escuchar a Panchita.</span>
        </p>
      )}

      {(error || !canListen) && (
        <p className="mx-5 mt-4 rounded-md border border-warn bg-warnsoft text-warn text-[12.5px] px-3 py-2 flex gap-2">
          <FAIcon icon="triangle-exclamation" size="sm" className="mt-0.5 shrink-0" />
          <span>
            {!canListen
              ? 'Tu navegador no tiene reconocimiento de voz. Usa Google Chrome o Microsoft Edge (con https o en localhost).'
              : continuous
                ? `${error} Toca la pantalla para volver a escuchar.`
                : error}
          </span>
        </p>
      )}

      <ol className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4" aria-label="Últimas conversaciones">
        {log.length === 0 ? (
          <li className="text-[12.5px] text-muted">Aquí verás lo que escuché y lo que respondí.</li>
        ) : (
          log.map((entry) => (
            <li key={entry.id} className="text-[13px] leading-relaxed">
              {entry.heard && (
                <p className="text-inkalt">
                  <FAIcon icon="microphone" size="xs" className="mr-1.5" />
                  «{entry.heard}»
                </p>
              )}
              <p className={`${TONE_CLASS[entry.tone] || 'text-ink'} ${entry.heard ? 'mt-0.5' : ''}`}>{entry.reply}</p>
            </li>
          ))
        )}
      </ol>
    </>
  );
}

export default function ChefPanchitaPanel({ panchita }) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const active = panchita.mode !== 'off';

  return (
    <>
      {/* Pantallas anchas: panel fijo a la derecha del tablero */}
      <aside className="hidden xl:flex w-[340px] shrink-0 flex-col border-l border-line bg-surface min-h-0" aria-label="Chef Panchita">
        <PanchitaConsole panchita={panchita} onHelp={() => setHelpOpen(true)} />
      </aside>

      {/* Tablets y teléfonos: botón flotante que abre el mismo panel */}
      <div className="xl:hidden">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir Chef Panchita"
            title="Chef Panchita"
            className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full border border-ac bg-surface shadow-lg flex items-center justify-center cursor-pointer hover:bg-acsoft transition-colors"
          >
            <PanchitaIcon variant="icon" className="w-9 h-9" />
            {active && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-ac border-2 border-surface" aria-hidden="true" />
            )}
          </button>
        )}
        {open && (
          <section
            className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex flex-col rounded-lg border border-line bg-surface shadow-2xl"
            aria-label="Chef Panchita"
          >
            <PanchitaConsole
              panchita={panchita}
              onHelp={() => setHelpOpen(true)}
              headerAction={
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Minimizar"
                  title="Minimizar (sigue escuchando)"
                  className="text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  <FAIcon icon="chevron-down" />
                </button>
              }
            />
          </section>
        )}
      </div>

      <VoiceHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
