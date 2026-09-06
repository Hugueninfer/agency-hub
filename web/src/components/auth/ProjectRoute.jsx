import { Navigate } from "react-router-dom";
import { PROJECT_NAV_PERMISSIONS } from "../../constants/rbacPermissions";
import { useAuth } from "../../hooks/useAuth";

/**
 * Users with no project-related permission cannot open /projects.
 */
export default function ProjectRoute({ children }) {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(PROJECT_NAV_PERMISSIONS)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
