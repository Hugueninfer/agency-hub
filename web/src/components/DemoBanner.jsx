import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function DemoBanner() {
  const { user } = useAuth();
  if (user?.is_demo !== true) return null;
  return (
    <aside className="demo-banner flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-caption">
      <span>Demonstração · seus dados fictícios ficam neste espaço por 24 horas.</span>
      <Link to="/settings/menu" className="underline font-medium">Gerenciar demonstração</Link>
    </aside>
  );
}
