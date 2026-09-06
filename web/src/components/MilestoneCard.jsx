import MetricRing from "./MetricRing";
import AvatarStack from "./AvatarStack";

export default function MilestoneCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>Campaign milestone</h3>
        <button className="btn-secondary !py-1.5 !px-3 !text-caption">View details</button>
      </div>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>Due date:</p>
          <p className="text-body-strong mt-0.5" style={{ color: "var(--color-txt-primary)" }}>April 30th</p>
        </div>
        <MetricRing value={39} size={56} strokeWidth={4} />
        <div className="ml-auto">
          <p className="text-caption mb-1.5" style={{ color: "var(--color-txt-secondary)" }}>Assignees:</p>
          <AvatarStack names={["Ana", "Pedro", "Julia"]} size={28} />
        </div>
      </div>
    </div>
  );
}
