// components/kitchen/KitchenTopBar.jsx
//
// Barra superior de la pantalla de cocina, la misma en el lobby y en el
// tablero: logo, contadores (`children`), conexión en tiempo real, tema e
// identidad de esta pantalla. No hay usuario ni "cerrar sesión": la pantalla
// es un dispositivo y solo un administrador la desvincula desde el panel.
import FAIcon from '@syscor/web-shared/src/components/FAIcon';
import ThemeToggle from '@syscor/web-shared/src/components/ThemeToggle';
import { useTheme } from '@syscor/web-shared/src/context/themeContext';
import { useSocket } from '@syscor/web-shared/src/hooks/useSocket';
import useKitchenDevice from '../../hooks/useKitchenDevice';

// Si el socket se cae, la cocina tiene que saberlo: mientras tanto no le
// llegan comandas nuevas solas.
const ConnectionStatus = () => {
  const { isConnected } = useSocket();
  return (
    <span
      className={`kick inline-flex items-center gap-1.5 shrink-0 ${isConnected ? 'text-inkalt' : 'text-warn'}`}
      title={isConnected ? 'Conectado en tiempo real' : 'Sin conexión en tiempo real: reintentando'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-ac' : 'bg-warn animate-pulse'}`} />
      {/* En el teléfono basta el punto (el texto queda para lectores de pantalla) */}
      <span className="sr-only sm:not-sr-only">{isConnected ? 'EN VIVO' : 'RECONECTANDO'}</span>
    </span>
  );
};

// Contador del encabezado: cifra grande y rótulo en versalitas, sin caja
export const TopBarCounter = ({ value, label }) => (
  <span className="inline-flex items-baseline gap-2 shrink-0">
    <span className="num text-2xl font-semibold text-ink leading-none">{value}</span>
    <span className="kick text-inkalt">{label}</span>
  </span>
);

export default function KitchenTopBar({ children }) {
  const { theme, toggleTheme } = useTheme();
  const { shortId, isPaired } = useKitchenDevice();

  return (
    <header className="shrink-0 border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-10 gap-y-3 px-4 sm:px-7 py-3 sm:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src={theme === 'dark' ? '/logos/nav-dark-plain.png' : '/logos/nav-light-plain.png'} alt="SYSCOR - Taquería El Corral" draggable={false} className="h-[30px] sm:h-[36px] w-auto object-contain select-none" />
          <div className="min-w-0">
            <p className="kick text-ac leading-none">SISTEMA DE COCINA</p>
            <p className="font-display font-semibold text-ink text-lg leading-tight mt-1">Comandas</p>
          </div>
        </div>

        {/* En pantallas chicas los contadores bajan a su propia fila */}
        {children && (
          <div className="order-3 basis-full lg:order-none lg:basis-auto lg:flex-1 min-w-0 flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-2">
            {children}
          </div>
        )}

        <div className="order-2 lg:order-none ml-auto flex items-center gap-3 sm:gap-5 shrink-0">
          <ConnectionStatus />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <div className="hidden md:flex items-center gap-2" title="Identificador de esta pantalla">
            <FAIcon icon={isPaired ? 'shield-halved' : 'lock'} className={isPaired ? 'text-ac' : 'text-muted'} />
            <div className="leading-tight">
              <p className="num text-[13px] text-ink">{shortId}</p>
              <p className="kick text-muted">{isPaired ? 'EMPAREJADA' : 'SIN EMPAREJAR'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
