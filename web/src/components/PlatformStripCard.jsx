const PLATFORMS = [
  { name: "YouTube", label: "YT" },
  { name: "Instagram", label: "IG" },
  { name: "TikTok", label: "TT" },
  { name: "Twitter/X", label: "X" },
];

export default function PlatformStripCard() {
  return (
    <div className="flex gap-3">
      {PLATFORMS.map((p) => (
        <div
          key={p.name}
          className="card !p-3 flex-1 flex items-center justify-center"
          title={p.name}
        >
          <span className="text-label text-txt-secondary font-semibold">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
