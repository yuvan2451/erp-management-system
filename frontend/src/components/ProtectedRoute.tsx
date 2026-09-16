import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/**
 * Protects ERP routes from unauthenticated users.
 *
 * If the user has no JWT, they are redirected to Login.
 * Otherwise, the requested child route is rendered.
 */
export default function ProtectedRoute() {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}