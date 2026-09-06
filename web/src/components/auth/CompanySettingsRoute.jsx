import { Navigate } from "react-router-dom";
import { SETTINGS_NAV_PERMISSIONS } from "../../constants/rbacPermissions";
import { useAuth } from "../../hooks/useAuth";

export default function CompanySettingsRoute({ children }) {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(SETTINGS_NAV_PERMISSIONS)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
