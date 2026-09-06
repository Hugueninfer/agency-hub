export default function DemoEntryCard({ available, loading, busy, disabled, onStart }) {
  return (
    <section className="demo-entry space-y-4" aria-labelledby="demo-heading">
      <div>
        <h2 id="demo-heading" className="text-title font-semibold">Experimentar demonstração</h2>
        <p className="text-body mt-2" style={{ color: "var(--color-txt-secondary)" }}>Sem cadastro. Dados fictícios em um espaço exclusivo por 24 horas.</p>
      </div>
      <button type="button" className="btn-secondary w-full justify-center disabled:opacity-60" disabled={disabled || loading || !available} aria-busy={busy} onClick={onStart}>
        {busy ? "Preparando demonstração…" : "Experimentar demonstração"}
      </button>
      {loading && <p className="text-caption">Verificando disponibilidade…</p>}
      {!loading && !available && <p className="text-caption">Demonstração indisponível no momento.</p>}
    </section>
  );
}
