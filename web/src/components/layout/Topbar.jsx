import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationDropdown from "../notifications/NotificationDropdown";

export default function Topbar({ onMenuClick }) {
  const { dark, toggle } = useTheme();
  const { unreadCount, startPolling, stopPolling } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleBellClick = () => {
    const next = !dropdownOpen;
    setDropdownOpen(next);
    if (next) {
      startPolling();
    } else {
      stopPolling();
    }
  };

  const handleDropdownClose = () => {
    setDropdownOpen(false);
    stopPolling();
  };

  return (
    <header
      className="flex items-center justify-between px-6 py-4 transition-colors bg-white dark:bg-[var(--color-bg)]"
      style={{
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="icon-btn lg:hidden" aria-label="Open menu">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Dark mode toggle */}
        <button onClick={toggle} className="icon-btn" aria-label="Toggle dark mode">
          {dark ? (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={handleBellClick} className="icon-btn relative" aria-label="Notifications">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {dropdownOpen && <NotificationDropdown onClose={handleDropdownClose} />}
        </div>
      </div>
    </header>
  );
}
