// src/components/dashboard/Sidebar.jsx
//
// Cajón de navegación para móvil. En escritorio no se muestra: el rediseño
// movió la navegación a la barra superior (NavMenu).
import React from 'react';
import { Link } from 'react-router-dom';
import FAIcon from '../commons/FAIcon';
import { useTheme } from '../../context/themeContext';
import { useAuth } from '../../hooks/auth/useAuth';
import { hasPermission } from '../../constants/permissions';

const Sidebar = ({ activeMenu, isOpen, onClose }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  // Dentro del sistema el logo es el PNG plano, sin la animación del chile
  // (esa solo aplica en las pantallas de login, ver components/commons/Logo.jsx)
  const logoSrc = theme === 'dark' ? '/logos/nav-dark-plain.png' : '/logos/nav-light-plain.png';

  // Agrupamos los items por categorías para un mejor orden visual. "Actividad"
  // no lleva `permission`: es la pantalla de aterrizaje, siempre visible para
  // cualquiera con sesión (ver App.jsx, /dashboard no exige permiso).
  const menuCategories = [
    {
      title: 'Principal',
      items: [
        { id: 'activity', label: 'Actividad', icon: 'chart-line', path: '/dashboard' },
      ],
    },
    {
      title: 'Menú',
      items: [
        { id: 'combos', label: 'Combos', icon: 'shopping-bag', path: '/combos', permission: 'combos' },
        { id: 'drinks', label: 'Bebidas', icon: 'wine-glass', path: '/drinks', permission: 'drinks' },
        { id: 'drink-sets', label: 'Conjuntos de bebidas', icon: 'layer-group', path: '/drink-sets', permission: 'drink_sets' },
        { id: 'dishes', label: 'Platillos', icon: 'utensils', path: '/dishes', permission: 'dishes' },
        { id: 'extras', label: 'Extras', icon: 'star', path: '/extras', permission: 'extras' },
        { id: 'promotions', label: 'Promociones de hoy', icon: 'tag', path: '/promociones', permission: 'promotions' },
        { id: 'recipes', label: 'Recetas', icon: 'flask', path: '/recetas', permission: 'recipes' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { id: 'orders-list', label: 'Pedidos y Órdenes', icon: 'list', path: '/pedidos', permission: 'orders' },
        { id: 'tables', label: 'Mesas', icon: 'chair', path: '/mesas', permission: 'tables' },
        { id: 'inventory', label: 'Inventario', icon: 'box', path: '/inventario', permission: 'inventory' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { id: 'clients', label: 'Clientes', icon: 'users', path: '/clients', permission: 'clients' },
        { id: 'staff', label: 'Empleados', icon: 'user-tie', path: '/employees', permission: 'employees' },
        { id: 'invite-staff', label: 'Invitar staff', icon: 'user-plus', path: '/InviteStaff', permission: 'invite_staff' },
        { id: 'payroll', label: 'Planilla', icon: 'sack-dollar', path: '/payroll', permission: 'payroll' },
        { id: 'reports', label: 'Reportes (IVA)', icon: 'file-invoice-dollar', path: '/reports', permission: 'reports' },
      ],
    },
  ]
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => !item.permission || hasPermission(user, item.permission)),
    }))
    .filter((category) => category.items.length > 0);

  const renderNavItem = (item, onItemClick) => {
    const isActive = activeMenu === item.id;
    return (
      <Link
        key={item.id}
        to={item.path}
        onClick={onItemClick}
        className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-none text-sm font-display font-medium transition-all duration-200 ${isActive
            ? 'bg-ac text-white'
            : 'text-inkalt hover:bg-surface/20 hover:text-ink'
          }`}
      >
        <FAIcon
          icon={item.icon}
          className={isActive ? 'text-white' : 'text-muted group-hover:text-inkalt'}
        />
        <span>{item.label}</span>
        {isActive && (
          <span className="ml-auto w-2 h-2 rounded-full bg-surface" />
        )}
      </Link>
    );
  };

  // Cada categoría vive en su propia "tarjeta", con un fondo apenas distinto
  // al de la sidebar para separarlas visualmente sin romper el tema oscuro.
  const renderNavigation = (onItemClick = undefined) => (
    <div className="space-y-4">
      {menuCategories.map((category, idx) => (
        <div key={idx} className="bg-surfalt border border-line rounded-none p-3">
          <h3 className="px-1 mb-2 text-xs font-bold text-muted uppercase tracking-wider">
            {category.title}
          </h3>
          <div className="space-y-1">
            {category.items.map((item) => renderNavItem(item, onItemClick))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Solo móvil: en pantallas grandes la navegación vive en la barra
          superior (ver components/dashboard/NavMenu.jsx) y esta barra lateral
          ya no se monta. Aquí se conserva como cajón deslizante porque cuatro
          menús desplegables no caben en un teléfono. */}
      {/* Móvil */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-bg backdrop-blur-sm transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          <div className="relative flex items-center justify-between p-4 border-b border-line shrink-0">
            <div className="flex items-center justify-center">
              <img src={logoSrc} alt="SYSCOR" className="h-10 w-auto object-contain" draggable={false} />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-ink hover:bg-surface rounded-none transition-colors"
              aria-label="Cerrar menú"
            >
              <FAIcon icon="times" size="lg" />
            </button>
          </div>

          <nav className="relative p-4 flex-1 overflow-y-auto custom-scrollbar">
            {renderNavigation(onClose)}
          </nav>

        </div>
      </div>
    </>
  );
};

export default Sidebar;
