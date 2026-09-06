import { useEffect } from "react";

export default function ImageLightbox({ images, index, onClose, onNavigate }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.original_name}
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.93)" }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 rounded-full p-2 transition-colors hover:bg-white/10"
        style={{ color: "rgba(255,255,255,0.8)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="flex max-h-[85vh] max-w-[88vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.url}
          alt={image.original_name}
          className="max-h-[85vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl"
        />
      </div>

      {/* Next */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          aria-label="Next image"
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Footer */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-center">
        <p className="max-w-[60vw] truncate text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
          {image.original_name}
        </p>
        {images.length > 1 && (
          <p className="mt-1 text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }}>
            {index + 1} / {images.length}
          </p>
        )}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && images.length <= 12 && (
        <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate(i); }}
              aria-label={`Go to image ${i + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? "1.5rem" : "0.375rem",
                backgroundColor: i === index ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
