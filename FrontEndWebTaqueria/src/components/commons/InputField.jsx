// components/InputField.jsx
import React from 'react';

export default function InputField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-inkalt mb-1">
          {label}
          {required && <span className="text-ac ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-none focus:ring-2 focus:ring-red-400 focus:border-acline outline-none transition ${
          error ? 'border-ac' : 'border-linealt'
        } ${disabled ? 'bg-surfalt cursor-not-allowed' : ''}`}
        {...props}
      />
      {error && <p className="text-ac text-xs mt-1">{error}</p>}
    </div>
  );
}