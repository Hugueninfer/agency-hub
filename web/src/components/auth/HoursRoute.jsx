import { Navigate } from "react-router-dom";
import { TIME_NAV_PERMISSIONS } from "../../constants/rbacPermissions";
import { useAuth } from "../../hooks/useAuth";

export default function HoursRoute({ children }) {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(TIME_NAV_PERMISSIONS)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
