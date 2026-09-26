// src/components/commons/AdminTabs.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { hasPermission } from '../../constants/permissions';

export const ADMIN_TABS = [
  { id: 'employees', label: 'EMPLEADOS', path: '/employees', permission: 'employees' },
  { id: 'invitations', label: 'INVITACIONES', path: '/InviteStaff', permission: 'invite_staff' },
  { id: 'payroll_general', label: 'PLANILLA GENERAL', path: '/payroll', permission: 'payroll' },
  { id: 'payroll_bonuses', label: 'PLANILLA DE BONOS', path: '/payroll?tab=bonuses', permission: 'payroll' },
  { id: 'clients', label: 'CLIENTES', path: '/clients', permission: 'clients' },
  { id: 'reports', label: 'REPORTES (IVA)', path: '/reports', permission: 'reports' },
];

const AdminTabs = ({ activeTab }) => {
  const { user } = useAuth();
  const location = useLocation();

  const visibleTabs = ADMIN_TABS.filter(
    (t) => !t.permission || hasPermission(user, t.permission)
  );

  return (
    <div className="flex items-center gap-6 sm:gap-8 border-b border-line mb-8 text-[11px] font-mono tracking-wider font-semibold overflow-x-auto">
      {visibleTabs.map((t) => {
        let isActive = false;
        if (activeTab) {
          isActive = t.id === activeTab;
        } else if (t.path.includes('?')) {
          const [basePath, search] = t.path.split('?');
          isActive =
            location.pathname.toLowerCase() === basePath.toLowerCase() &&
            location.search.includes(search);
        } else {
          isActive =
            location.pathname.toLowerCase() === t.path.toLowerCase() &&
            (!location.search || !location.search.includes('tab=bonuses'));
        }

        return (
          <Link
            key={t.id}
            to={t.path}
            className={`pb-3 transition-colors shrink-0 whitespace-nowrap ${
              isActive
                ? 'text-ink border-b-2 border-ac -mb-[1px]'
                : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
};

export default AdminTabs;
