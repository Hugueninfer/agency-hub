const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKS = [
  [31, 1, 2, 3, 4, 5, 6],
  [7, 8, 9, 10, 11, 12, 13],
  [14, 15, 16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25, 26, 27],
  [28, 29, 30, 1, 2, 3, 4],
];
const TODAY = 1;
const DEADLINES = [10, 15, 22, 30];

export default function ContentCalendarCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <button className="icon-btn" aria-label="Previous">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h3 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>Team Schedule</h3>
        <button className="icon-btn" aria-label="Next">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d, i) => (
          <span key={i} className="text-caption py-1" style={{ color: "var(--color-txt-muted)" }}>{d}</span>
        ))}
        {WEEKS.flat().map((day, i) => {
          const isOtherMonth = (i < 1 && day > 20) || (i > 27 && day < 10);
          const isToday = day === TODAY && !isOtherMonth;
          const isDeadline = DEADLINES.includes(day) && !isOtherMonth;

          if (isToday) {
            return (
              <button key={i} className="py-1.5 rounded-xl text-body-strong font-semibold transition-colors"
                style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}>
                {day}
              </button>
            );
          }
          if (isDeadline) {
            return (
              <button key={i} className="py-1.5 rounded-xl text-body-strong font-semibold transition-colors"
                style={{ color: "var(--color-accent-purple)" }}>
                {day}
              </button>
            );
          }
          return (
            <button key={i} className="py-1.5 rounded-xl text-body-strong transition-colors hover:bg-surface-muted"
              style={{ color: isOtherMonth ? "var(--color-txt-muted)" : "var(--color-txt-primary)", opacity: isOtherMonth ? 0.4 : 1 }}>
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--color-border)" }}>
        <p className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>Upcoming deadlines</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-accent-purple)" }} />
          <span className="text-caption" style={{ color: "var(--color-txt-primary)" }}>Apr 10 — Pulse Campaign delivery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-accent-purple)" }} />
          <span className="text-caption" style={{ color: "var(--color-txt-primary)" }}>Apr 15 — Vertex milestone review</span>
        </div>
      </div>
    </div>
  );
}
