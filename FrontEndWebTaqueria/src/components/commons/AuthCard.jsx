import React from 'react'

const AuthCard = ({ children }) => {
  return (
    <div className="w-full max-w-md bg-surface rounded-none border border-line p-6 sm:p-8 relative">
      {children}
    </div>
  )
}

export default AuthCard