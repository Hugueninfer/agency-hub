const STATS = [
  { label: "Total views", value: "2.4M", change: "+12.3%", up: true },
  { label: "Subscribers", value: "184K", change: "+3.1%", up: true },
  { label: "Engagement", value: "8.7%", change: "-0.4%", up: false },
  { label: "Avg. watch time", value: "4m 32s", change: "+18s", up: true },
];

export default function QuickStatsCard() {
  return (
    <div className="card">
      <h3 className="text-title-md mb-5" style={{ color: "var(--color-txt-primary)" }}>Overview</h3>
      <div className="grid grid-cols-2 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="p-3 rounded-2xl" style={{ backgroundColor: "var(--color-surface-muted)" }}>
            <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>{s.label}</p>
            <p className="text-title-lg mt-1" style={{ color: "var(--color-txt-primary)" }}>{s.value}</p>
            <span className={`inline-block mt-1 text-caption font-medium ${s.up ? "text-emerald-500" : "text-rose-500"}`}>
              {s.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
