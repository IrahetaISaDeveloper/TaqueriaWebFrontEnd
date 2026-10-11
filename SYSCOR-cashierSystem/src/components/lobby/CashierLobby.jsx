// components/lobby/CashierLobby.jsx
//
// Pantallas de espera de la caja (mismo diseño que el lobby de cocina):
//   - Sin emparejar: el código que un administrador escribe en el panel
//     (Ajustes → Sistema de caja) para habilitarla y abrir el turno.
//   - Emparejada sin turno: "Caja cerrada", esperando a que el admin lo abra.
//   - Emparejada sin conexión: error con "Reintentar".
import { useEffect, useState } from 'react';
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import { useTheme } from '@syscor/web-shared/src/context/themeContext';
import CashierTopBar from '../layout/CashierTopBar';
import useCashierDevice from '../../hooks/useCashierDevice';
import { formatClock } from '../../utils/format';

const useMinuteClock = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

const LobbyClock = () => {
  const now = useMinuteClock();
  return <p className="num text-4xl sm:text-5xl text-ink tracking-tight">{formatClock(now)}</p>;
};

const formatCode = (code) => `${code.slice(0, 3)} ${code.slice(3)}`;

const Waiting = ({ label }) => (
  <div className="mt-8 flex flex-col items-center gap-3" role="status" aria-live="polite">
    <div className="flex gap-2" aria-hidden="true">
      <span className="lobby-dot w-2.5 h-2.5 rounded-full bg-ac" />
      <span className="lobby-dot w-2.5 h-2.5 rounded-full bg-ac" style={{ animationDelay: '0.2s' }} />
      <span className="lobby-dot w-2.5 h-2.5 rounded-full bg-ac" style={{ animationDelay: '0.4s' }} />
    </div>
    <p className="kick text-muted">{label}</p>
  </div>
);

const PairingCode = () => {
  const { pairing, pairingError, isConnected } = useCashierDevice();

  if (pairingError) {
    return (
      <p className="mt-6 inline-flex items-center gap-2 border border-warn bg-warnsoft text-warn px-4 py-3 text-sm">
        <FAIcon icon="triangle-exclamation" size="sm" />
        {pairingError}
      </p>
    );
  }

  if (!isConnected || !pairing) return <Waiting label="CONECTANDO CON EL SERVIDOR…" />;

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

const LobbyFrame = ({ children }) => {
  const { theme } = useTheme();
  return (
    <div className="h-dvh flex flex-col bg-bg">
      <CashierTopBar />
      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl text-center">
          <div className="flex justify-center mb-5">
            <img src={theme === 'dark' ? '/logos/nav-dark-plain.png' : '/logos/nav-light-plain.png'} alt="SYSCOR - Taquería El Corral" draggable={false} className="h-[96px] w-auto object-contain select-none" />
          </div>
          <LobbyClock />
          {children}
        </div>
      </main>
    </div>
  );
};

// Sin emparejar
export function PairingLobby() {
  const { notice, shortId } = useCashierDevice();
  return (
    <LobbyFrame>
      <p className="kick text-ac mt-6 mb-2">SISTEMA DE CAJA · EN ESPERA</p>
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">Esta caja no está habilitada</h1>
      <p className="text-sm sm:text-base text-muted mt-3 leading-relaxed">
        Un administrador debe entrar al panel, ir a <strong className="text-inkalt">Ajustes → Sistema de caja</strong>,
        escribir este código, elegir al cajero y contar el fondo inicial. La caja se abre sola, sin recargar.
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
      <p className="kick text-muted mt-6">CAJA {shortId}</p>
    </LobbyFrame>
  );
}

// Emparejada, pero sin turno abierto (o recién cerrado)
export function ShiftClosedLobby({ onShowLastReport }) {
  const { shortId } = useCashierDevice();
  return (
    <LobbyFrame>
      <p className="kick text-ac mt-6 mb-2">SISTEMA DE CAJA · CERRADA</p>
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">La caja está cerrada</h1>
      <p className="text-sm sm:text-base text-muted mt-3 leading-relaxed">
        Para cobrar, un administrador debe abrir el turno desde{' '}
        <strong className="text-inkalt">Ajustes → Sistema de caja → Abrir turno</strong>, eligiendo al cajero y
        el fondo inicial. Mientras tanto, los meseros cobran las mesas desde su app.
      </p>
      <Waiting label="ESPERANDO QUE SE ABRA EL TURNO…" />
      {onShowLastReport && (
        <button
          type="button"
          onClick={onShowLastReport}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-line text-sm text-inkalt hover:border-ac hover:text-ac transition-colors cursor-pointer"
        >
          <FAIcon icon="receipt" size="sm" />
          Ver el corte del último turno
        </button>
      )}
      <p className="kick text-muted mt-6">CAJA {shortId}</p>
    </LobbyFrame>
  );
}

// Emparejada, pero no se pudo consultar el servidor
export function ConnectionErrorLobby({ error, onRetry }) {
  return (
    <LobbyFrame>
      <p className="kick text-ac mt-6 mb-2">SISTEMA DE CAJA</p>
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">No se pudo conectar con la caja</h1>
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
    </LobbyFrame>
  );
}
