// src/components/dashboard/NavMenu.jsx
//
// Navegación principal del rediseño: cuatro entradas directas en la barra
// superior en lugar de la barra lateral. Una barra horizontal no aguanta las
// 14 rutas del sistema, así que se agrupan en secciones y cada sección tiene
// su propio sub navbar de pestañas dentro de la pantalla (ver PageShell).
// Ninguna entrada se despliega: todas llevan a la primera pestaña que el
// usuario tiene permitida y se marcan activas en cualquiera de sus pestañas.
//
// El mapa de rutas y sus permisos es el mismo que tenía el Sidebar; aquí solo
// cambia la forma de presentarlo. Un empleado sin cierto permiso no ve esa
// pestaña, y si una sección se queda sin pestañas visibles, desaparece.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@syscor/web-shared/src/hooks/useAuth';
import { hasPermission } from '../../constants/permissions';
import { OPERATIONS_TABS, ADMIN_TABS } from '../../hooks/useSectionTabs';

const NAV = [
  {
    id: 'activity',
    label: 'Actividad',
    items: [{ path: '/dashboard' }],
  },
  {
    id: 'menu',
    label: 'Menú',
    items: [
      { path: '/dishes', permission: 'dishes' },
      { path: '/drinks', permission: 'drinks' },
      { path: '/drink-sets', permission: 'drink_sets' },
      { path: '/combos', permission: 'combos' },
      { path: '/extras', permission: 'extras' },
      { path: '/recetas', permission: 'recipes' },
      { path: '/promociones', permission: 'promotions' },
    ],
  },
  {
    id: 'operations',
    label: 'Operaciones',
    items: OPERATIONS_TABS,
  },
  {
    id: 'admin',
    label: 'Administración',
    items: ADMIN_TABS,
  },
];

const ACTIVE_STYLE = {
  color: 'var(--color-ink)',
  borderBottomColor: 'var(--color-ac)',
  fontWeight: 500,
};

const NavMenu = () => {
  const { user } = useAuth();
  const location = useLocation();
  const current = location.pathname.toLowerCase();

  const categories = NAV
    .map((cat) => {
      const items = cat.items.filter((i) => !i.permission || hasPermission(user, i.permission));
      if (items.length === 0) return null;
      // Las rutas se comparan sin el query string.
      const matchPaths = items.map((i) => i.path.split('?')[0].toLowerCase());
      return { id: cat.id, label: cat.label, path: items[0].path, matchPaths };
    })
    .filter(Boolean);

  return (
    <nav className="hidden lg:flex items-center gap-8 xl:gap-11 ml-4 xl:ml-8">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          to={cat.path}
          className="navlink"
          style={cat.matchPaths.includes(current) ? ACTIVE_STYLE : undefined}
        >
          {cat.label}
        </Link>
      ))}
    </nav>
  );
};

export default NavMenu;
