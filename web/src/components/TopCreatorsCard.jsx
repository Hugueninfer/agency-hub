const CREATORS = [
  { name: "Julia Mendes", role: "Video editor", color: "bg-rose-200" },
  { name: "Rafael Souza", role: "Copywriter", color: "bg-sky-200" },
  { name: "Carla Nunes", role: "Social media", color: "bg-emerald-200" },
  { name: "Diego Alves", role: "Photographer", color: "bg-amber-200" },
];

export default function TopCreatorsCard() {
  return (
    <div className="flex flex-col gap-3">
      {CREATORS.map((c) => (
        <div key={c.name} className="card !p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${c.color} flex items-center justify-center text-sm font-semibold text-white`}
          >
            {c.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-strong truncate">{c.name}</p>
            <p className="text-caption text-txt-secondary">{c.role}</p>
          </div>
          <button className="icon-btn !w-8 !h-8" aria-label="Message">
            <svg width="14" height="14" fill="none" stroke="#8B5CF6" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
