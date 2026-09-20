import React, { createContext, useContext, useState, useCallback } from 'react'
import FAIcon from './FAIcon'

const ToastContext = createContext(null)

// Tipos: success, error, info, warning
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider')
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Contenedor de toasts fijo abajo-derecha */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-none text-sm font-medium transition-all transform translate-x-0 opacity-100 ${
              toast.type === 'success' ? 'bg-ok text-white' :
              toast.type === 'error' ? 'bg-ac text-white' :
              toast.type === 'warning' ? 'bg-warn text-white' :
              'bg-info text-white'
            }`}
          >
            <FAIcon
              icon={
                toast.type === 'success' ? 'check-circle' :
                toast.type === 'error' ? 'times-circle' :
                toast.type === 'warning' ? 'exclamation-triangle' :
                'info-circle'
              }
            />
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100">
              <FAIcon icon="times" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}