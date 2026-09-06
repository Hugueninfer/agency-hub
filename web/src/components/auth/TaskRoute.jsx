import { Navigate } from "react-router-dom";
import { TASK_NAV_PERMISSIONS } from "../../constants/rbacPermissions";
import { useAuth } from "../../hooks/useAuth";

export default function TaskRoute({ children }) {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(TASK_NAV_PERMISSIONS)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
