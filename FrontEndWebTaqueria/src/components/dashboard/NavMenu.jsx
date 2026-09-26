// src/components/dashboard/NavMenu.jsx
//
// Navegación principal del rediseño: cuatro entradas en la barra superior en
// lugar de la barra lateral. Una barra horizontal no aguanta las 14 rutas del
// sistema, así que se agrupan: "Actividad", "Menú" y "Administración" son
// entradas directas (sus secciones viven en pestañas dentro de cada
// pantalla) y "Operaciones" se despliega.
//
// El mapa de rutas y sus permisos es el mismo que tenía el Sidebar; aquí solo
// cambia la forma de presentarlo. Un empleado sin cierto permiso no ve esa
// entrada, y si una categoría se queda sin entradas visibles, desaparece.
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FAIcon from '../commons/FAIcon';
import { useAuth } from '../../hooks/auth/useAuth';
import { hasPermission } from '../../constants/permissions';

// Cada entrada lleva su descripción porque el menú desplegado la muestra:
// ayuda a distinguir "Pedidos y Órdenes" de "Mesas" sin tener que entrar.
const NAV = [
  {
    id: 'activity',
    label: 'Actividad',
    path: '/dashboard', // entrada directa, sin desplegable
  },
  {
    // Entrada directa: las secciones (Platillos, Bebidas...) ya están en las
    // pestañas de MenuPageShell, así que aquí no se despliegan. Lleva a la
    // primera sección permitida y se marca activa en cualquiera de ellas.
    id: 'menu',
    label: 'Menú',
    direct: true,
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
    items: [
      { label: 'Pedidos y Órdenes', path: '/pedidos', icon: 'list', desc: 'Cocina, facturación y programados', permission: 'orders' },
      { label: 'Mesas', path: '/mesas', icon: 'chair', desc: 'Plano del salón y estado de cada mesa', permission: 'tables' },
      { label: 'Inventario', path: '/inventario', icon: 'box', desc: 'Productos y activos fijos', permission: 'inventory' },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    path: '/employees',
  },
];

const ADMIN_PATHS = ['/employees', '/invitestaff', '/payroll', '/clients', '/reports'];
const ADMIN_PERMISSIONS = ['employees', 'invite_staff', 'payroll', 'clients', 'reports'];

const getAdminPath = (user) => {
  if (hasPermission(user, 'employees')) return '/employees';
  if (hasPermission(user, 'clients')) return '/clients';
  if (hasPermission(user, 'reports')) return '/reports';
  if (hasPermission(user, 'payroll')) return '/payroll';
  if (hasPermission(user, 'invite_staff')) return '/InviteStaff';
  return '/employees';
};

const NavMenu = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [openId, setOpenId] = useState(null);
  const navRef = useRef(null);

  // Un clic fuera cierra el desplegable abierto; Escape hace lo mismo desde
  // el teclado, para no dejar el menú atrapado si no se usa el ratón.
  useEffect(() => {
    const onPointerDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenId(null);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // El menú se cierra al elegir un destino (el onClick de cada enlace, más
  // abajo), no observando la ruta: navegar es la única forma de salir de
  // aquí, así que no hace falta un efecto que vigile location.

  const categories = NAV
    .map((cat) => {
      if (cat.id === 'admin') {
        const canAccessAdmin = ADMIN_PERMISSIONS.some((p) => hasPermission(user, p));
        if (!canAccessAdmin) return null;
        return {
          ...cat,
          path: getAdminPath(user),
        };
      }
      if (cat.items) {
        const items = cat.items.filter((i) => !i.permission || hasPermission(user, i.permission));
        if (cat.direct) {
          if (items.length === 0) return null;
          return { id: cat.id, label: cat.label, path: items[0].path, matchPaths: items.map((i) => i.path) };
        }
        return { ...cat, items };
      }
      return cat;
    })
    .filter((cat) => cat && (!cat.items || cat.items.length > 0));

  // Una categoría se marca como activa cuando la ruta actual es una de las
  // suyas, para que la línea roja indique dónde está parado el usuario.
  const isActive = (cat) => {
    if (cat.id === 'admin') {
      const current = location.pathname.toLowerCase();
      return ADMIN_PATHS.some((p) => current === p.toLowerCase() || current.startsWith(`${p.toLowerCase()}/`));
    }
    if (cat.matchPaths) {
      const current = location.pathname.toLowerCase();
      return cat.matchPaths.some((p) => current === p.toLowerCase());
    }
    return cat.path
      ? location.pathname.toLowerCase() === cat.path.toLowerCase()
      : cat.items.some((i) => location.pathname.toLowerCase() === i.path.toLowerCase());
  };

  const ACTIVE_STYLE = {
    color: 'var(--color-ink)',
    borderBottomColor: 'var(--color-ac)',
    fontWeight: 500,
  };

  return (
    <nav ref={navRef} className="hidden lg:flex items-center gap-5 relative">
      {categories.map((cat) => {
        const active = isActive(cat);

        if (cat.path) {
          return (
            <Link
              key={cat.id}
              to={cat.path}
              className="navlink"
              style={active ? ACTIVE_STYLE : undefined}
            >
              {cat.label}
            </Link>
          );
        }

        const open = openId === cat.id;
        return (
          <div key={cat.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : cat.id)}
              aria-expanded={open}
              aria-haspopup="true"
              className="navlink flex items-center gap-1.5 cursor-pointer bg-transparent border-0 border-b-2"
              style={active || open ? ACTIVE_STYLE : undefined}
            >
              {cat.label}
              <FAIcon icon={open ? 'chevron-up' : 'chevron-down'} size="xs" />
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-px w-[330px] bg-surface border border-line shadow-lg z-50">
                {cat.items.map((item, idx) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpenId(null)}
                    className={`flex gap-3 px-4 py-3 hover:bg-surfalt transition-colors ${
                      idx < cat.items.length - 1 ? 'border-b border-line' : ''
                    }`}
                  >
                    <FAIcon
                      icon={item.icon}
                      size="sm"
                      className={`mt-0.5 shrink-0 ${
                        location.pathname.toLowerCase() === item.path.toLowerCase() ? 'text-ac' : 'text-muted'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink m-0">{item.label}</p>
                      <p className="text-[11.5px] text-muted mt-0.5 m-0">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default NavMenu;
