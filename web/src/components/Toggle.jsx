import { useState } from "react";

export default function Toggle({ defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      aria-label="Toggle integration"
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{ backgroundColor: on ? "var(--toggle-active)" : "var(--toggle-inactive)" }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: `translateX(${on ? "22px" : "2px"})` }}
      />
    </button>
  );
}
