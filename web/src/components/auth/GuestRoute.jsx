import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * /login only: authenticated users are redirected into the app.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}
