// components/auth/publicRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';

// Envuelve las rutas PÚBLICAS (login, recuperación de contraseña, etc.).
// Es el espejo de ProtectedRoute: aquí la lógica es al revés, si el
// usuario YA tiene sesión iniciada, no tiene sentido que vea el login de
// nuevo, así que lo mandamos directo al menú principal.
export default function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Mientras se resuelve /auth/me, mostramos un loader en vez de decidir
  // a ciegas. Esto evita que alguien con sesión activa vea un parpadeo
  // del login antes de ser redirigido al dashboard.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surfalt">
        <p className="text-muted text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}