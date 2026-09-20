// src/components/commons/Select.jsx
//
// Reemplazo de <select> con menú desplegable propio.
//
// Tanto el botón cerrado como el menú abierto llevan el mismo lenguaje
// visual "clay" del resto del sistema (fondo hueso, sombra interior, flecha
// propia): un <select> nativo no permite estilizar sus <option> con CSS en
// absoluto (esa parte la pinta el sistema operativo, no la página), así que
// la única forma de darle diseño al menú desplegado es no usar <select> ahí
// — se dibuja un menú propio (un <div> con botones) que aparece al hacer
// clic sobre el mismo botón "clay" que ya tienen el resto de los controles.
//
// Sigue aceptando <option>/<optgroup> como children (mismo uso que un select
// de verdad) para no tener que tocar cada pantalla que ya lo usa así: este
// componente las lee para armar la lista de opciones, pero nunca las
// renderiza como HTML real.
//
// Compatible con react-hook-form: `{...register('campo')}` funciona porque
// se reenvía el `ref` a un <input type="hidden"> real (donde RHF necesita
// engancharse) y se disparan sus onChange/onBlur "a mano" al elegir una
// opción — es el patrón estándar para integrar un control no nativo con RHF
// sin tener que envolver cada uso en <Controller>.
import React, { forwardRef, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import FAIcon from './FAIcon';

const SIZE_CLASSES = {
  // Filtros de encabezado: más chico, para no competir con el título.
  sm: 'px-3 py-1.5 text-xs rounded-none',
  // Campos de formulario: mismo tamaño que el resto de inputs del sistema.
  md: 'px-4 py-2.5 text-sm rounded-none',
};

// Recorre los children (<option>/<optgroup>) y arma una lista plana de
// { value, label, disabled, group } — es la única razón por la que se siguen
// aceptando como children: para no reescribir las ~35 pantallas que ya
// declaran sus opciones así.
const parseOptions = (children) => {
  const options = [];

  React.Children.forEach(children, (child) => {
    if (!child) return;

    if (child.type === 'optgroup') {
      React.Children.forEach(child.props.children, (opt) => {
        if (!opt) return;
        options.push({
          value: opt.props.value,
          label: opt.props.children,
          disabled: opt.props.disabled,
          group: child.props.label,
        });
      });
      return;
    }

    // <option>
    options.push({
      value: child.props.value,
      label: child.props.children,
      disabled: child.props.disabled,
      group: null,
    });
  });

  return options;
};

// Mismo fondo "clay" que el resto de inputs/botones del sistema.
// "ghost": sin borde/fondo propio, para cuando el select vive dentro de OTRO
// contenedor que ya trae su propio borde/fondo (ej. un control combinado
// select + botón) — evita el doble relieve.
const TRIGGER_VARIANT_CLASSES = {
  default: `bg-surfalt border border-line`,
  ghost: 'border-0 bg-transparent',
};

const Select = forwardRef(({
  size = 'md',
  variant = 'default',
  className = '',
  children,
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  disabled = false,
  placeholder,
  ...rest
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  // No controlado: si no viene `value` de fuera (poco común, pero por si
  // algún llamador usa defaultValue como un <select> nativo normal).
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const currentValue = value !== undefined ? value : internalValue;

  const containerRef = useRef(null);
  const hiddenInputRef = useRef(null);

  const options = useMemo(() => parseOptions(children), [children]);
  const selected = options.find((o) => String(o.value) === String(currentValue));

  // Agrupa por "group" preservando el orden en que aparecen, para poder
  // pintar los <optgroup> como encabezados de sección en el menú.
  const groupedOptions = useMemo(() => {
    const groups = [];
    let current = null;

    options.forEach((opt) => {
      if (opt.group !== current?.label) {
        current = { label: opt.group, items: [] };
        groups.push(current);
      }
      current.items.push(opt);
    });

    return groups;
  }, [options]);

  // Cerrar al hacer clic fuera, igual que cualquier otro menú del sistema.
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fireChange = useCallback((newValue) => {
    if (value === undefined) setInternalValue(newValue);

    // Evento sintético mínimo, suficiente para un onChange normal (e =>
    // e.target.value) y para el que arma react-hook-form vía register().
    const target = hiddenInputRef.current;
    if (target) target.value = newValue;
    onChange?.({ target: { name, value: newValue }, currentTarget: { name, value: newValue } });
  }, [value, name, onChange]);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    fireChange(opt.value);
    setIsOpen(false);
    onBlur?.({ target: { name, value: opt.value } });
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  // El ancho lo controla el contenedor externo, no el botón: así un
  // className="w-auto" (o cualquier ancho fijo) afecta al layout de verdad
  // en un flex-wrap, en vez de quedar atrapado dentro de un padre que sigue
  // ocupando el 100% de la fila.
  const containerWidthClass = className || 'w-full';

  return (
    <div ref={containerRef} className={`relative inline-block ${containerWidthClass}`}>
      {/* Botón cerrado: mismo fondo "clay" que el resto de inputs del
          sistema, con la flecha propia (un <select> nativo no siempre
          muestra una consistente entre navegadores). */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 font-display font-medium text-inkalt
          focus:outline-none focus:ring-2 focus:ring-acline transition-shadow
          disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
          ${TRIGGER_VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`}
        {...rest}
      >
        <span className={`truncate ${!selected ? 'text-muted' : ''}`}>
          {selected ? selected.label : (placeholder || '')}
        </span>
        <FAIcon icon="chevron-down" size="xs" className="text-muted shrink-0" />
      </button>

      {/* Input oculto: es donde react-hook-form engancha su ref/name cuando
          se usa {...register(...)}, y lo que hace que el "value" real del
          campo exista en el DOM (por si algo lo lee de ahí). */}
      <input ref={ref ?? hiddenInputRef} type="hidden" name={name} value={currentValue} readOnly />

      {/* Menú desplegable con diseño propio: es la parte que un <select>
          nativo nunca deja tocar. */}
      {isOpen && !disabled && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-none border border-line bg-surfalt p-1.5"
        >
          {groupedOptions.map((group, gi) => (
            <div key={group.label ?? `g${gi}`}>
              {group.label && (
                <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-display font-bold uppercase tracking-wider text-muted">
                  {group.label}
                </p>
              )}
              {group.items.map((opt, oi) => {
                const isSelected = String(opt.value) === String(currentValue);
                return (
                  <button
                    key={`${opt.value}-${oi}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-2.5 py-2 rounded-none text-sm font-display font-medium transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${isSelected
                        ? 'bg-ac text-white'
                        : 'text-inkalt hover:bg-acsoft hover:text-ac'}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ))}
          {options.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-muted">Sin opciones</p>
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
