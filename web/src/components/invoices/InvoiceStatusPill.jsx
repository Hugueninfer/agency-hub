export default function InvoiceStatusPill({ status }) {
  const normalized = typeof status === "string" ? status.toLowerCase() : "draft";
  const palette = {
    draft: {
      bg: "var(--color-surface-muted)",
      fg: "var(--color-txt-secondary)",
      label: "Draft",
    },
    sent: {
      bg: "var(--color-accent-purple-soft)",
      fg: "var(--color-accent-purple)",
      label: "Sent",
    },
    paid: {
      bg: "rgba(34,197,94,0.14)",
      fg: "rgb(22,163,74)",
      label: "Paid",
    },
  };
  const tone = palette[normalized] ?? palette.draft;

  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-caption font-medium"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {tone.label}
    </span>
  );
}
