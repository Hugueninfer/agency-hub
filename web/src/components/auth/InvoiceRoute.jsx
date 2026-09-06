import { Navigate } from "react-router-dom";
import { INVOICE_NAV_PERMISSIONS } from "../../constants/rbacPermissions";
import { useAuth } from "../../hooks/useAuth";

export default function InvoiceRoute({ children }) {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(INVOICE_NAV_PERMISSIONS)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
