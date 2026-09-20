// Marco de las pantallas del flujo de recuperación de contraseña.
//
// Reutiliza el fondo ilustrado del login (que ya trae su velo y su textura
// dentro del SVG) y coloca encima un panel con el mismo lenguaje del
// rediseño: barra superior con el paso y la ruta, regla de acento, título y
// contenido. Al ser las cuatro pantallas iguales salvo por el interior,
// vivir aquí evita repetir la misma estructura cuatro veces.
import { useTheme } from '../../context/themeContext';

const AuthPanel = ({ step, route, title, description, children }) => {
  const { theme } = useTheme();

  const backgroundSrc = theme === 'dark'
    ? '/backgrounds/login-fondo-v2-oscuro.svg'
    : '/backgrounds/login-fondo-v2-claro.svg';

  return (
    <div className="relative isolate min-h-screen flex items-center justify-center px-4 py-10">
      <img
        src={backgroundSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 w-full h-full object-cover"
      />

      <div className="w-full max-w-[420px] bg-surface border border-line">
        {/* Barra del paso: a la izquierda en qué punto del flujo está, a la
            derecha la ruta, que ayuda a ubicarse si se comparte una captura. */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-line">
          <span className="kick text-inkalt">{step}</span>
          <span className="num text-[11px] text-muted">{route}</span>
        </div>

        <div className="px-6 py-7">
          <div className="w-8 h-0.5 bg-ac mb-4" />
          <h1 className="font-display text-[22px] leading-tight text-ink mb-2">{title}</h1>
          {description && (
            <p className="text-[13px] leading-relaxed text-inkalt mb-6">{description}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthPanel;
