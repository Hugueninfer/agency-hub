import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * @param {import("react").ReactNode} children
 */
function getOptionLabel(children) {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map((c) => getOptionLabel(c)).join("");
  if (isValidElement(children)) return getOptionLabel(children.props.children);
  return "";
}

/**
 * @param {import("react").ReactNode} children
 */
function collectOptions(children) {
  const out = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const v = child.props.value;
    out.push({
      value: v == null ? "" : String(v),
      disabled: Boolean(child.props.disabled),
      label: getOptionLabel(child.props.children),
    });
  });
  return out;
}

function closedPanel() {
  return { open: false, highlight: -1 };
}

function initialHighlight(selectedIndex, firstEnabledIndex) {
  if (selectedIndex >= 0) return selectedIndex;
  if (firstEnabledIndex >= 0) return firstEnabledIndex;
  return -1;
}

/**
 * Select com lista customizada (não nativa): resultados com cantos arredondados,
 * borda e sombra alinhados ao design.json — o menu nativo do browser não pode ser estilizado.
 *
 * @param {"soft" | "contrast"} [tone]
 */
export default function FieldSelect({
  className = "",
  tone = "soft",
  disabled = false,
  children,
  value,
  onChange,
  name,
  id,
  required,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...rest
}) {
  const listboxId = useId();
  const rootRef = useRef(null);
  const listRef = useRef(/** @type {HTMLUListElement | null} */ (null));
  const optionRefs = useRef(/** @type {Record<number, HTMLDivElement | null>} */ ({}));

  const [panel, setPanel] = useState(closedPanel);
  const open = panel.open;
  const highlighted = panel.highlight;
  /** Posição viewport para lista em portal (evita cortes por overflow do main/painéis). */
  const [floating, setFloating] = useState(null);

  const options = useMemo(() => collectOptions(children), [children]);
  const strValue = value == null ? "" : String(value);

  const selectedIndex = useMemo(() => {
    const i = options.findIndex((o) => !o.disabled && o.value === strValue);
    return i >= 0 ? i : -1;
  }, [options, strValue]);

  const firstEnabledIndex = useMemo(() => options.findIndex((o) => !o.disabled), [options]);

  const displayLabel =
    selectedIndex >= 0
      ? options[selectedIndex].label
      : strValue || options.find((o) => !o.disabled)?.label || "";

  const triggerBg =
    tone === "contrast" ? "var(--color-card)" : "var(--color-surface-muted)";

  const fireChange = useCallback(
    (nextVal) => {
      if (disabled) return;
      onChange?.({ target: { value: nextVal } });
    },
    [disabled, onChange],
  );

  const close = useCallback(() => {
    setPanel(closedPanel());
  }, []);

  const selectIndex = useCallback(
    (i) => {
      const opt = options[i];
      if (!opt || opt.disabled) return;
      fireChange(opt.value);
      close();
      rootRef.current?.querySelector("button")?.focus();
    },
    [options, fireChange, close],
  );

  useLayoutEffect(() => {
    if (!open || highlighted < 0) return;
    const el = optionRefs.current[highlighted];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, highlighted]);

  useLayoutEffect(() => {
    if (!open || disabled || options.length === 0) {
      queueMicrotask(() => {
        setFloating(null);
      });
      return undefined;
    }
    const MENU_MAX = 256;
    const margin = 8;
    const gap = 6;
    function update() {
      const btn = rootRef.current?.querySelector("button");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const topBelow = r.bottom + gap;
      /** Espaço útil abaixo do botão (viewport). Menu abre sempre para baixo para não cobrir conteúdo acima. */
      const spaceBelow = Math.max(0, window.innerHeight - topBelow - margin);
      const maxHeight = Math.min(MENU_MAX, spaceBelow);
      const left = Math.max(margin, Math.min(r.left, window.innerWidth - r.width - margin));
      setFloating({
        top: topBelow,
        left,
        width: r.width,
        maxHeight: Math.max(48, maxHeight),
      });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, disabled, options.length]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      close();
    }
    function onKey(e) {
      if (e.key === "Escape") {
        close();
        rootRef.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  function moveHighlight(delta) {
    setPanel((p) => {
      if (!p.open || options.length === 0) return p;
      const start =
        p.highlight >= 0
          ? p.highlight
          : selectedIndex >= 0
            ? selectedIndex
            : Math.max(0, firstEnabledIndex);
      let i = start;
      for (let step = 0; step <= options.length; step += 1) {
        i = (i + delta + options.length) % options.length;
        if (!options[i]?.disabled) return { ...p, highlight: i };
      }
      return p;
    });
  }

  const btnClass = `
          relative flex w-full min-h-[44px] cursor-pointer items-center justify-between gap-2
          rounded-control border border-[var(--color-border)] py-2.5 pl-3 pr-10 text-left
          text-body font-medium text-[var(--color-txt-primary)]
          transition-[border-color,box-shadow] duration-200 ease-out
          hover:border-[var(--color-border-strong)]
          focus:border-[var(--color-accent-purple)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)]/25
          disabled:cursor-not-allowed
          ${className}`.trim();

  return (
    <div
      ref={rootRef}
      className={`group relative z-30 w-full min-w-0 ${disabled ? "opacity-55" : ""}`}
    >
      {name ? <input type="hidden" name={name} value={strValue} disabled={disabled} /> : null}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        style={{ backgroundColor: triggerBg }}
        className={btnClass}
        {...rest}
        onClick={() => {
          if (disabled) return;
          setPanel((p) =>
            p.open
              ? closedPanel()
              : {
                  open: true,
                  highlight: initialHighlight(selectedIndex, firstEnabledIndex),
                },
          );
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) {
              setPanel({
                open: true,
                highlight: initialHighlight(selectedIndex, firstEnabledIndex),
              });
            } else moveHighlight(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
              setPanel({
                open: true,
                highlight: initialHighlight(selectedIndex, firstEnabledIndex),
              });
            } else moveHighlight(-1);
          } else if (e.key === "Enter" || e.key === " ") {
            if (open && highlighted >= 0) {
              e.preventDefault();
              selectIndex(highlighted);
            } else if (!open) {
              e.preventDefault();
              setPanel({
                open: true,
                highlight: initialHighlight(selectedIndex, firstEnabledIndex),
              });
            }
          } else if (e.key === "Tab" && open) close();
        }}
      >
        <span className="truncate">{displayLabel}</span>
        <span
          className={`pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center transition-colors duration-200 ${
            open ? "text-[var(--color-accent-purple)]" : "text-[var(--color-txt-muted)]"
          }`}
          aria-hidden
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={open ? "rotate-180 transition-transform duration-200" : "transition-transform duration-200"}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {typeof document !== "undefined" &&
      open &&
      !disabled &&
      options.length > 0 &&
      floating
        ? createPortal(
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              style={{
                position: "fixed",
                top: floating.top,
                left: floating.left,
                width: floating.width,
                maxHeight: floating.maxHeight,
                zIndex: 10000,
                backgroundColor: "var(--color-card)",
              }}
              className="scrollbar-themed overflow-y-auto overflow-x-hidden rounded-control border border-[var(--color-border)] p-1.5 shadow-[var(--shadow-card-hover)]"
            >
              {options.map((opt, i) => {
                const selected = opt.value === strValue;
                const highlights = highlighted === i;
                return (
                  <li key={`${opt.value}-${i}`} role="presentation">
                    <div
                      ref={(el) => {
                        if (el) optionRefs.current[i] = el;
                        else delete optionRefs.current[i];
                      }}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={opt.disabled || undefined}
                      tabIndex={-1}
                      onMouseEnter={() =>
                        !opt.disabled &&
                        setPanel((p) => (p.open ? { ...p, highlight: i } : p))
                      }
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (!opt.disabled) selectIndex(i);
                      }}
                      className={`
                    cursor-pointer select-none rounded-xl px-3 py-2.5 text-body font-medium
                    outline-none transition-colors duration-150
                    ${
                      opt.disabled
                        ? "cursor-not-allowed opacity-45"
                        : "text-[var(--color-txt-primary)] hover:bg-[var(--color-surface-muted)]"
                    }
                    ${
                      !opt.disabled && highlights
                        ? "bg-[color-mix(in_srgb,var(--color-accent-purple)_16%,var(--color-card))] ring-1 ring-inset ring-[var(--color-accent-purple)]/25"
                        : ""
                    }
                    ${
                      !opt.disabled && selected && !highlights
                        ? "bg-[color-mix(in_srgb,var(--color-accent-purple)_10%,var(--color-card))]"
                        : ""
                    }
                  `.trim()}
                    >
                      {opt.label}
                    </div>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
