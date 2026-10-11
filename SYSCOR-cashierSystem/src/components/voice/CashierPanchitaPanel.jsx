// components/voice/CashierPanchitaPanel.jsx
//
// Chef Panchita en la caja: botón flotante que abre una conversación. Se le
// habla con el micrófono (una frase, o escucha continua con «Panchita…») o
// se le escribe, y ella contesta en voz alta y por escrito. Sus avisos
// (algo quedó listo para cobrar o entregar) aparecen aquí aunque esté cerrado.
import { useEffect, useRef, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import PanchitaIcon from '@syscor/web-shared/src/components/PanchitaIcon';
import { SUGGESTIONS, HELP_TEXT } from '../../hooks/useCashierPanchita';
import { formatClock } from '../../utils/format';

const TONE_CLASS = { ok: 'text-ink', warn: 'text-warn', error: 'text-ac' };

const statusText = ({ supported, mode, listening, speaking }) => {
  if (!supported.recognition) return 'Este navegador no reconoce voz: escríbeme abajo';
  if (speaking) return mode === 'continuous' ? 'Hablando… di «ya» para interrumpir' : 'Hablando…';
  if (mode === 'once') return listening ? 'Te escucho…' : 'Preparando micrófono…';
  if (mode === 'continuous' && listening) return 'Escuchando: di «Panchita…»';
  return 'Toca el micrófono y habla';
};

const Switch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-ac' : 'bg-line'}`}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transition ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

/**
 * @param {boolean} raised   sube el botón (en el teléfono, sobre la barra "Ver venta")
 * @param {boolean} compact  hay un cobro abierto: Panchita se muestra como una
 *   barra arriba, encima del cobro, con su última respuesta y el micrófono
 */
export default function CashierPanchitaPanel({ panchita, raised = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [seen, setSeen] = useState(0);
  // Último aviso que se asoma junto al botón: se oculta solo al minuto
  const [expiredId, setExpiredId] = useState(null);
  const listRef = useRef(null);
  const { supported, mode, listening, speaking, error, blockedSpeech, log, continuous, setContinuous, announcements, setAnnouncements, startListening, stopListening, submitText } = panchita;
  const canListen = supported.recognition;
  const active = mode !== 'off';
  const unread = open ? 0 : log.filter((entry) => entry.from === 'panchita').length - seen;

  // La conversación siempre muestra lo último
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, log]);

  const openPanel = () => {
    setOpen(true);
    setSeen(log.filter((entry) => entry.from === 'panchita').length);
  };
  const closePanel = () => {
    setSeen(log.filter((entry) => entry.from === 'panchita').length);
    setOpen(false);
  };

  const handleMic = () => {
    if (mode === 'once') stopListening();
    else startListening('once');
  };

  const send = (text) => {
    const clean = text.trim();
    if (!clean) return;
    setDraft('');
    submitText(clean);
  };

  const lastNotice = [...log].reverse().find((entry) => entry.notice);
  const lastReply = [...log].reverse().find((entry) => entry.from === 'panchita');
  const lastNoticeId = lastNotice?.id ?? null;
  useEffect(() => {
    if (lastNoticeId == null) return undefined;
    const timer = setTimeout(() => setExpiredId(lastNoticeId), 60000);
    return () => clearTimeout(timer);
  }, [lastNoticeId]);

  // Con un cobro abierto: barra compacta arriba, para hablarle mientras se cobra
  if (compact) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[min(640px,calc(100vw-1.5rem))] flex items-center gap-3 rounded-full border border-acline bg-surface pl-1.5 pr-4 py-1.5 shadow-lg" role="status" aria-live="polite">
        <button
          type="button"
          onClick={handleMic}
          disabled={!canListen}
          aria-label={mode === 'once' ? 'Dejar de escuchar' : 'Hablar con Chef Panchita'}
          className={`shrink-0 w-10 h-10 rounded-full border-2 border-ac flex items-center justify-center cursor-pointer disabled:opacity-40 ${listening ? 'bg-ac text-white' : 'text-ac hover:bg-acsoft'}`}
        >
          <FAIcon icon={canListen ? 'microphone' : 'microphone-slash'} weight={listening ? 'fill' : 'regular'} />
        </button>
        <PanchitaIcon variant={speaking ? 'avatar' : 'icon'} className="w-7 h-7 shrink-0" />
        <p className="min-w-0 text-[13px] text-ink leading-snug line-clamp-2">
          {listening
            ? 'Te escucho… di, por ejemplo: «paga con 20» o «confirma el cobro».'
            : lastReply?.text || 'Dime cómo paga: «paga con 20», «con tarjeta», «crédito fiscal»…'}
        </p>
      </div>
    );
  }

  return (
    <>
      {!open && (
        <div className={`fixed right-4 z-40 flex flex-col items-end gap-2 ${raised ? 'bottom-24 lg:bottom-4' : 'bottom-4'}`}>
          {/* El último aviso se asoma junto al botón un momento */}
          {lastNotice && unread > 0 && expiredId !== lastNotice.id && (
            <button
              type="button"
              onClick={openPanel}
              className="max-w-[min(320px,calc(100vw-6rem))] text-left rounded-lg border border-acline bg-surface px-3.5 py-2.5 text-[13px] text-ink shadow-lg cursor-pointer"
            >
              <span className="kick text-ac block mb-0.5">CHEF PANCHITA</span>
              {lastNotice.text}
            </button>
          )}
          <button
            type="button"
            onClick={openPanel}
            aria-label="Abrir Chef Panchita"
            title="Chef Panchita"
            className="relative w-14 h-14 rounded-full border border-ac bg-surface shadow-lg flex items-center justify-center cursor-pointer hover:bg-acsoft transition-colors"
          >
            <PanchitaIcon variant={speaking ? 'avatar' : 'icon'} className="w-9 h-9" />
            {(active || unread > 0) && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full border-2 border-surface text-[10px] font-bold text-white flex items-center justify-center ${unread > 0 ? 'bg-ac' : 'bg-ok'}`}>
                {unread > 0 ? unread : ''}
              </span>
            )}
          </button>
        </div>
      )}

      {open && (
        <section
          className="fixed bottom-4 right-4 z-40 w-[min(390px,calc(100vw-2rem))] h-[min(620px,calc(100dvh-2rem))] flex flex-col rounded-lg border border-line bg-surface shadow-2xl"
          aria-label="Chef Panchita"
        >
          <header className="flex items-center gap-3 px-4 py-3 border-b border-line">
            <PanchitaIcon variant={speaking ? 'avatar' : 'icon'} className="w-8 h-8" />
            <div className="min-w-0">
              <p className="text-[15px] font-display font-semibold text-ink leading-tight">Chef Panchita</p>
              <p className="kick text-muted mt-0.5">ASISTENTE DE CAJA</p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Minimizar"
              title="Minimizar (sigue avisando)"
              className="ml-auto w-8 h-8 rounded-md text-muted hover:text-ink hover:bg-surfalt flex items-center justify-center cursor-pointer"
            >
              <FAIcon icon="chevron-down" />
            </button>
          </header>

          {/* Micrófono y estado */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-line">
            <button
              type="button"
              onClick={handleMic}
              disabled={!canListen}
              aria-label={mode === 'once' ? 'Dejar de escuchar' : 'Hablar con Chef Panchita'}
              className={`relative shrink-0 w-12 h-12 rounded-full border-2 border-ac flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                listening ? 'bg-ac text-white' : 'text-ac hover:bg-acsoft'
              }`}
            >
              <FAIcon icon={canListen ? 'microphone' : 'microphone-slash'} size="lg" weight={listening ? 'fill' : 'regular'} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] text-ink font-medium" aria-live="polite">{statusText({ supported, mode, listening, speaking })}</p>
              <div className="flex items-center gap-4 mt-1.5">
                <label className="inline-flex items-center gap-1.5 text-[11.5px] text-inkalt">
                  <Switch checked={continuous} onChange={setContinuous} disabled={!canListen} label="Escucha continua" />
                  Escucha continua
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11.5px] text-inkalt">
                  <Switch checked={announcements} onChange={setAnnouncements} label="Hablar en voz alta" />
                  Voz
                </label>
              </div>
            </div>
          </div>

          {(error || blockedSpeech) && (
            <p className="mx-4 mt-3 rounded-md border border-warn bg-warnsoft text-warn text-[12px] px-3 py-2">
              {blockedSpeech ? 'Toca la pantalla para que pueda hablar en voz alta.' : error}
            </p>
          )}

          {/* Conversación */}
          <ol ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5" aria-label="Conversación con Chef Panchita">
            {log.length === 0 ? (
              <li className="text-[12.5px] text-muted leading-relaxed">
                {HELP_TEXT}
              </li>
            ) : (
              log.map((entry) => (
                <li key={entry.id} className={`flex ${entry.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-snug ${
                      entry.from === 'user'
                        ? 'bg-ac text-white'
                        : entry.notice
                          ? 'bg-acsoft border border-acline'
                          : 'bg-surfalt border border-line'
                    }`}
                  >
                    {entry.notice && <span className="kick text-ac block mb-0.5">AVISO · {formatClock(entry.at)}</span>}
                    <span className={entry.from === 'user' ? '' : TONE_CLASS[entry.tone] || 'text-ink'}>{entry.text}</span>
                  </div>
                </li>
              ))
            )}
          </ol>

          {/* Atajos y texto */}
          <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full border border-line text-[12px] text-inkalt hover:border-ac hover:text-ac cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="p-3 flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escríbele a Panchita…"
              aria-label="Mensaje para Chef Panchita"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-line bg-surface text-[13.5px] text-ink placeholder:text-muted focus:outline-none focus:border-ac"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Enviar"
              className="w-10 h-10 rounded-lg bg-ac text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              <FAIcon icon="paper-plane" size="sm" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
