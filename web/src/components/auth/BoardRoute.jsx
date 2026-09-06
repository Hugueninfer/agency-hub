import { Navigate } from "react-router-dom";
import { BOARD_NAV_PERMISSIONS } from "../../constants/rbacPermissions";
import { useAuth } from "../../hooks/useAuth";

export default function BoardRoute({ children }) {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(BOARD_NAV_PERMISSIONS)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
