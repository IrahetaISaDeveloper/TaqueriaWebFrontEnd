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

  const inputClass = `w-full mt-1 px-3 py-2 rounded-none bg-surface border border-line text-sm ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-surfalt rounded-none border border-line max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-ac px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h3 className="text-white font-display font-bold text-lg">{readOnly ? 'Información del empleado' : 'Ficha del empleado'}</h3>
              <p className="text-white/80 text-xs">{email}</p>
            </div>
            <button type="button" onClick={onClose} className="text-white/90 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/10">
              <FAIcon icon="times" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-display font-semibold ${isActive ? 'bg-oksoft text-ok border border-ok' : 'bg-line text-inkalt border border-linealt'}`}>
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-display font-semibold text-muted">Nombre</label>
                <input
                  disabled={readOnly}
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted">Apellido</label>
                <input
                  disabled={readOnly}
                  className={inputClass}
                  value={form.lastname}
                  onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted">Teléfono</label>
                <input
                  disabled={readOnly}
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted">Puesto</label>
                <Select
                  disabled={readOnly}
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted">Salario</label>
                <input
                  type="number"
                  disabled={readOnly}
                  className={inputClass}
                  value={form.salary}
                  onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-display font-semibold text-muted">Dirección</label>
                <input
                  disabled={readOnly}
                  className={inputClass}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-display font-semibold text-muted">Días que trabaja</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => toggleDay(d.value)}
                    className={`px-2.5 py-1.5 rounded-none text-xs font-display font-semibold border transition-colors ${
                      form.workDays.includes(d.value)
                        ? 'bg-ac text-white border-ac'
                        : 'bg-surface text-muted border-line'
                    } ${readOnly ? 'cursor-not-allowed opacity-80' : 'hover:border-acline'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-display font-semibold text-muted">Hora de entrada</label>
                <input
                  type="time"
                  disabled={readOnly}
                  className={inputClass}
                  value={form.scheduleStart}
                  onChange={(e) => setForm((f) => ({ ...f, scheduleStart: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted">Hora de salida</label>
                <input
                  type="time"
                  disabled={readOnly}
                  className={inputClass}
                  value={form.scheduleEnd}
                  onChange={(e) => setForm((f) => ({ ...f, scheduleEnd: e.target.value }))}
                />
              </div>
            </div>

            {!readOnly && (
              <>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={handleSendReset}
                    disabled={sendingInvite}
                    className="px-3 py-2 rounded-none text-xs font-display font-semibold bg-surface border border-line text-inkalt hover:bg-surfalt disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <FAIcon icon="key" size="xs" />
                    {sendingInvite ? 'Enviando...' : 'Enviar invitación para cambiar contraseña'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmToggleOpen(true)}
                    className={`px-3 py-2 rounded-none text-xs font-display font-semibold border inline-flex items-center gap-1.5 ${
                      isActive ? 'bg-acsoft border-acline text-ac hover:bg-acsoft' : 'bg-oksoft border-ok text-ok hover:bg-oksoft'
                    }`}
                  >
                    <FAIcon icon={isActive ? 'user-slash' : 'user-check'} size="xs" />
                    {isActive ? 'Dar de baja' : 'Reactivar'}
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-display font-semibold text-inkalt bg-surfalt hover:bg-line rounded-none">
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2.5 text-sm font-display font-semibold text-white bg-ac hover:bg-ac rounded-none disabled:opacity-60"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </>
            )}

            {readOnly && (
              <div className="flex justify-end pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-display font-semibold text-inkalt bg-surfalt hover:bg-line rounded-none">
                  Cerrar
                </button>
              </div>
            )}
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
