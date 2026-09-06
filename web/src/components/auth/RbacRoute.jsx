import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * Authenticated users without any RBAC-related permission are redirected home.
 * Child routes assume ProtectedRoute already ensured a session.
 */
export default function RbacRoute({ children }) {
  const { canAccessRbacPage } = useAuth();

  if (!canAccessRbacPage) {
    return <Navigate to="/" replace />;
  }

  return children;
}
