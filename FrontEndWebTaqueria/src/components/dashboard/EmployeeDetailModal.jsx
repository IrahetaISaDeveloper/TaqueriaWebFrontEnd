// src/components/dashboard/EmployeeDetailModal.jsx
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import Select from '../commons/Select';
import ConfirmModal from '../commons/ConfirmModal';
import { EMPLOYEE_TYPE_OPTIONS as TYPE_OPTIONS } from '../../constants/employeeTypes';

const DAYS = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sáb' },
  { value: 'domingo', label: 'Dom' },
];

// readOnly=true => solo "Ver info": ni inputs ni acciones de baja/contraseña,
// solo cerrar. Se usa el mismo modal para "Editar" y "Ver info" del menú de
// acciones de Empleados para no duplicar la ficha completa dos veces.
const EmployeeDetailModal = ({ isOpen, onClose, employee, onSave, onSendPasswordReset, addToast, readOnly = false }) => {
  const [form, setForm] = useState({ name: '', lastname: '', phone: '', address: '', type: '', salary: '', workDays: [], scheduleStart: '', scheduleEnd: '' });
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.personalInfo?.name || '',
        lastname: employee.personalInfo?.lastname || '',
        phone: employee.personalInfo?.phone || '',
        address: employee.personalInfo?.address || '',
        type: employee.personalInfo?.type || 'other',
        salary: employee.workInfo?.salary ?? '',
        workDays: employee.workInfo?.workDays || [],
        scheduleStart: employee.workInfo?.scheduleStart || '',
        scheduleEnd: employee.workInfo?.scheduleEnd || '',
      });
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const isActive = employee.workInfo?.status !== 'inactive';
  const email = employee.loginInfo?.email;

  const toggleDay = (day) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(day) ? f.workDays.filter((d) => d !== day) : [...f.workDays, day],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(employee._id, form);
    setSaving(false);
    if (ok) {
      addToast?.('Los datos del empleado se actualizaron correctamente.', 'success');
    } else {
      addToast?.('No se pudo actualizar el empleado.', 'error');
    }
  };

  const handleSendReset = async () => {
    setSendingInvite(true);
    const result = await onSendPasswordReset(employee._id);
    setSendingInvite(false);
    addToast?.(
      result.success ? 'Se envió la invitación al correo del empleado.' : (result.message || 'No se pudo enviar la invitación.'),
      result.success ? 'success' : 'error'
    );
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    const ok = await onSave(employee._id, { status: isActive ? 'inactive' : 'active' });
    setTogglingStatus(false);
    setConfirmToggleOpen(false);
    addToast?.(
      ok ? (isActive ? 'El empleado fue dado de baja.' : 'El empleado fue reactivado.') : 'No se pudo cambiar el estado del empleado.',
      ok ? 'success' : 'error'
    );
  };

  const inputClass = `w-full mt-1.5 px-3 py-2.5 rounded-none bg-surface border border-line focus:border-ac focus:outline-none text-[13.5px] text-ink transition-colors ${readOnly ? 'opacity-70 cursor-not-allowed bg-surfalt' : ''}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-surfalt rounded-none border border-acline/60 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">

          {/* Header delgado */}
          <div className="bg-ac px-4 sm:px-5 py-2.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div className="min-w-0">
              <h3 className="text-white font-display font-bold text-base sm:text-lg leading-tight truncate">
                {readOnly ? 'Información del empleado' : 'Ficha del empleado'}
              </h3>
              {email && (
                <p className="text-white/70 text-xs truncate mt-0.5">{email}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center hover:bg-white/10 transition-colors ml-2 shrink-0"
            >
              <FAIcon icon="times" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {/* Sección: Datos personales */}
            <div className="bg-surface rounded-none border border-acline/60 p-4 mb-3.5 shadow-xs">
              <h4 className="kick text-[10.5px] text-ac font-bold tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
                DATOS PERSONALES
              </h4>

              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-line">
                <span className={`px-2.5 py-1 text-[11px] font-display font-semibold border ${
                  isActive ? 'text-ok border-ok/40 bg-oksoft' : 'text-muted border-line bg-surfalt'
                }`}>
                  {isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className="kick text-[10px] text-muted tracking-wider">NOMBRE</label>
                  <input disabled={readOnly} className={inputClass} value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="kick text-[10px] text-muted tracking-wider">APELLIDO</label>
                  <input disabled={readOnly} className={inputClass} value={form.lastname}
                    onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))} />
                </div>
                <div>
                  <label className="kick text-[10px] text-muted tracking-wider">TELÉFONO</label>
                  <input disabled={readOnly} className={inputClass} value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="kick text-[10px] text-muted tracking-wider">PUESTO</label>
                  <div className="mt-1.5">
                    <Select disabled={readOnly} value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                      {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="kick text-[10px] text-muted tracking-wider">SALARIO</label>
                  <input type="number" disabled={readOnly} className={inputClass} value={form.salary}
                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="kick text-[10px] text-muted tracking-wider">DIRECCIÓN</label>
                  <input disabled={readOnly} className={inputClass} value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Sección: Horario y jornada */}
            <div className="bg-surface rounded-none border border-acline/60 p-4 mb-3.5 shadow-xs">
              <h4 className="kick text-[10.5px] text-ac font-bold tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
                HORARIO Y JORNADA
              </h4>

              <div className="space-y-3.5">
                <div>
                  <label className="kick text-[10px] text-muted tracking-wider">DÍAS QUE TRABAJA</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleDay(d.value)}
                        className={`px-2.5 py-1.5 text-xs font-display font-semibold border transition-colors ${
                          form.workDays.includes(d.value)
                            ? 'bg-ac text-white border-ac'
                            : 'bg-surfalt text-inkalt border-line hover:border-acline'
                        } ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="kick text-[10px] text-muted tracking-wider">HORA DE ENTRADA</label>
                    <input type="time" disabled={readOnly} className={inputClass} value={form.scheduleStart}
                      onChange={(e) => setForm((f) => ({ ...f, scheduleStart: e.target.value }))} />
                  </div>
                  <div>
                    <label className="kick text-[10px] text-muted tracking-wider">HORA DE SALIDA</label>
                    <input type="time" disabled={readOnly} className={inputClass} value={form.scheduleEnd}
                      onChange={(e) => setForm((f) => ({ ...f, scheduleEnd: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Acciones de cuenta */}
            {!readOnly && (
              <div className="bg-surface rounded-none border border-acline/60 p-4 mb-3.5 shadow-xs">
                <h4 className="kick text-[10.5px] text-ac font-bold tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ac shrink-0" />
                  ACCIONES DE CUENTA
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleSendReset} disabled={sendingInvite}
                    className="px-3 py-1.5 text-xs font-display font-semibold bg-surfalt border border-line text-inkalt hover:border-acline hover:text-ac disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors">
                    <FAIcon icon="key" size="xs" />
                    {sendingInvite ? 'Enviando...' : 'Enviar invitación para cambiar contraseña'}
                  </button>
                  <button type="button" onClick={() => setConfirmToggleOpen(true)}
                    className={`px-3 py-1.5 text-xs font-display font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                      isActive ? 'bg-acsoft/20 border-acline text-ac hover:bg-acsoft' : 'bg-oksoft/20 border-ok text-ok hover:bg-oksoft'
                    }`}>
                    <FAIcon icon={isActive ? 'user-slash' : 'user-check'} size="xs" />
                    {isActive ? 'Dar de baja' : 'Reactivar'}
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2.5 pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-display font-semibold text-inkalt hover:text-ink transition-colors">
                Cerrar
              </button>
              {!readOnly && (
                <button type="button" onClick={handleSave} disabled={saving}
                  className="px-5 py-2 text-sm font-display font-semibold text-white bg-ac hover:bg-ac/90 disabled:opacity-60 transition-colors">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <ConfirmModal
          isOpen={confirmToggleOpen}
          onClose={() => setConfirmToggleOpen(false)}
          onConfirm={handleToggleStatus}
          loading={togglingStatus}
          title={isActive ? 'Dar de baja al empleado' : 'Reactivar empleado'}
          message={isActive ? '¿Seguro que deseas dar de baja a este empleado? Ya no podrá iniciar sesión.' : '¿Deseas reactivar a este empleado?'}
          confirmText={isActive ? 'Dar de baja' : 'Reactivar'}
          variant={isActive ? 'danger' : 'warning'}
          icon={isActive ? 'user-slash' : 'user-check'}
        />
      )}
    </>
  );
};

export default EmployeeDetailModal;
