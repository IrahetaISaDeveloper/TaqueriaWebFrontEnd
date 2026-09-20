// Catálogo único de permisos del sistema. Debe coincidir EXACTO (mismos ids)
// con backEnd/src/constants/permissions.js.
export const PERMISSIONS = [
  { id: 'dashboard', label: 'Actividad y Análisis', group: 'Pantallas', type: 'screen' },

  { id: 'combos', label: 'Combos', group: 'Pantallas', type: 'screen' },
  { id: 'drinks', label: 'Bebidas', group: 'Pantallas', type: 'screen' },
  { id: 'drink_sets', label: 'Conjuntos de bebidas', group: 'Pantallas', type: 'screen' },
  { id: 'dishes', label: 'Platillos', group: 'Pantallas', type: 'screen' },
  { id: 'extras', label: 'Extras', group: 'Pantallas', type: 'screen' },
  { id: 'promotions', label: 'Promociones de hoy', group: 'Pantallas', type: 'screen' },
  { id: 'recipes', label: 'Recetas', group: 'Pantallas', type: 'screen' },

  { id: 'orders', label: 'Pedidos y Órdenes', group: 'Pantallas', type: 'screen' },
  { id: 'tables', label: 'Mesas', group: 'Pantallas', type: 'screen' },
  { id: 'inventory', label: 'Inventario', group: 'Pantallas', type: 'screen' },

  { id: 'clients', label: 'Clientes', group: 'Pantallas', type: 'screen' },
  { id: 'employees', label: 'Empleados', group: 'Pantallas', type: 'screen' },
  { id: 'invite_staff', label: 'Invitar staff', group: 'Pantallas', type: 'screen' },
  { id: 'payroll', label: 'Planilla', group: 'Pantallas', type: 'screen' },
  { id: 'reports', label: 'Reportes contables (IVA)', group: 'Pantallas', type: 'screen' },

  { id: 'notifications', label: 'Notificaciones', group: 'Pantallas', type: 'screen' },
  { id: 'settings', label: 'Ajustes', group: 'Pantallas', type: 'screen' },

  { id: 'orders_cancel', label: 'Cancelar pedidos', group: 'Funciones', type: 'action' },
  { id: 'employees_manage_status', label: 'Dar de alta/baja empleados', group: 'Funciones', type: 'action' },
  { id: 'clients_manage_status', label: 'Activar/desactivar clientes', group: 'Funciones', type: 'action' },
  { id: 'inventory_adjust_stock', label: 'Ajustar existencias de inventario', group: 'Funciones', type: 'action' },
  { id: 'tables_change_status', label: 'Cambiar el estado de una mesa', group: 'Funciones', type: 'action' },
];

// Mapa id -> ruta de la pantalla, para que Sidebar/ProtectedRoute puedan
// filtrar sin repetir la lista de rutas en dos lugares.
export const SCREEN_ROUTES = {
  dashboard: '/dashboard',
  combos: '/combos',
  drinks: '/drinks',
  drink_sets: '/drink-sets',
  dishes: '/dishes',
  extras: '/extras',
  promotions: '/promociones',
  recipes: '/recetas',
  orders: '/pedidos',
  tables: '/mesas',
  inventory: '/inventario',
  clients: '/clients',
  employees: '/employees',
  invite_staff: '/InviteStaff',
  payroll: '/payroll',
  reports: '/reports',
  notifications: '/notificaciones',
  settings: '/ajustes',
};

export const PERMISSION_GROUPS = PERMISSIONS.reduce((acc, p) => {
  acc[p.group] = acc[p.group] || [];
  acc[p.group].push(p);
  return acc;
}, {});

// El admin siempre tiene acceso a todo; solo los empleados quedan limitados
// a su array `permissions`.
export const hasPermission = (user, permissionId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permissionId);
};

export default { PERMISSIONS, SCREEN_ROUTES, PERMISSION_GROUPS, hasPermission };
