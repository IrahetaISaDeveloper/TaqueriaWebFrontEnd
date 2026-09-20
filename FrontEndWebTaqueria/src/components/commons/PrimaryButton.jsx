import React from 'react'

const PrimaryButton = ({ children, onClick, className = '', disabled = false, type = 'button' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-white font-display font-semibold py-3 rounded-none transition-all bg-ac hover:bg-ac active: disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  )
}

export default PrimaryButton