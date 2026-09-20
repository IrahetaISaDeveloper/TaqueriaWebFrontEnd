// src/components/employee/employeeModal.jsx
import React, { useState, useEffect } from 'react';
import FAIcon from '../commons/FAIcon';
import { PERMISSION_GROUPS } from '../../constants/permissions';

export default function EmployeeModal({ isOpen, onClose, employeeData, onSave }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (employeeData) {
      setSelected(employeeData.permissions || []);
    }
  }, [employeeData, isOpen]);

  if (!isOpen || !employeeData) return null;

  const togglePermiso = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleGroup = (groupPerms, allSelected) => {
    const ids = groupPerms.map((p) => p.id);
    setSelected((prev) => {
      if (allSelected) return prev.filter((p) => !ids.includes(p));
      const merged = new Set([...prev, ...ids]);
      return Array.from(merged);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(employeeData._id || employeeData.id, { permissions: selected });
  };

  const firstName = employeeData.personalInfo?.name || '';
  const lastName = employeeData.personalInfo?.lastname || '';
  const fullEmployeeName = `${firstName} ${lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surfalt rounded-none w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-line">
        {/* Cabecera roja con relieve */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-ac text-white">
          <h2 className="text-base sm:text-lg font-display font-bold">Permisos del empleado</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-none hover:bg-surface/10 transition-all"
          >
            <FAIcon icon="times" size="lg" />
          </button>
        </div>

        {/* Nombre del empleado */}
        <div className="bg-surface backdrop-blur-sm px-4 sm:px-6 py-3 border-b border-line flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ac"></span>
          <p className="text-sm text-inkalt">
            Empleado: <span className="font-display font-bold text-ink">{fullEmployeeName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          <p className="text-xs text-muted">
            Marca a qué pantallas y funciones puede acceder este empleado. Si le das su primer
            permiso, el sistema le mandará un código de acceso a su correo.
          </p>

          {Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => {
            const allSelected = perms.every((p) => selected.includes(p.id));
            return (
              <div key={groupName}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-display font-bold text-muted uppercase tracking-wider">{groupName}</h3>
                  <button
                    type="button"
                    onClick={() => toggleGroup(perms, allSelected)}
                    className="text-[11px] font-display font-semibold text-ac hover:text-ac"
                  >
                    {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map((p) => {
                    const checked = selected.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePermiso(p.id)}
                        className={`flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-none border transition-colors ${
                          checked ? 'bg-acsoft border-acline' : 'bg-surface border-line hover:border-line'
                        }`}
                      >
                        <span className={`text-xs font-display font-semibold ${checked ? 'text-ac' : 'text-inkalt'}`}>{p.label}</span>
                        <span className={`w-5 h-5 rounded-none flex items-center justify-center shrink-0 border ${checked ? 'bg-ac border-ac text-white' : 'border-linealt text-transparent'}`}>
                          <FAIcon icon="check" size="xs" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-line text-inkalt rounded-none hover:bg-linealt font-display font-semibold text-sm transition-all
              "
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-ac text-white rounded-none hover:bg-ac font-display font-semibold text-sm transition-all
                active:
              "
            >
              Aplicar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
