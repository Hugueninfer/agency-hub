import { useEffect, useState } from "react";

/**
 * Modal de confirmação coerente com os outros diálogos (overlay + card radius 28).
 * onConfirm deve retornar Promise; em caso de erro, relançar para manter o diálogo aberto.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pendingLabel = "Working…",
  zIndexClass = "z-[60]",
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* erro tratado pela página — manter modal aberto */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${zIndexClass}`}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
        className="w-full max-w-md rounded-[28px] p-6 md:p-7 shadow-[var(--shadow-card-hover)]"
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-title-md font-semibold"
          style={{ color: "var(--color-txt-primary)" }}
        >
          {title}
        </h2>
        {description ? (
          <p
            id="confirm-dialog-desc"
            className="mt-2 text-body leading-relaxed"
            style={{ color: "var(--color-txt-secondary)" }}
          >
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-control border border-[var(--color-border)] px-4 py-2.5 text-body font-medium transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-surface-muted)",
              color: "var(--color-txt-primary)",
            }}
            onClick={() => !busy && onClose()}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            className="btn-delete-soft disabled:opacity-50"
            onClick={() => void confirm()}
          >
            {busy ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
