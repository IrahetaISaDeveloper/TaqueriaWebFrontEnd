// components/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'orange',
  text = '',
  className = ''
}) {
  const sizeMap = {
    sm: 20,
    md: 32,
    lg: 48,
    xl: 64
  };

  const colorMap = {
    orange: '#FB923C',
    white: '#FFFFFF',
    gray: '#9CA3AF',
    primary: '#3B82F6',
    green: '#22C55E',
    red: '#EF4444'
  };

  const dimension = sizeMap[size] || sizeMap.md;
  const strokeColor = colorMap[color] || colorMap.orange;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        className="animate-spin"
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        role="status"
        aria-label="Cargando"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke={strokeColor}
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill={strokeColor}
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && <p className="mt-2 text-sm text-muted">{text}</p>}
    </div>
  );
}