import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getConfig } from "../api/config";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import DemoEntryCard from "../components/auth/DemoEntryCard";

export default function LoginPage() {
  const { login, startDemo } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [action, setAction] = useState(null);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getConfig().then((next) => { if (!cancelled) setConfig(next); })
      .catch(() => { if (!cancelled) setConfig(null); })
      .finally(() => { if (!cancelled) setConfigLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function submit(kind) {
    if (pending.current) return;
    pending.current = true;
    setAction(kind);
    setError(null);
    try {
      if (kind === "demo") await startDemo();
      else await login(email.trim(), password);
      navigate(kind === "demo" ? "/" : from, { replace: true });
    } catch (err) {
      setError(err?.message || "Não foi possível entrar. Tente novamente.");
    } finally {
      pending.current = false;
      setAction(null);
    }
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-4">
        <div className="flex justify-end">
          <button type="button" onClick={toggle} className="btn-secondary" aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}>{dark ? "Tema claro" : "Tema escuro"}</button>
        </div>
        <main className="card auth-card grid overflow-hidden md:grid-cols-2">
          <section className="auth-product flex flex-col justify-between gap-12 p-6 md:p-10">
            <div>
              <span className="chip mb-6">Seu workspace, conectado</span>
              <h1 className="text-4xl font-semibold tracking-tight">Agency Hub</h1>
              <p className="text-xl leading-relaxed mt-5">Projetos, tarefas, horas e faturamento em um só workspace.</p>
            </div>
            <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>Do planejamento à entrega, acompanhe o trabalho da sua equipe em um só lugar.</p>
          </section>
          <div className="p-6 md:p-10 space-y-8">
            <section aria-labelledby="personal-heading" className="space-y-5">
              <div>
                <h2 id="personal-heading" className="text-title font-semibold">Entrar na minha conta</h2>
                <p className="text-body mt-2" style={{ color: "var(--color-txt-secondary)" }}>Use seu acesso pessoal ao workspace.</p>
              </div>
              {(error || location.state?.message) && <p role="alert" className="auth-alert rounded-control p-3 text-body">{error || location.state.message}</p>}
              <form className="space-y-4" aria-busy={action === "personal"} onSubmit={(event) => { event.preventDefault(); submit("personal"); }}>
                <label className="block space-y-1.5"><span className="text-caption font-medium">Email</span><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="form-control-themed w-full" /></label>
                <label className="block space-y-1.5"><span className="text-caption font-medium">Senha</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="form-control-themed w-full" /></label>
                <button type="submit" disabled={Boolean(action)} aria-busy={action === "personal"} className="btn-primary w-full justify-center disabled:opacity-60">{action === "personal" ? "Entrando…" : "Entrar na minha conta"}</button>
              </form>
            </section>
            <DemoEntryCard available={config?.demo_available === true} loading={configLoading} busy={action === "demo"} disabled={Boolean(action)} onStart={() => submit("demo")} />
          </div>
        </main>
      </div>
    </div>
  );
}
