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

const AFP_OPTIONS = [
  { value: '', label: 'Seleccionar institución...' },
  { value: 'confia', label: 'AFP Confía' },
  { value: 'crecer', label: 'AFP Crecer' },
  { value: 'ipsfa', label: 'IPSFA' },
  { value: 'inpep', label: 'INPEP' },
  { value: 'otra', label: 'Otra / Ninguna' },
];

// Relaciona las etiquetas de `missingFields` con el campo del formulario
// que las resuelve, para resaltarlo en amarillo mientras siga vacío.
const MISSING_FIELD_KEYS = {
  'Nombre': 'name',
  'Apellido': 'lastname',
  'Teléfono': 'phone',
  'Dirección': 'address',
  'Salario': 'salary',
  'Número de ISSS': 'isssNumber',
  'Institución de AFP': 'afpInstitution',
  'Número de AFP': 'afpNumber',
  'Banco': 'bankName',
  'Cuenta bancaria': 'bankAccount',
};

const FieldLabel = ({ children, pending }) => (
  <label className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted tracking-wide">
    <span>{children}</span>
    {pending && (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold normal-case tracking-normal bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 leading-none">
        <span className="w-1 h-1 rounded-full bg-amber-500" />
        Pendiente
      </span>
    )}
  </label>
);

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="w-7 h-7 rounded-lg bg-ac text-white flex items-center justify-center shadow-2xs">
      <FAIcon icon={icon} size="xs" />
    </span>
    <h4 className="text-xs font-display font-bold text-ink uppercase tracking-wider">{title}</h4>
  </div>
);

const sectionClass = 'bg-white dark:bg-surface rounded-xl border border-line p-4 shadow-2xs';

const EmployeeDetailModal = ({
  isOpen,
  onClose,
  onBack,
  employee,
  onSave,
  onSendPasswordReset,
  addToast,
  readOnly = false,
}) => {
  const [form, setForm] = useState({
    name: '',
    lastname: '',
    phone: '',
    address: '',
    type: '',
    salary: '',
    workDays: [],
    scheduleStart: '',
    scheduleEnd: '',
    isssNumber: '',
    afpInstitution: '',
    afpNumber: '',
    bankName: '',
    bankAccount: '',
  });

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
        isssNumber:
          employee.workInfo?.isssNumber ||
          employee.legalInfo?.isssNumber ||
          employee.personalInfo?.isssNumber ||
          employee.isssNumber ||
          '',
        afpInstitution:
          employee.workInfo?.afpInstitution ||
          employee.legalInfo?.afpInstitution ||
          employee.personalInfo?.afpInstitution ||
          employee.afpInstitution ||
          '',
        afpNumber:
          employee.workInfo?.afpNumber ||
          employee.legalInfo?.afpNumber ||
          employee.personalInfo?.afpNumber ||
          employee.afpNumber ||
          '',
        bankName:
          employee.workInfo?.bankName ||
          employee.bankInfo?.bankName ||
          employee.personalInfo?.bankName ||
          employee.bankName ||
          '',
        bankAccount:
          employee.workInfo?.bankAccount ||
          employee.bankInfo?.bankAccount ||
          employee.personalInfo?.bankAccount ||
          employee.bankAccount ||
          '',
      });
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const isActive = employee.workInfo?.status !== 'inactive';
  const email = employee.loginInfo?.email;
  const fullName = `${form.name} ${form.lastname}`.trim() || 'Empleado';

  const toggleDay = (day) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(day)
        ? f.workDays.filter((d) => d !== day)
        : [...f.workDays, day],
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
      result.success
        ? 'Se envió la invitación al correo del empleado.'
        : result.message || 'No se pudo enviar la invitación.',
      result.success ? 'success' : 'error'
    );
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    const ok = await onSave(employee._id, { status: isActive ? 'inactive' : 'active' });
    setTogglingStatus(false);
    setConfirmToggleOpen(false);
    addToast?.(
      ok
        ? isActive
          ? 'El empleado fue dado de baja.'
          : 'El empleado fue reactivado.'
        : 'No se pudo cambiar el estado del empleado.',
      ok ? 'success' : 'error'
    );
  };


  const missingFields = employee.missingFields || [];
  const initials = (() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  // Un campo se marca en amarillo si el expediente lo reporta como pendiente
  // y todavía no se ha llenado en el formulario.
  const isPending = (key) =>
    !readOnly &&
    missingFields.some((label) => MISSING_FIELD_KEYS[label] === key) &&
    !String(form[key] ?? '').trim();

  const inputClass = (key) =>
    `w-full mt-1 px-3 py-2 rounded-lg border focus:border-ac focus:outline-none text-[13.5px] text-ink transition-colors ${
      isPending(key)
        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
        : 'bg-white dark:bg-surface border-line'
    } ${readOnly ? 'opacity-70 cursor-not-allowed bg-surfalt/80' : ''}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-surface rounded-2xl border border-line max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Cabecera alineada con AttentionCenter */}
          <div className="px-5 pt-5 pb-4 border-b border-line bg-surface flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-8 h-8 rounded-lg text-muted hover:text-ac hover:bg-ac/10 border border-line hover:border-ac/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Regresar a expedientes pendientes"
                >
                  <FAIcon icon="arrow-left" size="xs" />
                </button>
              )}

              <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-display font-bold text-xs bg-ac text-white select-none shadow-2xs">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-display font-bold text-ink leading-tight truncate">
                    {readOnly ? 'Información del colaborador' : 'Ficha del empleado'}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                      isActive
                        ? 'text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-muted border-line bg-surfalt'
                    }`}
                  >
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {email ? (
                  <p className="text-xs text-muted truncate mt-0.5 flex items-center gap-1">
                    <FAIcon icon="envelope" size="xs" />
                    <span className="truncate">{email}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted truncate mt-0.5">{fullName}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-muted hover:text-ac hover:bg-ac/10 flex items-center justify-center transition-colors shrink-0 ml-2 cursor-pointer"
              title="Cerrar ventana"
            >
              <FAIcon icon="times" size="sm" />
            </button>
          </div>

          {/* Cuerpo */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-surfalt/30">
            {/* Aviso de campos pendientes */}
            {employee.hasMissingFields && (
              <div className="bg-white dark:bg-surface border border-amber-300 dark:border-amber-500/40 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <FAIcon icon="triangle-exclamation" size="xs" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-display font-bold text-ink">Información pendiente detectada</p>
                    <p className="text-[11.5px] text-muted mt-0.5">
                      Completa los siguientes datos del expediente:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {(missingFields.length ? missingFields : ['Información de expediente']).map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-medium bg-amber-50 dark:bg-amber-500/10 text-ink border border-amber-300 dark:border-amber-500/40 rounded-full leading-none"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 1: Datos Personales */}
            <div className={sectionClass}>
              <SectionHeader icon="user" title="Datos Personales" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
                <div>
                  <FieldLabel pending={isPending('name')}>NOMBRE</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('name')}
                    value={form.name}
                    placeholder="ej. María"
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel pending={isPending('lastname')}>APELLIDO</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('lastname')}
                    value={form.lastname}
                    placeholder="ej. González"
                    onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel pending={isPending('phone')}>TELÉFONO</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('phone')}
                    value={form.phone}
                    placeholder="ej. 7001-0002"
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel pending={isPending('type')}>PUESTO</FieldLabel>
                  <div className="mt-1">
                    <Select
                      disabled={readOnly}
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <FieldLabel pending={isPending('salary')}>SALARIO BASE ($)</FieldLabel>
                  <input
                    type="number"
                    disabled={readOnly}
                    className={inputClass('salary')}
                    value={form.salary}
                    placeholder="ej. 540.00"
                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel pending={isPending('address')}>DIRECCIÓN</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('address')}
                    value={form.address}
                    placeholder="ej. Soyapango, San Salvador"
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Horario y Jornada */}
            <div className={sectionClass}>
              <SectionHeader icon="clock" title="Horario y Jornada" />

              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted tracking-wide block mb-1.5">
                    DÍAS QUE TRABAJA
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map((d) => {
                      const isSelected = form.workDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          disabled={readOnly}
                          onClick={() => toggleDay(d.value)}
                          className={`py-1.5 text-xs font-display font-semibold rounded-full border transition-all text-center cursor-pointer ${
                            isSelected
                              ? 'bg-ac text-white border-ac shadow-2xs'
                              : 'bg-white dark:bg-surface text-inkalt border-line hover:border-ac hover:text-ac'
                          } ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <FieldLabel pending={isPending('scheduleStart')}>HORA DE ENTRADA</FieldLabel>
                    <input
                      type="time"
                      disabled={readOnly}
                      className={inputClass('scheduleStart')}
                      value={form.scheduleStart}
                      onChange={(e) => setForm((f) => ({ ...f, scheduleStart: e.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel pending={isPending('scheduleEnd')}>HORA DE SALIDA</FieldLabel>
                    <input
                      type="time"
                      disabled={readOnly}
                      className={inputClass('scheduleEnd')}
                      value={form.scheduleEnd}
                      onChange={(e) => setForm((f) => ({ ...f, scheduleEnd: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Previsión y Datos Bancarios (ISSS, AFP, Banco) */}
            <div className={sectionClass}>
              <SectionHeader icon="identification-card" title="Previsión y Datos Bancarios" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-3">
                <div>
                  <FieldLabel pending={isPending('isssNumber')}>NÚMERO DE AFILIACIÓN ISSS</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('isssNumber')}
                    value={form.isssNumber}
                    placeholder="ej. 123456789"
                    onChange={(e) => setForm((f) => ({ ...f, isssNumber: e.target.value }))}
                  />
                </div>

                <div>
                  <FieldLabel pending={isPending('afpInstitution')}>INSTITUCIÓN PREVISIONAL AFP</FieldLabel>
                  <div className={`mt-1 ${isPending('afpInstitution') ? 'ring-1 ring-amber-300 dark:ring-amber-500/40' : ''}`}>
                    <Select
                      disabled={readOnly}
                      value={form.afpInstitution}
                      onChange={(e) => setForm((f) => ({ ...f, afpInstitution: e.target.value }))}
                    >
                      {AFP_OPTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <FieldLabel pending={isPending('afpNumber')}>NÚMERO DE AFP (NUP)</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('afpNumber')}
                    value={form.afpNumber}
                    placeholder="ej. 123456789012"
                    onChange={(e) => setForm((f) => ({ ...f, afpNumber: e.target.value }))}
                  />
                </div>

                <div>
                  <FieldLabel pending={isPending('bankName')}>BANCO PARA PAGO DE NÓMINA</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('bankName')}
                    value={form.bankName}
                    placeholder="ej. Banco Agrícola, BAC, Cuscatlán..."
                    onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel pending={isPending('bankAccount')}>NÚMERO DE CUENTA BANCARIA</FieldLabel>
                  <input
                    disabled={readOnly}
                    className={inputClass('bankAccount')}
                    value={form.bankAccount}
                    placeholder="ej. 0123456789012"
                    onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: Acciones de Cuenta */}
            {!readOnly && (
              <div className={sectionClass}>
                <SectionHeader icon="shield" title="Acciones de Cuenta" />

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleSendReset}
                    disabled={sendingInvite}
                    className="px-3 py-2 text-xs font-display font-semibold bg-white dark:bg-surface border border-line text-inkalt hover:border-ac hover:text-ac disabled:opacity-50 inline-flex items-center gap-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <FAIcon icon="key" size="xs" />
                    <span>
                      {sendingInvite ? 'Enviando invitación...' : 'Enviar invitación de contraseña'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmToggleOpen(true)}
                    className={`px-3 py-2 text-xs font-display font-semibold border inline-flex items-center gap-2 rounded-lg transition-colors cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-ac/10 border-ac/30 text-ac hover:bg-ac hover:text-white hover:border-ac'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    <FAIcon icon={isActive ? 'user-slash' : 'user-check'} size="xs" />
                    <span>{isActive ? 'Dar de baja' : 'Reactivar empleado'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pie del modal */}
          <div className="px-5 py-3 border-t border-line bg-surface flex items-center justify-between gap-3">
            <div>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-display font-semibold text-inkalt hover:text-ac bg-surface border border-line hover:border-ac/40 rounded-lg transition-colors cursor-pointer"
                >
                  <FAIcon icon="arrow-left" size="xs" />
                  <span>Volver a expedientes</span>
                </button>
              ) : (
                <span className="text-xs text-muted hidden sm:inline">
                  {readOnly ? 'Modo solo lectura' : 'Cambios sincronizados en el servidor'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-display font-semibold text-inkalt hover:text-ink bg-surface hover:bg-surfalt border border-line rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              {!readOnly && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-display font-semibold text-white bg-ac hover:bg-ac/90 disabled:opacity-60 rounded-lg transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <FAIcon icon={saving ? 'spinner' : 'check'} size="xs" className={saving ? 'animate-spin' : ''} />
                  <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
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
          message={
            isActive
              ? '¿Seguro que deseas dar de baja a este empleado? Ya no podrá iniciar sesión en la plataforma.'
              : '¿Deseas reactivar a este empleado para que retome sus funciones?'
          }
          confirmText={isActive ? 'Dar de baja' : 'Reactivar'}
          variant={isActive ? 'danger' : 'warning'}
          icon={isActive ? 'user-slash' : 'user-check'}
        />
      )}
    </>
  );
};

export default EmployeeDetailModal;
