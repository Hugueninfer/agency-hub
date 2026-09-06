const CHIPS = ["YouTube", "Instagram", "TikTok"];

export default function CreatorProfileCard() {
  return (
    <div className="card flex flex-col items-start gap-5">
      <div className="flex items-start justify-between w-full">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-200 to-amber-100 flex items-center justify-center text-2xl font-bold text-accent-purple">
          LS
        </div>
        <button className="icon-btn" aria-label="Menu">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </div>

      <div>
        <h2 className="text-title-lg">Laura Santos</h2>
        <p className="text-body text-txt-secondary mt-1">Content Creator</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <span key={c} className="chip">{c}</span>
        ))}
      </div>
    </div>
  );
}
