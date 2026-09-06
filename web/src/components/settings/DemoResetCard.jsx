import { useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export default function DemoResetCard() {
  const { user, resetDemo } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);
  const trigger = useRef(null);
  if (user?.is_demo !== true) return null;

  function cancel() {
    setConfirming(false);
    trigger.current?.focus();
  }
  async function reset() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await resetDemo();
      setConfirming(false);
    } catch (err) {
      setError(err.message || "Não foi possível reiniciar a demonstração.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-3" aria-labelledby="demo-reset-title">
      <h2 id="demo-reset-title" className="text-title font-semibold">Sua demonstração</h2>
      <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>Volte aos dados fictícios iniciais deste espaço. O prazo de 24 horas permanece o mesmo.</p>
      <button ref={trigger} type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(true)}>Reiniciar demonstração</button>
      {confirming && (
        <div role="alertdialog" aria-labelledby="demo-confirm-title" aria-describedby="demo-confirm-description" aria-busy={busy} className="space-y-3" onKeyDown={(event) => { if (event.key === "Escape" && !busy) cancel(); }}>
          <h3 id="demo-confirm-title" className="font-semibold">Reiniciar este espaço?</h3>
          <p id="demo-confirm-description" className="text-body">Todas as alterações atuais serão substituídas pelos dados fictícios iniciais. Apenas esta demonstração será afetada.</p>
          <div className="flex flex-wrap gap-3">
            <button autoFocus type="button" className="btn-secondary" disabled={busy} onClick={cancel}>Cancelar</button>
            <button type="button" className="btn-delete-soft" disabled={busy} aria-busy={busy} onClick={reset}>{busy ? "Reiniciando…" : "Confirmar reinício"}</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-body">{error}</p>}
    </section>
  );
}
