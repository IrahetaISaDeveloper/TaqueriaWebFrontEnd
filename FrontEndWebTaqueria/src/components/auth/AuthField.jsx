// Campo de las pantallas de autenticación: mismo trato visual que los del
// login (icono a la izquierda, ojo para revelar la contraseña), pero aquí
// además muestra el error de validación debajo.
import { useState } from 'react';
import FAIcon from '../commons/FAIcon';

const AuthField = ({
  id, label, icon, type, name, value, onChange, placeholder, disabled, error, autoFocus,
}) => {
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="kick block text-muted mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <FAIcon icon={icon} size="sm" />
          </span>
        )}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full ${icon ? 'pl-9' : 'pl-3'} ${isPassword ? 'pr-10' : 'pr-3'} py-2.5 text-[13px]
            bg-bg border ${error ? 'border-ac' : 'border-linealt'} text-ink placeholder:text-muted
            focus:outline-none focus:border-ac focus:ring-1 focus:ring-acline transition-colors
            disabled:opacity-60`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-inkalt transition-colors"
          >
            <FAIcon icon={visible ? 'eye-slash' : 'eye'} size="sm" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-ac mt-1.5">{error}</p>}
    </div>
  );
};

export default AuthField;
