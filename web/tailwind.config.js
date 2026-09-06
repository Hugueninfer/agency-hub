/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Manrope",
          "Plus Jakarta Sans",
          "SF Pro Display",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        /* ── Canvas & surfaces ─────────────────────── */
        canvas:  { lime: "var(--color-bg)" },
        surface: {
          primary: "var(--color-surface)",
          muted:   "var(--color-surface-muted)",
          soft:    "var(--color-surface-soft)",
          card:    "var(--color-card)",
        },
        /* ── Text ─────────────────────────────────── */
        txt: {
          primary:   "var(--color-txt-primary)",
          secondary: "var(--color-txt-secondary)",
          muted:     "var(--color-txt-muted)",
        },
        /* ── Border ───────────────────────────────── */
        border: {
          soft:   "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        /* ── Accents ──────────────────────────────── */
        accent: {
          lime:         "var(--color-accent-lime)",
          "lime-strong": "var(--color-accent-lime-h)",
          purple:       "var(--color-accent-purple)",
          "purple-soft": "var(--color-accent-purple-soft)",
          "yellow-soft": "#F3F08C",
        },
        /* ── States ───────────────────────────────── */
        state: {
          success: "#D8F3C8",
          warning: "#FFF2C7",
          danger:  "#FFD8D8",
        },
        /* ── Toggle ───────────────────────────────── */
        toggle: {
          inactive: "var(--toggle-inactive)",
          active:   "var(--toggle-active)",
        },
        /* ── Explicit dark-mode palette (kept for edge cases) */
        dm: {
          bg:              "#0F0F0E",
          canvas:          "#1A1A18",
          card:            "#1F1F1D",
          "card-hover":    "#252523",
          border:          "#2E2E2B",
          "txt-primary":   "#F0EFE8",
          "txt-secondary": "#9A9A94",
          "txt-muted":     "#5A5A56",
          "accent-lime":   "#D4E44E",
          "accent-purple": "#A67FFB",
        },
      },
      borderRadius: {
        card:    "24px",
        "card-lg": "32px",
        control: "14px",
        chip:    "12px",
        row:     "20px",
      },
      boxShadow: {
        card:       "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
      fontSize: {
        display:       ["36px", { lineHeight: "1.1",  fontWeight: "600" }],
        "title-lg":    ["20px", { lineHeight: "1.2",  fontWeight: "600" }],
        "title-md":    ["16px", { lineHeight: "1.25", fontWeight: "600" }],
        body:          ["13px", { lineHeight: "1.45", fontWeight: "400" }],
        "body-strong": ["13px", { lineHeight: "1.4",  fontWeight: "500" }],
        caption:       ["11px", { lineHeight: "1.35", fontWeight: "400" }],
        label:         ["12px", { lineHeight: "1.2",  fontWeight: "500" }],
      },
      spacing: {
        4.5: "18px",
        13:  "52px",
        15:  "60px",
      },
      transitionDuration: { DEFAULT: "200ms" },
      transitionTimingFunction: { DEFAULT: "ease-out" },
    },
  },
  plugins: [],
};
