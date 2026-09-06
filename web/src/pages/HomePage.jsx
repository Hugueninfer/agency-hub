import MetricRing from "../components/MetricRing";
import AvatarStack from "../components/AvatarStack";
import ContentCalendarCard from "../components/ContentCalendarCard";
import IntegrationsCard from "../components/IntegrationsCard";
import NotificationsCard from "../components/NotificationsCard";
import { PageShell } from "../components/page/PageLayout";

const KPIS = [
  {
    label: "Tracked Hours",
    value: "164h",
    change: "+8.2%",
    up: true,
    sub: "this month",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Open Invoices",
    value: "$12.4K",
    change: "+3 new",
    up: false,
    sub: "pending payment",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: "Active Projects",
    value: "8",
    change: "+2",
    up: true,
    sub: "across 4 clients",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    label: "Tasks Due This Week",
    value: "14",
    change: "5 urgent",
    up: false,
    sub: "across all projects",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
];

const WEEKLY_HOURS = [
  { day: "Mon", hours: 32 },
  { day: "Tue", hours: 28 },
  { day: "Wed", hours: 35 },
  { day: "Thu", hours: 40 },
  { day: "Fri", hours: 30 },
  { day: "Sat", hours: 8 },
  { day: "Sun", hours: 0 },
];
const maxHours = Math.max(...WEEKLY_HOURS.map((w) => w.hours), 1);

const TIME_ENTRIES = [
  { member: "Sarah K.", project: "Acme Rebrand", hours: "6h 30m", date: "Today", avatar: "S" },
  { member: "Tom H.", project: "Vertex Dashboard", hours: "4h 15m", date: "Today", avatar: "T" },
  { member: "Emily R.", project: "Pulse Campaign", hours: "7h 00m", date: "Yesterday", avatar: "E" },
  { member: "Carlos M.", project: "Acme Rebrand", hours: "5h 45m", date: "Yesterday", avatar: "C" },
];

const PROJECTS = [
  { name: "Acme Rebrand", progress: 72, dueDate: "Apr 30", team: ["Sarah", "Carlos", "Nina"], status: "On track", statusStyle: { backgroundColor: "#D8F3C8", color: "#15803d" } },
  { name: "Vertex Dashboard", progress: 41, dueDate: "May 15", team: ["Tom", "Emily"], status: "At risk", statusStyle: { backgroundColor: "#FFF2C7", color: "#b45309" } },
  { name: "Pulse Campaign", progress: 89, dueDate: "Apr 12", team: ["Emily", "James", "Sarah"], status: "Ahead", statusStyle: { backgroundColor: "#D8F3C8", color: "#15803d" } },
];

export default function HomePage() {
  return (
    <PageShell>
      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <div key={k.label} className="card !p-5">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-txt-secondary)" }}
              >
                {k.icon}
              </div>
              <span
                className={`text-caption font-semibold px-2 py-0.5 rounded-full ${
                  k.up ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {k.change}
              </span>
            </div>
            <p className="text-title-lg" style={{ color: "var(--color-txt-primary)" }}>{k.value}</p>
            <p className="text-caption mt-0.5" style={{ color: "var(--color-txt-secondary)" }}>{k.label}</p>
            <p className="text-caption mt-0.5" style={{ color: "var(--color-txt-muted)" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Team Hours Overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>Team Hours Overview</h2>
                <p className="text-caption mt-0.5" style={{ color: "var(--color-txt-secondary)" }}>Weekly capacity across the team</p>
              </div>
              <button className="btn-secondary !py-1.5 !px-3 !text-caption">Export</button>
            </div>

            <div className="flex items-end gap-2 h-32">
              {WEEKLY_HOURS.map((w) => (
                <div key={w.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-lg transition-all duration-500 hover:opacity-75"
                    style={{
                      height: `${(w.hours / maxHours) * 100}%`,
                      minHeight: w.hours > 0 ? "6px" : "2px",
                      backgroundColor: w.hours > 0 ? "var(--color-accent-purple)" : "var(--color-border)",
                    }}
                  />
                  <span className="text-caption" style={{ color: "var(--color-txt-muted)" }}>{w.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--color-accent-purple)" }} />
                <span className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>Logged hours</span>
              </div>
              <p className="ml-auto text-caption font-medium" style={{ color: "var(--color-accent-purple)" }}>
                Total: 173h this week
              </p>
            </div>
          </div>

          {/* Recent Time Entries */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>Recent Time Entries</h2>
              <button className="btn-secondary !py-1.5 !px-3 !text-caption">View all</button>
            </div>
            <div className="flex flex-col">
              {TIME_ENTRIES.map((e, i) => (
                <div
                  key={`${e.member}-${e.project}`}
                  className="flex items-center gap-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : "none" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-txt-secondary)" }}
                  >
                    {e.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-strong truncate" style={{ color: "var(--color-txt-primary)" }}>{e.member}</p>
                    <p className="text-caption mt-0.5" style={{ color: "var(--color-txt-muted)" }}>{e.project}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>{e.hours}</p>
                    <p className="text-caption" style={{ color: "var(--color-txt-muted)" }}>{e.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Projects */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>Current Projects</h2>
              <button className="btn-primary !py-1.5 !px-3 !text-caption">+ New</button>
            </div>
            <div className="flex flex-col gap-4">
              {PROJECTS.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ backgroundColor: "var(--color-surface-muted)" }}
                >
                  <MetricRing value={p.progress} size={52} strokeWidth={4} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>{p.name}</p>
                    <p className="text-caption mt-0.5" style={{ color: "var(--color-txt-secondary)" }}>Due {p.dueDate}</p>
                    <div className="mt-2"><AvatarStack names={p.team} size={24} /></div>
                  </div>
                  <span className="shrink-0 text-caption font-semibold px-2.5 py-1 rounded-full" style={p.statusStyle}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1/3 */}
        <div className="flex flex-col gap-6">
          <ContentCalendarCard />
          <NotificationsCard />
          <IntegrationsCard />
        </div>
      </div>
      </div>
    </PageShell>
  );
}
