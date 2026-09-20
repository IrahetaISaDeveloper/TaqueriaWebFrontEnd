// src/components/chat/ChatDynamicForm.jsx
// Formulario genérico que el asistente de IA "dibuja" dentro del chat cuando
// le faltó un dato obligatorio para ejecutar una acción. El esquema (fields)
// lo define cada herramienta en el backend (ver assistantTools.js), así que
// este componente no sabe nada de negocio: solo sabe pintar text/number/select.
import React, { useState } from 'react';
import FAIcon from '../commons/FAIcon';
import Select from '../commons/Select';

const ChatDynamicForm = ({ formRequest, onSubmit, disabled }) => {
  const [values, setValues] = useState(() => ({ ...formRequest.knownArgs }));
  const [sent, setSent] = useState(false);

  const handleChange = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (sent) return;
    setSent(true);
    onSubmit(formRequest.tool, values);
  };

  return (
    <div className="max-w-[90%] bg-surface rounded-none rounded-bl-sm border border-line p-3">
      <div className="flex items-center gap-2 mb-2 text-inkalt">
        <FAIcon icon="list-check" size="xs" className="text-ac" />
        <p className="text-xs font-display font-semibold">Completa estos datos</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        {formRequest.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-[11px] font-display font-semibold text-muted mb-0.5">
              {field.label}{field.required && <span className="text-ac"> *</span>}
            </label>
            {field.type === 'select' ? (
              <Select
                size="sm"
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                disabled={disabled || sent}
                required={field.required}
              >
                <option value="">Selecciona...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                disabled={disabled || sent}
                required={field.required}
                className="w-full px-2.5 py-1.5 bg-surfalt border border-line rounded-none text-xs text-inkalt placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acline"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={disabled || sent}
          className="w-full mt-1 px-3 py-1.5 bg-ac hover:bg-ac text-white text-xs font-display font-semibold rounded-none transition-colors disabled:opacity-50"
        >
          {sent ? 'Enviado' : 'Enviar'}
        </button>
      </form>
    </div>
  );
};

export default ChatDynamicForm;
