// src/components/menu/MenuPageShell.jsx
//
// Esqueleto común de las pantallas del catálogo (Platillos, Bebidas,
// Conjuntos de bebidas, Combos, Promociones...). Todas comparten el mismo
// encabezado "Menú" con sus acciones a la derecha y una fila de pestañas que
// salta entre secciones, así que se ven como una sola pantalla con varias
// vistas en vez de cinco pantallas sueltas.
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import { useAuth } from '../../hooks/auth/useAuth';
import { hasPermission } from '../../constants/permissions';

// Mismas rutas y permisos que el desplegable "Menú" de NavMenu.
const MENU_TABS = [
  { label: 'Platillos', path: '/dishes', permission: 'dishes' },
  { label: 'Bebidas', path: '/drinks', permission: 'drinks' },
  { label: 'Conjuntos de bebidas', path: '/drink-sets', permission: 'drink_sets' },
  { label: 'Combos', path: '/combos', permission: 'combos' },
  { label: 'Extras', path: '/extras', permission: 'extras' },
  { label: 'Recetas', path: '/recetas', permission: 'recipes' },
  { label: 'Promociones', path: '/promociones', permission: 'promotions' },
];

// Botón principal del encabezado: contorno en el color de acento, no un
// bloque sólido, igual que en el resto del rediseño.
export const MENU_PRIMARY_BUTTON =
  'inline-flex items-center gap-2 px-4 py-2 border border-ac text-ac bg-surface text-[13px] font-medium ' +
  'hover:bg-ac hover:text-white transition-colors disabled:opacity-60 cursor-pointer';

const MenuPageShell = ({ activeMenu, subtitle, actions, children, modals }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const tabs = MENU_TABS.filter((t) => hasPermission(user, t.permission));
  const current = location.pathname.toLowerCase();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* min-h-0: sin él el hijo flex no se encoge y no hay scroll */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-surface">
          <header className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-7 border-b border-line">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-[28px] font-display font-bold text-ink leading-tight">Menú</h1>
                {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
            </div>

            <nav className="mt-5 flex gap-5 sm:gap-7 overflow-x-auto -mb-px" aria-label="Secciones del menú">
              {tabs.map((tab) => {
                const active = current === tab.path.toLowerCase();
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    aria-current={active ? 'page' : undefined}
                    className={`kick whitespace-nowrap py-3 border-b-2 transition-colors ${
                      active ? 'border-ac text-ink' : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-7">{children}</div>
        </main>
      </div>

      {modals}
    </div>
  );
};

export default MenuPageShell;
