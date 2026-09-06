/**
 * Shared workspace page chrome — lime canvas + white rounded panels (matches Projects baseline).
 */

/** Outer width + horizontal padding — same for Projects, Tasks, RBAC, and Overview (wide Kanban-friendly column). */
const PAGE_MAX_W = "max-w-[1600px]";

export function PageShell({ children, className = "" }) {
  return (
    <div
      className={`mx-auto w-full ${PAGE_MAX_W} space-y-6 px-4 pb-12 md:space-y-6 md:px-8 lg:px-10 xl:px-14 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function Panel({ children, className = "", title = null }) {
  return (
    <div
      className={`rounded-[28px] p-6 md:p-8 transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] ${className}`}
      style={{
        backgroundColor: "var(--color-card)",
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      {title ? (
        <h2 className="text-body-strong mb-5 font-semibold tracking-tight" style={{ color: "var(--color-txt-primary)" }}>
          {title}
        </h2>
      ) : null}
      {children}
    </div>
  );
}

export function StatChip({ label, value }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-caption font-medium"
      style={{
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
        color: "var(--color-txt-primary)",
      }}
    >
      <span
        className="flex h-6 min-w-[1.25rem] items-center justify-center rounded-lg px-1.5 text-caption font-semibold"
        style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
      >
        {value}
      </span>
      <span style={{ color: "var(--color-txt-secondary)" }}>{label}</span>
    </div>
  );
}

/**
 * @param {{ eyebrow?: string, eyebrowVariant?: "workspace" | "accent", title: string, description?: string, titleAddon?: import("react").ReactNode, footer?: import("react").ReactNode, onRefresh?: () => void, refreshDisabled?: boolean, refreshTitle?: string }} props
 */
export function WorkspaceHero({
  eyebrow = "Workspace",
  eyebrowVariant = "workspace",
  title,
  description,
  titleAddon = null,
  footer = null,
  onRefresh,
  refreshDisabled = false,
  refreshTitle = "Refresh",
}) {
  const dotBg =
    eyebrowVariant === "accent"
      ? "var(--color-accent-purple)"
      : "var(--color-accent-lime-strong, #CFE14A)";

  return (
    <Panel>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: dotBg }}
              aria-hidden
            />
            <p className="text-caption font-medium uppercase tracking-wide" style={{ color: "var(--color-txt-muted)" }}>
              {eyebrow}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-title-lg font-semibold tracking-tight" style={{ color: "var(--color-txt-primary)" }}>
              {title}
            </h1>
            {titleAddon}
          </div>
          {description ? (
            <p className="max-w-2xl text-body leading-relaxed" style={{ color: "var(--color-txt-secondary)" }}>
              {description}
            </p>
          ) : null}
          {footer ? <div className="flex flex-wrap gap-2 pt-4">{footer}</div> : null}
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled}
            className="icon-btn h-11 w-11 shrink-0 self-start disabled:opacity-50 sm:self-auto"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
            aria-label={refreshTitle}
            title={refreshTitle}
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M21 12a9 9 0 00-9-9 9.75 9.75 0 00-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 009 9 9.75 9.75 0 006.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        ) : null}
      </div>
    </Panel>
  );
}

export function AlertBanner({ banner, onDismiss }) {
  if (!banner) return null;
  const ok = banner.type === "ok";
  const toneBg = ok ? "var(--color-success-soft)" : "var(--color-surface-muted)";
  const toneBorder = ok ? "var(--color-success-border)" : "var(--color-border)";
  const accentColor = ok ? "var(--color-accent-lime-strong, #CFE14A)" : "var(--color-accent-purple)";
  const titleColor = "var(--color-txt-primary)";
  const bodyColor = "var(--color-txt-secondary)";
  return (
    <Panel className="!rounded-[24px] !p-4 md:!p-5">
      <div
        className="flex items-center justify-between gap-4"
        style={{
          borderRadius: "16px",
          padding: "12px 16px",
          backgroundColor: toneBg,
          border: `1px solid ${toneBorder}`,
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: accentColor,
            }}
            aria-hidden
          >
            {ok ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </span>
          <p className="text-body-strong" style={{ color: titleColor }}>
            {banner.text}
          </p>
          <div className="min-w-0">
            {Array.isArray(banner.extra) && banner.extra.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-caption" style={{ color: bodyColor }}>
                {banner.extra.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="icon-btn h-9 w-9 shrink-0"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-txt-primary)",
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        ) : null}
      </div>
    </Panel>
  );
}
