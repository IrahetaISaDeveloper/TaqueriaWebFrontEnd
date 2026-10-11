// src/components/commons/PageShell.jsx
//
// Esqueleto común de todas las pantallas del panel: barra superior, un
// encabezado a todo lo ancho (título, subtítulo y acciones a la derecha) y,
// debajo, la fila de pestañas de la sección. Nació como el esqueleto de
// "Menú" (ver MenuPageShell) y se generalizó para que Actividad, Operaciones
// y Administración se vean exactamente igual: mismo fondo, misma tipografía
// en las pestañas y sin tarjetas flotando sobre un fondo gris.
//
// tabs: [{ key, label, to?, onClick?, active }]
//   - con "to" la pestaña es un enlace (cambia de ruta)
//   - con "onClick" solo cambia una vista dentro de la misma pantalla
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';

// Botón principal del encabezado: contorno en el color de acento, no un
// bloque sólido. Es el mismo en todas las secciones.
export const PRIMARY_BUTTON =
  'inline-flex items-center gap-2 px-4 py-2 border border-ac text-ac bg-surface text-[13px] font-medium ' +
  'hover:bg-ac hover:text-white transition-colors disabled:opacity-60 cursor-pointer';

const tabClass = (active) =>
  `kick whitespace-nowrap py-3 border-b-2 transition-colors cursor-pointer ${
    active ? 'border-ac text-ink' : 'border-transparent text-muted hover:text-ink'
  }`;

const PageShell = ({
  activeMenu,
  title,
  subtitle,
  actions,
  tabs = [],
  tabsLabel = 'Secciones',
  children,
  modals,
  bodyClassName = 'px-4 sm:px-6 lg:px-8 py-6 sm:py-7',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // h-dvh: el alto que de verdad se ve. En el celular, h-screen (100vh)
  // incluye la zona que tapa la barra del navegador y el final de la página
  // quedaba fuera de alcance.
  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-surface">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* min-h-0: sin él el hijo flex no se encoge y no hay scroll */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-surface">
          <header className={`px-4 sm:px-6 lg:px-8 pt-6 sm:pt-7 border-b border-line ${tabs.length ? '' : 'pb-6'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-[28px] font-display font-bold text-ink leading-tight">{title}</h1>
                {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
            </div>

            {tabs.length > 0 && (
              <nav className="mt-5 flex gap-5 sm:gap-7 overflow-x-auto -mb-px" aria-label={tabsLabel}>
                {tabs.map((tab) =>
                  tab.to ? (
                    <Link
                      key={tab.key || tab.to}
                      to={tab.to}
                      aria-current={tab.active ? 'page' : undefined}
                      className={tabClass(tab.active)}
                    >
                      {tab.label}
                    </Link>
                  ) : (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={tab.onClick}
                      aria-pressed={tab.active}
                      className={`${tabClass(tab.active)} bg-transparent`}
                    >
                      {tab.label}
                    </button>
                  )
                )}
              </nav>
            )}
          </header>

          <div className={bodyClassName}>{children}</div>
        </main>
      </div>

      {modals}
    </div>
  );
};

export default PageShell;
