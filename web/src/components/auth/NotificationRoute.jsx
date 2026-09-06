import { Navigate } from "react-router-dom";
import { NOTIFICATION_NAV_PERMISSIONS } from "../../constants/rbacPermissions";
import { useAuth } from "../../hooks/useAuth";

export default function NotificationRoute({ children }) {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(NOTIFICATION_NAV_PERMISSIONS)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
