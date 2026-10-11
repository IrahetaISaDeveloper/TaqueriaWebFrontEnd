// components/kitchen/KitchenLobby.jsx
//
// Lobby de la pantalla de cocina. Mientras no esté emparejada muestra el
// código que un administrador debe escribir en el panel (Ajustes → Sistema
// de cocina → Habilitar). No pide nada al servidor cada cierto tiempo ni
// consulta comandas: cuando el admin escribe el código, el token llega por
// socket y la pantalla pasa sola al tablero.
//
// También se muestra, con error y "Reintentar", si ya está emparejada pero
// no se pudo consultar el sistema (ej. sin red).
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { useTheme } from '@syscor/web-shared/src/context/themeContext';
import KitchenTopBar from './KitchenTopBar';
import useKitchenDevice from '../../hooks/useKitchenDevice';
import { useClockMinute } from '../../hooks/useKitchenClock';
import { formatClock } from '../../utils/timeFormat';

// Reloj grande: una pantalla de cocina en espera al menos da la hora. Se
// actualiza una vez por minuto con el mismo reloj único de los tickets.
const LobbyClock = () => {
  const minute = useClockMinute();
  return <p className="num text-4xl sm:text-5xl text-ink tracking-tight">{formatClock(minute * 60000)}</p>;
};

// "482913" -> "482 913", más fácil de leer en voz alta y de copiar
const formatCode = (code) => `${code.slice(0, 3)} ${code.slice(3)}`;

const PairingCode = () => {
  const { pairing, pairingError, isConnected } = useKitchenDevice();

  if (pairingError) {
    return (
      <p className="mt-6 inline-flex items-center gap-2 border border-warn bg-warnsoft text-warn px-4 py-3 text-sm">
        <FAIcon icon="triangle-exclamation" size="sm" />
        {pairingError}
      </p>
    );
  }

  if (!isConnected || !pairing) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3" role="status" aria-live="polite">
        <div className="flex gap-2" aria-hidden="true">
          <span className="lobby-dot w-2.5 h-2.5 rounded-full bg-ac" />
          <span className="lobby-dot w-2.5 h-2.5 rounded-full bg-ac" style={{ animationDelay: '0.2s' }} />
          <span className="lobby-dot w-2.5 h-2.5 rounded-full bg-ac" style={{ animationDelay: '0.4s' }} />
        </div>
        <p className="kick text-muted">CONECTANDO CON EL SERVIDOR…</p>
      </div>
    );
  }

  return (
    <div className="mt-7 inline-flex flex-col items-center border border-line bg-surface px-8 py-5 border-t-2 border-t-ac">
      <p className="kick text-muted mb-2">CÓDIGO DE EMPAREJAMIENTO</p>
      <p className="num text-5xl sm:text-6xl font-semibold text-ink tracking-[0.12em]" aria-label={`Código ${pairing.code.split('').join(' ')}`}>
        {formatCode(pairing.code)}
      </p>
      <p className="text-[12px] text-muted mt-2">
        Cambia solo a las <span className="num">{formatClock(pairing.expiresAt)}</span>
      </p>
    </div>
  );
};

export default function KitchenLobby({ error, onRetry }) {
  const { isPaired, notice, shortId } = useKitchenDevice();
  const { theme } = useTheme();

  return (
    <div className="h-dvh flex flex-col bg-bg">
      <KitchenTopBar />

      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl text-center">
          <div className="flex justify-center mb-5">
            <img src={theme === 'dark' ? '/logos/nav-dark-plain.png' : '/logos/nav-light-plain.png'} alt="SYSCOR - Taquería El Corral" draggable={false} className="h-[96px] w-auto object-contain select-none" />
          </div>

          <LobbyClock />

          {isPaired ? (
            <>
              <p className="kick text-ac mt-6 mb-2">SISTEMA DE COCINA</p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">No se pudo conectar con la cocina</h1>
              <div className="mt-6 inline-flex flex-col items-center gap-3 border border-warn bg-warnsoft text-warn px-5 py-4">
                <p className="text-sm flex items-center gap-2">
                  <FAIcon icon="triangle-exclamation" size="sm" />
                  {error || 'Revisa la conexión a internet.'}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-warn text-sm font-medium hover:bg-warn hover:text-white transition-colors cursor-pointer"
                >
                  <FAIcon icon="rotate-right" size="sm" />
                  Reintentar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="kick text-ac mt-6 mb-2">SISTEMA DE COCINA · EN ESPERA</p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">Esta pantalla no está habilitada</h1>
              <p className="text-sm sm:text-base text-muted mt-3 leading-relaxed">
                Un administrador debe entrar al panel, ir a{' '}
                <strong className="text-inkalt">Ajustes → Sistema de cocina</strong>, activar{' '}
                <strong className="text-inkalt">Habilitar</strong> y escribir este código. La pantalla
                mostrará las comandas sola, sin recargar.
              </p>

              {notice && (
                <p className="mt-5 inline-flex items-center gap-2 border border-line bg-surfalt px-3 py-2 text-[13px] text-inkalt">
                  <FAIcon icon="circle-info" size="sm" className="text-ac" />
                  {notice}
                </p>
              )}

              <div>
                <PairingCode />
              </div>

              <p className="kick text-muted mt-6">PANTALLA {shortId}</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
