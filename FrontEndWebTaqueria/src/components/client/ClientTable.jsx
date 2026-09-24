import React from 'react';
import FAIcon from '../commons/FAIcon';
import { getPrimaryPhone } from '../../utils/customerPhones';
import PaginationControls from '../commons/PaginationControls';
import usePagination from '../../hooks/usePagination';

const ClientTable = ({ clients, onView, isLoading }) => {
  const { page, totalPages, paginatedItems, goTo, next, prev } = usePagination(clients || [], 5);

  if (isLoading) {
    return (
      <div className="bg-surface rounded-none border border-line p-6 sm:p-8 text-center text-muted font-medium text-sm">
        Cargando comensales fieles de la base de datos...
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="bg-surface rounded-none border border-line p-6 sm:p-8 text-center text-muted font-medium text-sm">
        No hay clientes registrados en el sistema en este momento.
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-none border border-line overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-line">
        <h2 className="text-lg font-display font-bold text-ink">Clientes registrados</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-surfalt/80 text-xs font-display font-semibold text-muted uppercase tracking-wider border-b border-line">
              <th className="p-3 sm:p-4 pl-4 sm:pl-6">Foto</th>
              <th className="p-3 sm:p-4">Cliente</th>
              <th className="p-3 sm:p-4">Contacto</th>
              <th className="p-3 sm:p-4">Estado</th>
              <th className="p-3 sm:p-4">Fecha registro</th>
              <th className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm text-inkalt">
            {paginatedItems.map((client) => {
              const id = client._id || client.id;
              const fullName = `${client.personalInfo?.name || ''} ${client.personalInfo?.lastname || ''}`.trim() || 'Sin Nombre';
              const email = client.loginInfo?.email || 'Sin correo';
              const phone = getPrimaryPhone(client) || 'Sin teléfono';
              const registerDate = client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A';
              const isVerified = !!client.loginInfo?.isVerified;
              // Los clientes viejos no traen "status" (se agregó después), y
              // el backend los trata como activos: aquí se asume lo mismo.
              const isActive = (client.status || 'active') === 'active';
              const initials = fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

              return (
                <tr key={id} className={`hover:bg-surfalt/80 transition-colors ${!isActive ? 'opacity-60 bg-surfalt/30' : ''}`}>
                  <td className="p-3 sm:p-4 pl-4 sm:pl-6">
                    {client.personalInfo?.image ? (
                      <img src={client.personalInfo.image} alt={fullName} className="w-10 h-10 rounded-none object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-none bg-line flex items-center justify-center text-muted text-xs font-display font-bold">
                        {initials || '?'}
                      </div>
                    )}
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="font-display font-bold text-ink">{fullName}</div>
                    <div className="text-xs text-muted">{phone}</div>
                  </td>
                  <td className="p-3 sm:p-4 text-inkalt font-medium">{email}</td>
                  <td className="p-3 sm:p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-semibold border ${isVerified ? 'bg-oksoft text-ok border-ok' : 'bg-warnsoft text-warn border-warn'}`}>
                        {isVerified ? 'Verificado' : 'Sin verificar'}
                      </span>
                      {/* Solo se marca la baja: mostrar "activo" en cada fila
                          sería ruido, porque es el caso normal. */}
                      {!isActive && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-semibold border bg-acsoft text-ac border-acline">
                          Desactivado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-inkalt">{registerDate}</td>
                  <td className="p-3 sm:p-4 pr-4 sm:pr-6 text-right">
                    <button
                      onClick={() => onView(client)}
                      aria-label="Ver información del cliente"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-none border border-line text-muted hover:bg-surfalt hover:text-ac transition-colors"
                    >
                      <FAIcon icon="eye" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <PaginationControls page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
      </div>
    </div>
  );
};

export default ClientTable;
