// components/layout/CashierTopBar.jsx
//
// Barra superior de la caja, la misma en el lobby y en el punto de venta:
// logo, contadores (`children`), conexión en tiempo real, tema y quién cobra
// en este turno. No hay "cerrar sesión": el turno lo cierra el cajero con el
// arqueo, y la caja solo la desvincula un administrador.
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import ThemeToggle from '@syscor/web-shared/src/components/ThemeToggle';
import { useTheme } from '@syscor/web-shared/src/context/themeContext';
import { useSocket } from '@syscor/web-shared/src/hooks/useSocket';
import useCashierDevice from '../../hooks/useCashierDevice';

const ConnectionStatus = () => {
  const { isConnected } = useSocket();
  return (
    <span
      className={`kick inline-flex items-center gap-1.5 shrink-0 ${isConnected ? 'text-inkalt' : 'text-warn'}`}
      title={isConnected ? 'Conectado en tiempo real' : 'Sin conexión en tiempo real: reintentando'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-ac' : 'bg-warn animate-pulse'}`} />
      {/* En el teléfono basta el punto */}
      <span className="sr-only sm:not-sr-only">{isConnected ? 'EN VIVO' : 'RECONECTANDO'}</span>
    </span>
  );
};

// Acción del turno en la barra: enlace con ícono, o botón con borde si es la
// importante (cerrar caja)
export const TopBarAction = ({ icon, label, onClick, outlined = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={outlined
      ? 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-linealt text-[14px] font-medium text-ink hover:border-ac hover:text-ac transition-colors cursor-pointer'
      : 'inline-flex items-center gap-1.5 text-[14px] text-ac hover:opacity-80 transition-opacity cursor-pointer'}
  >
    <FAIcon icon={icon} size="sm" />
    {label}
  </button>
);

// Contador del encabezado: cifra grande y rótulo en versalitas, sin caja
export const TopBarCounter = ({ value, label }) => (
  <span className="inline-flex items-baseline gap-2 shrink-0">
    <span className="num text-xl sm:text-2xl font-semibold text-ink leading-none">{value}</span>
    <span className="kick text-inkalt">{label}</span>
  </span>
);

export default function CashierTopBar({ children, session, actions }) {
  const { theme, toggleTheme } = useTheme();
  const { shortId, isPaired } = useCashierDevice();

  return (
    <header className="shrink-0 border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-10 gap-y-3 px-4 sm:px-7 py-3 sm:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src={theme === 'dark' ? '/logos/nav-dark-plain.png' : '/logos/nav-light-plain.png'} alt="SYSCOR - Taquería El Corral" draggable={false} className="h-[30px] sm:h-[36px] w-auto object-contain select-none" />
          <div className="min-w-0">
            <p className="kick text-ac leading-none">SISTEMA DE CAJA</p>
            <p className="font-display font-semibold text-ink text-lg leading-tight mt-1">Punto de venta</p>
          </div>
        </div>

        {children && (
          <div className="order-3 basis-full xl:order-none xl:basis-auto xl:flex-1 min-w-0 flex flex-wrap items-center gap-x-5 sm:gap-x-8 gap-y-1.5">
            {children}
          </div>
        )}

        <div className="order-2 xl:order-none ml-auto flex items-center gap-3 sm:gap-5 shrink-0">
          {actions}
          <ConnectionStatus />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          {session ? (
            <div className="hidden md:flex items-center gap-2.5" title={`Turno ${session.code}`}>
              <span className="w-9 h-9 rounded-full border border-linealt text-inkalt flex items-center justify-center">
                <FAIcon icon="user" size="sm" />
              </span>
              <div className="leading-tight">
                <p className="text-[13px] text-ink font-medium">{session.cashier?.name}</p>
                <p className="kick text-muted num">{session.code}</p>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2" title="Identificador de esta caja">
              <FAIcon icon={isPaired ? 'shield-halved' : 'lock'} className={isPaired ? 'text-ac' : 'text-muted'} />
              <div className="leading-tight">
                <p className="num text-[13px] text-ink">{shortId}</p>
                <p className="kick text-muted">{isPaired ? 'EMPAREJADA' : 'SIN EMPAREJAR'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
