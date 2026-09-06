import MetricRing from "./MetricRing";
import AvatarStack from "./AvatarStack";

export default function AnalyticsHighlightCard() {
  return (
    <div className="card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-purple-soft rounded-bl-[60px] -z-0" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <MetricRing value={67} size={52} strokeWidth={4} />
          <button className="icon-btn" aria-label="Menu">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>
        </div>

        <h2 className="text-title-lg mt-3">Q2 Content Strategy</h2>
        <p className="text-body text-txt-secondary mt-2 leading-relaxed">
          Expand reach across short-form video platforms with data-driven scheduling and audience segmentation...
        </p>

        <div className="mt-5">
          <AvatarStack names={["Ana", "Pedro", "Julia", "Marco"]} size={30} />
        </div>
      </div>
    </div>
  );
}
