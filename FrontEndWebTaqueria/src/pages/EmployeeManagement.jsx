// src/pages/EmployeeManagement.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import FAIcon from '../components/commons/FAIcon';
import EmployeeModal from '../components/employee/EmployeeModal';
import EmployeeLeaderboardModal from '../components/employee/EmployeeLeaderboardModal';
import EmployeeDetailModal from '../components/dashboard/EmployeeDetailModal';
import ConfirmModal from '../components/commons/ConfirmModal';
import PaginationControls from '../components/commons/PaginationControls';
import { useEmployees } from '../hooks/useEmployees';
import useEmployeeLeaderboard from '../hooks/useEmployeeLeaderboard';
import usePagination from '../hooks/usePagination';
import { ToastProvider, useToast } from '../components/commons/ToastProvider';
import ReportButton from '../components/commons/ReportButton';
import AttentionCenter from '../components/commons/AttentionCenter';
import AdminTabs from '../components/commons/AdminTabs';
import { employeesReportColumns } from '../constants/reportConfigs';

const DAY_ABBR = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};

const formatSchedule = (emp) => {
  const days = emp.workInfo?.workDays || [];
  const start = emp.workInfo?.scheduleStart;
  const end = emp.workInfo?.scheduleEnd;
  if (days.length === 0 || !start || !end) return 'Sin horario definido';
  const daysLabel = days.map((d) => DAY_ABBR[d] || d).join(', ');
  return `${daysLabel} · ${start}-${end}`;
};


function EmployeeManagementContent() {
  const [activeMenu] = useState('staff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [confirmStatus, setConfirmStatus] = useState({ isOpen: false, employee: null });
  const [detailModal, setDetailModal] = useState({ isOpen: false, employee: null, readOnly: false, fromAttention: false });
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('Todos');

  const { employees = [], loading, updateEmployee, sendPasswordResetInvitation } = useEmployees();
  const { topEmployees, period, loading: loadingLeaderboard, fetchLeaderboard, customRange, setCustomRange } = useEmployeeLeaderboard();
  const { addToast } = useToast();

  useEffect(() => {
    if (!activeDropdownId) return;
    const handleClose = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [activeDropdownId]);

  const translateRole = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'manager') return 'Gerente';
    if (t === 'waiter') return 'Mesero';
    if (t === 'cashier') return 'Cajero';
    if (t === 'kitchen') return 'Cocina';
    if (t === 'cleaner') return 'Limpieza';
    return 'Otro';
  };

  const filteredEmployees = useMemo(() => {
    if (!employees.length) return [];
    return employees.filter(emp => {
      const firstName = emp.personalInfo?.name || '';
      const lastName = emp.personalInfo?.lastname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const translated = translateRole(emp.personalInfo?.type);
      const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'Todos' || translated.toUpperCase() === selectedRole.toUpperCase();
      return matchesSearch && matchesRole;
    });
  }, [employees, searchTerm, selectedRole]);

  const { page, totalPages, paginatedItems: paginatedEmployees, goTo, next, prev } = usePagination(filteredEmployees, 10);

  const totalSalaries = useMemo(() => {
    return filteredEmployees.reduce((sum, e) => sum + Number(e.workInfo?.salary || 0), 0);
  }, [filteredEmployees]);

  const [totalSalariesInt, totalSalariesDec] = useMemo(() => {
    const formatted = totalSalaries.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const parts = formatted.split('.');
    return [parts[0], parts[1] || '00'];
  }, [totalSalaries]);

  const activeEmployeesCount = useMemo(() => {
    return employees.filter((e) => (e.workInfo?.status || 'active') === 'active').length;
  }, [employees]);

  const handleEditPermissions = (emp) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleToggleStatusConfirm = async () => {
    const emp = confirmStatus.employee;
    if (!emp) return;

    const currentStatus = emp.workInfo?.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const success = await updateEmployee(emp._id || emp.id, { status: newStatus });
    if (success) {
      addToast(`Empleado ${newStatus === 'active' ? 'dado de alta' : 'dado de baja'} correctamente`, 'success');
    } else {
      addToast('Error al cambiar el estado del empleado', 'error');
    }
    setConfirmStatus({ isOpen: false, employee: null });
  };

  const handleSavePermissions = async (id, updatedPayload) => {
    const success = await updateEmployee(id, updatedPayload);
    if (success) {
      addToast('Permisos actualizados correctamente. Si es su primer permiso, se le envió un código de acceso por correo.', 'success');
      setIsModalOpen(false);
      setSelectedEmployee(null);
    } else {
      addToast('No se pudieron actualizar los permisos', 'error');
    }
  };

  const openLeaderboard = (initialPeriod) => {
    setLeaderboardOpen(true);
    fetchLeaderboard(initialPeriod || period);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-surface border border-line p-5 sm:p-7 lg:p-8">
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">
                    Personal
                  </h1>
                  <p className="text-sm text-muted">
                    Control de accesos, estados y datos del equipo de Taquería El Corral.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {employees.some((e) => e.hasMissingFields) && (
                    <AttentionCenter
                      isOpen={attentionOpen}
                      onOpenChange={setAttentionOpen}
                      items={employees.filter((e) => e.hasMissingFields)}
                      getKey={(e) => e._id}
                      getTitle={(e) => `${e.personalInfo?.name || ''} ${e.personalInfo?.lastname || ''}`.trim() || 'Empleado'}
                      getSubtitle={(e) => translateRole(e.personalInfo?.type)}
                      getImage={(e) => e.personalInfo?.image}
                      getReason={(e) => e.missingFields || []}
                      onEdit={(emp) => {
                        setAttentionOpen(false);
                        setDetailModal({ isOpen: true, employee: emp, readOnly: false, fromAttention: true });
                      }}
                    />
                  )}

                  <ReportButton
                    title="Personal"
                    columns={employeesReportColumns}
                    rows={filteredEmployees}
                    getImageUrl={(e) => e.personalInfo?.image}
                    itemTag="empleado"
                    summary={[
                      { label: 'Empleados', value: filteredEmployees.length },
                      { label: 'Activos', value: filteredEmployees.filter((e) => (e.workInfo?.status || 'active') === 'active').length },
                    ]}
                  />
                </div>
              </div>

              {/* Pestañas de navegación de Administración */}
              <AdminTabs activeTab="employees" />

              {/* Resumen Hero de cifras principales */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-2">
                <div className="min-w-0">
                  <p className="kick text-[10.5px] font-bold text-ac tracking-wider mb-2">
                    TOTAL EN SALARIOS · MENSUAL
                  </p>
                  <div className="text-4xl sm:text-5xl font-light text-ink tracking-tight mb-2 flex items-baseline">
                    <span>${totalSalariesInt}</span>
                    <span className="text-2xl text-muted font-normal ml-0.5">.{totalSalariesDec}</span>
                  </div>
                  <p className="text-xs text-muted max-w-md leading-relaxed">
                    Suma acumulada de salarios base del equipo registrado. Descuentos de ley y pagos netos se gestionan en Planilla.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-8 sm:gap-12 shrink-0">
                  <div className="border-t border-line pt-2.5 min-w-[130px] sm:min-w-[150px]">
                    <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                      EMPLEADOS ACTIVOS
                    </p>
                    <p className="text-2xl sm:text-3xl font-light text-ink">
                      {loading ? '—' : activeEmployeesCount}
                    </p>
                  </div>

                  <div className="border-t border-line pt-2.5 min-w-[130px] sm:min-w-[150px]">
                    <p className="kick text-[10px] font-bold text-muted tracking-wider mb-1.5">
                      EMPLEADOS DESTACADOS
                    </p>
                    <button
                      type="button"
                      onClick={() => openLeaderboard('week')}
                      className="text-base sm:text-lg font-medium text-ink hover:text-ac transition-colors flex items-center gap-1.5 mt-1"
                    >
                      Ver ranking <FAIcon icon="arrow-right" size="xs" className="text-muted" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cabecera de la tabla */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-base font-bold text-ink">
                  Detalle del personal
                </h2>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink placeholder:text-muted w-full sm:w-56"
                  />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-3 py-1.5 bg-surfalt/40 border border-line rounded-none focus:outline-none focus:border-ac text-xs text-ink cursor-pointer"
                  >
                    <option value="Todos">Todos los puestos</option>
                    <option value="GERENTE">Gerentes</option>
                    <option value="MESERO">Meseros</option>
                    <option value="CAJERO">Cajeros</option>
                    <option value="COCINA">Cocina</option>
                    <option value="LIMPIEZA">Limpieza</option>
                  </select>
                </div>
              </div>

              {/* Tabla de empleados */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-muted text-sm">Cargando personal...</div>
                ) : employees.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">No hay empleados registrados.</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">Ningún empleado coincide con los filtros.</div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="text-[10.5px] kick font-bold text-muted tracking-wider border-b border-line">
                        <th className="py-3 pr-4">EMPLEADO</th>
                        <th className="py-3 px-4">PUESTO</th>
                        <th className="py-3 px-4 text-right">SALARIO</th>
                        <th className="py-3 px-4">HORARIO</th>
                        <th className="py-3 px-4">ESTADO</th>
                        <th className="py-3 pl-4 text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60 text-sm">
                      {paginatedEmployees.map((emp) => {
                        const id = emp._id || emp.id;
                        const firstName = emp.personalInfo?.name || '';
                        const lastName = emp.personalInfo?.lastname || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        const puesto = translateRole(emp.personalInfo?.type);
                        const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'E';
                        const img = emp.personalInfo?.image;
                        const isActive = (emp.workInfo?.status || 'active') === 'active';

                        return (
                          <tr
                            key={id}
                            className={`hover:bg-surfalt/40 transition-colors ${!isActive ? 'opacity-50' : ''}`}
                          >
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-3">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={fullName}
                                    className="w-7 h-7 object-cover border border-line shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="w-7 h-7 bg-surfalt border border-line flex items-center justify-center text-[10px] font-bold text-muted shrink-0"
                                  style={{ display: img ? 'none' : 'flex' }}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-medium text-ink text-[13.5px]">{fullName}</div>
                                  <div className="text-[11px] text-muted">{emp.loginInfo?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[13px] text-inkalt">
                              {puesto}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-ink num text-[13.5px]">
                              {emp.workInfo?.salary != null ? `$${Number(emp.workInfo.salary).toFixed(2)}` : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-[12.5px] text-muted whitespace-nowrap">
                              {formatSchedule(emp)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${isActive ? 'text-ok' : 'text-muted'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-ok' : 'bg-muted'}`} />
                                {isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="py-3.5 pl-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleEditPermissions(emp)}
                                disabled={!isActive}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-line text-ink hover:border-ac hover:text-ac transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <FAIcon icon="lock" size="xs" /> Permisos
                              </button>

                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId((prev) => (prev === id ? null : id));
                                  }}
                                  aria-label="Más acciones"
                                  className={`inline-flex items-center justify-center w-7 h-7 border transition-colors ${
                                    activeDropdownId === id
                                      ? 'border-ac text-ac bg-acsoft'
                                      : 'border-line text-muted hover:border-linealt hover:text-ink'
                                  }`}
                                >
                                  <FAIcon icon="ellipsis-vertical" size="sm" />
                                </button>

                                {activeDropdownId === id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 mt-1 w-48 bg-surface border border-line shadow-lg z-50 py-1 text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDetailModal({ isOpen: true, employee: emp, readOnly: true });
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs text-ink hover:bg-surfalt flex items-center gap-2.5 transition-colors"
                                    >
                                      <FAIcon icon="eye" size="sm" className="text-muted w-4 text-center" />
                                      <span>Ver información</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDetailModal({ isOpen: true, employee: emp, readOnly: false });
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs text-ink hover:bg-surfalt flex items-center gap-2.5 transition-colors"
                                    >
                                      <FAIcon icon="pen" size="sm" className="text-muted w-4 text-center" />
                                      <span>Editar datos</span>
                                    </button>

                                    <div className="my-1 border-t border-line/60" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setConfirmStatus({ isOpen: true, employee: emp });
                                      }}
                                      className={`w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 transition-colors ${
                                        isActive ? 'text-ac hover:bg-acsoft' : 'text-ok hover:bg-oksoft'
                                      }`}
                                    >
                                      <FAIcon icon={isActive ? 'user-slash' : 'user-check'} size="sm" className="w-4 text-center" />
                                      <span>{isActive ? 'Dar de baja' : 'Reactivar empleado'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Fila de totales del período */}
                    {filteredEmployees.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-line text-sm font-display font-bold text-ink">
                          <td className="py-3.5 pr-4 kick text-[10.5px] tracking-wider" colSpan={2}>
                            TOTALES DEL PERÍODO ({filteredEmployees.length})
                          </td>
                          <td className="py-3.5 px-4 text-right text-ac num font-bold">
                            ${totalSalaries.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4" colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>

              {/* Paginación */}
              {filteredEmployees.length > 0 && totalPages > 1 && (
                <div className="pt-4 mt-2">
                  <PaginationControls page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGoTo={goTo} />
                </div>
              )}

              {/* Nota institucional al pie */}
              <p className="text-xs text-muted mt-6 leading-relaxed">
                Los permisos de acceso y estados de personal se aplican de forma inmediata en las sesiones activas del equipo. Los descuentos de ley y deducciones aplicables se calculan en la Planilla.
              </p>
            </div>

            <EmployeeModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              employeeData={selectedEmployee}
              onSave={handleSavePermissions}
            />

            <ConfirmModal
              isOpen={confirmStatus.isOpen}
              onClose={() => setConfirmStatus({ isOpen: false, employee: null })}
              onConfirm={handleToggleStatusConfirm}
              title={confirmStatus.employee?.workInfo?.status === 'active' ? 'Dar de baja empleado' : 'Dar de alta empleado'}
              message={`¿Estás seguro de cambiar el estado de ${confirmStatus.employee?.personalInfo?.name || 'este empleado'}?`}
              confirmText={confirmStatus.employee?.workInfo?.status === 'active' ? 'Dar de baja' : 'Dar de alta'}
              loading={loading}
            />

            <EmployeeDetailModal
              isOpen={detailModal.isOpen}
              onClose={() => setDetailModal({ isOpen: false, employee: null, readOnly: false, fromAttention: false })}
              onBack={detailModal.fromAttention ? () => {
                setDetailModal({ isOpen: false, employee: null, readOnly: false, fromAttention: false });
                setAttentionOpen(true);
              } : undefined}
              employee={detailModal.employee}
              readOnly={detailModal.readOnly}
              onSave={updateEmployee}
              onSendPasswordReset={sendPasswordResetInvitation}
              addToast={addToast}
            />

            <EmployeeLeaderboardModal
              isOpen={leaderboardOpen}
              onClose={() => setLeaderboardOpen(false)}
              topEmployees={topEmployees}
              period={period}
              loading={loadingLeaderboard}
              onOpen={openLeaderboard}
              onPeriodChange={(p, range) => fetchLeaderboard(p, range)}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function EmployeeManagement() {
  return (
    <ToastProvider>
      <EmployeeManagementContent />
    </ToastProvider>
  );
}
