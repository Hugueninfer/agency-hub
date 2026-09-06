import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * /login only: authenticated users are redirected into the app.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="p-6">Carregando sessão…</p>;
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}
