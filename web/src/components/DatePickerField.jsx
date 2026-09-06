import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Local YYYY-MM-DD from Date (no UTC shift). */
function isoFromLocalDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIso(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const dt = new Date(y, mo - 1, da);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== da) return null;
  return dt;
}

const WEEK_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildMonthCells(viewYear, viewMonth) {
  const lead = new Date(viewYear, viewMonth, 1).getDay();
  const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = 0; i < lead; i++) {
    const day = prevMonthLast - lead + 1 + i;
    const d = new Date(viewYear, viewMonth - 1, day);
    cells.push({ date: d, iso: isoFromLocalDate(d), inMonth: false });
  }
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(viewYear, viewMonth, d);
    cells.push({ date: dt, iso: isoFromLocalDate(dt), inMonth: true });
  }
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  let n = 1;
  while (cells.length < 42) {
    const d = new Date(nextYear, nextMonth, n);
    cells.push({ date: d, iso: isoFromLocalDate(d), inMonth: false });
    n++;
  }
  return cells;
}

function CalendarIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Theme-aligned date picker (replaces native `<input type="date">` popup styling).
 * Value/onChange use **YYYY-MM-DD** strings.
 */
export default function DatePickerField({
  value,
  onChange,
  min,
  max,
  disabled,
  className = "",
  id,
  showClear = true,
  placeholder = "Select date",
}) {
  const genId = useId();
  const btnId = id ?? genId;
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selected = parseIso(value);
  const todayStr = isoFromLocalDate(new Date());

  const [viewYear, setViewYear] = useState(() => {
    const base = selected ?? new Date();
    return base.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selected ?? new Date();
    return base.getMonth();
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(viewYear, viewMonth, 1),
      ),
    [viewYear, viewMonth],
  );

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const isOutOfRange = useCallback(
    (iso) => {
      if (min && iso < min) return true;
      if (max && iso > max) return true;
      return false;
    },
    [min, max],
  );

  const displayText = selected
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(selected)
    : "";

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const pick = (iso) => {
    if (isOutOfRange(iso)) return;
    onChange(iso);
    setOpen(false);
  };

  const pickToday = () => {
    if (isOutOfRange(todayStr)) return;
    onChange(todayStr);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  const todayDisabled = isOutOfRange(todayStr);

  function toggleOpen() {
    if (disabled) return;
    if (!open) {
      const base = selected ?? new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        id={btnId}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggleOpen}
        className="form-control-themed flex min-h-[42px] w-full items-center justify-between gap-2 rounded-control px-3 py-2 text-left text-body transition-[border-color,box-shadow]"
        style={{
          color: "var(--color-txt-primary)",
          ...(open
            ? {
                borderColor: "var(--color-border-strong)",
                boxShadow: "0 0 0 2px color-mix(in srgb, var(--color-accent-purple) 28%, transparent)",
              }
            : {}),
        }}
      >
        <span className={selected ? "truncate" : "truncate opacity-60"} style={{ color: "var(--color-txt-primary)" }}>
          {selected ? displayText : placeholder}
        </span>
        <span className="shrink-0 opacity-80" style={{ color: "var(--color-accent-purple)" }}>
          <CalendarIcon className="block" />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute left-0 top-full z-[100] mt-1.5 w-[min(100vw-2rem,300px)] rounded-[20px] border p-3 shadow-xl"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card-hover)",
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="icon-btn h-9 w-9 shrink-0 rounded-xl p-0"
              aria-label="Previous month"
              onClick={goPrev}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="min-w-0 flex-1 text-center text-caption font-semibold capitalize" style={{ color: "var(--color-txt-primary)" }}>
              {monthTitle}
            </span>
            <button
              type="button"
              className="icon-btn h-9 w-9 shrink-0 rounded-xl p-0"
              aria-label="Next month"
              onClick={goNext}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEK_LABELS.map((w) => (
              <span key={w} className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-txt-muted)" }}>
                {w}
              </span>
            ))}
            {cells.map((cell, idx) => {
              const isSel = value === cell.iso;
              const isToday = cell.iso === todayStr;
              const muted = !cell.inMonth;
              const blocked = isOutOfRange(cell.iso);
              return (
                <button
                  key={`${cell.iso}-${idx}`}
                  type="button"
                  disabled={blocked}
                  onClick={() => pick(cell.iso)}
                  className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-caption font-medium transition-colors disabled:cursor-not-allowed"
                  style={{
                    color: muted ? "var(--color-txt-muted)" : "var(--color-txt-primary)",
                    opacity: blocked ? 0.35 : muted ? 0.65 : 1,
                    backgroundColor: isSel ? "var(--color-accent-purple-soft)" : "transparent",
                    border: isToday && !isSel ? "1px solid color-mix(in srgb, var(--color-accent-purple) 55%, transparent)" : "1px solid transparent",
                    boxShadow: isSel ? "0 0 0 1px color-mix(in srgb, var(--color-accent-purple) 35%, transparent)" : "none",
                  }}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            {showClear ? (
              <button
                type="button"
                className="rounded-lg px-2 py-1.5 text-caption font-medium transition-colors"
                style={{ color: "var(--color-txt-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-accent-purple)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-txt-secondary)";
                }}
                onClick={clear}
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={todayDisabled}
              className="rounded-lg px-3 py-1.5 text-caption font-semibold transition-opacity disabled:opacity-40"
              style={{
                backgroundColor: "var(--color-accent-lime)",
                color: "#111111",
              }}
              onClick={pickToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
