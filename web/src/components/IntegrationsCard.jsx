import Toggle from "./Toggle";

const TOOLS = [
  { name: "Slack", description: "Team communication & alerts", icon: "💬", iconClass: "bg-purple-100 text-purple-600", on: true },
  { name: "Google Drive", description: "Shared docs & assets", icon: "📁", iconClass: "bg-blue-100 text-blue-600", on: true },
  { name: "Figma", description: "Design file sync", icon: "🎨", iconClass: "bg-pink-100 text-pink-500", on: false },
];

export default function IntegrationsCard() {
  return (
    <div className="card">
      <h3 className="text-title-md mb-5" style={{ color: "var(--color-txt-primary)" }}>Workspace Tools</h3>
      <div className="flex flex-col gap-4">
        {TOOLS.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${item.iconClass}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>{item.name}</p>
              <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>{item.description}</p>
            </div>
            <Toggle defaultOn={item.on} />
          </div>
        ))}
      </div>
    </div>
  );
}
