import React, { useState, useEffect } from 'react'
import FAIcon from '../commons/FAIcon'

// Pide la contraseña de un administrador para autorizar la cancelación de un
// pedido ya tomado (a diferencia de un simple "Eliminar", esto queda
// registrado como "cancelled" en vez de borrarse).
export default function CancelOrderModal({ isOpen, onClose, onConfirm, orderCode, loading }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Ingresa la contraseña del administrador')
      return
    }
    const result = await onConfirm(password)
    if (result && result.success === false) {
      setError(result.message || 'Contraseña incorrecta')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface rounded-none border border-line max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-acsoft flex items-center justify-center flex-shrink-0">
            <FAIcon icon="ban" className="text-ac" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-display font-bold text-ink mb-1">Cancelar pedido {orderCode}</h3>
            <p className="text-sm text-inkalt leading-relaxed">
              Esta acción requiere autorización de un administrador. Ingresa su contraseña para confirmar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
            Contraseña del administrador
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt text-sm"
          />
          {error && (
            <span className="text-ac text-xs mt-1.5 block font-medium">{error}</span>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-display font-semibold text-inkalt bg-surfalt hover:bg-line rounded-none transition-colors disabled:opacity-50 cursor-pointer"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm font-display font-semibold text-white rounded-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer bg-ac hover:bg-ac"
            >
              {loading ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
