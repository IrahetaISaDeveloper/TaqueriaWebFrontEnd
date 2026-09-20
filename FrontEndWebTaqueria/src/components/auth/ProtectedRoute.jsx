// components/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { hasPermission } from '../../constants/permissions';
import ErrorScreen from '../../pages/ErrorScreen';

// Envuelve cualquier página privada. Mientras se resuelve /auth/me muestra
// un loader simple para evitar el "parpadeo" de mandar al login por error
// antes de que la petición termine.
//
// requiredPermission (opcional): id del catálogo de permisos que la pantalla
// necesita. Los admins siempre pasan; a un empleado sin ese permiso se le
// muestra la pantalla de "no autorizado" (403) en vez de dejarlo ver una
// pantalla que el admin no le habilitó.
export default function ProtectedRoute({ children, requiredPermission }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surfalt">
        <p className="text-muted text-sm">Verificando sesión...</p>
      </div>
    );
  }

  // Sin sesión iniciada (401): esto sigue mandando al login como antes,
  // sin pasar por la pantalla de error.
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Con sesión pero sin el permiso requerido (403): antes se mandaba en
  // silencio al dashboard; ahora se explica por qué no puede entrar.
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <ErrorScreen variant={403} />;
  }

  return children;
}
