import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useMenu } from "../../hooks/useMenu";

/* ─── Icon map ─── */
const ICON_MAP = {
  dashboard: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  projects: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  invoice: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  tasks: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  board: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  external: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  building: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" />
    </svg>
  ),
  gear: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

function getIcon(iconName) {
  return ICON_MAP[iconName] || ICON_MAP.external;
}

function initialsFromName(name) {
  if (!name || typeof name !== "string") return "?";
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function UserAvatar({ user, className = "w-8 h-8" }) {
  const [broken, setBroken] = useState(false);
  const hasPhoto = !!user?.photo_url && !broken;
  if (hasPhoto) {
    return (
      <img
        src={user.photo_url}
        alt={user?.name ?? "User"}
        className={`${className} rounded-full object-cover shrink-0`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-violet-300 to-amber-200 flex items-center justify-center text-xs font-bold text-white shrink-0`}>
      {initialsFromName(user?.name)}
    </div>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAnyPermission } = useAuth();
  const { mainItems, settingsItems } = useMenu();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const settingsSectionActive = useMemo(
    () => settingsItems.some((item) => item.route !== "/" && location.pathname.startsWith(item.route || "")),
    [settingsItems, location.pathname],
  );

  const handleNavClick = (item) => {
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } else if (item.route) {
      navigate(item.route);
    }
    onClose?.();
  };

  const visibleMain = useMemo(() => {
    return mainItems.filter((item) => {
      if (!item.permission) return true;
      return hasAnyPermission([item.permission]);
    });
  }, [mainItems, hasAnyPermission]);

  const visibleSettings = useMemo(() => {
    return settingsItems.filter((item) => {
      if (!item.permission) return true;
      return hasAnyPermission([item.permission]);
    });
  }, [settingsItems, hasAnyPermission]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-30 flex flex-col
          transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto lg:h-screen
        `}
        style={{
          backgroundColor: "var(--color-card)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 pt-7 pb-6 shrink-0 cursor-pointer"
          onClick={() => { navigate("/"); onClose?.(); }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "var(--color-accent-lime)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
          <span className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
            Agency Hub
          </span>
        </div>

        {/* Main nav */}
        <nav className="scrollbar-themed flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          <p className="text-caption px-3 mb-2 mt-1 uppercase tracking-wide" style={{ color: "var(--color-txt-muted)" }}>
            Workspace
          </p>
          {visibleMain.map((item) => (
            <button
              key={item.uuid || item.label}
              type="button"
              title={item.label}
              className={`nav-item ${item.url ? "" : isActive(item.route) ? "active" : ""}`}
              onClick={() => handleNavClick(item)}
            >
              <span className="shrink-0">{getIcon(item.icon)}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-6 flex flex-col gap-1 shrink-0">
          <div className="mb-3" style={{ borderTop: "1px solid var(--color-border)" }} />

          {visibleSettings.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                className={`nav-item ${settingsSectionActive && !settingsOpen ? "active" : ""}`}
                aria-expanded={settingsOpen}
                aria-label={settingsOpen ? "Close settings menu" : "Open settings menu"}
                onClick={() => setSettingsOpen((o) => !o)}
              >
                <span className="shrink-0">{getIcon("gear")}</span>
                <span className="flex-1 text-left">Settings</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`shrink-0 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {settingsOpen && (
                <div className="flex flex-col gap-0.5 pb-1">
                  {visibleSettings.map((item) => (
                    <button
                      key={item.uuid || item.label}
                      type="button"
                      title={item.label}
                      className={`nav-subitem ${isActive(item.route) ? "active" : ""}`}
                      onClick={() => {
                        if (item.url) {
                          window.open(item.url, "_blank", "noopener,noreferrer");
                        } else if (item.route) {
                          navigate(item.route);
                        }
                        onClose?.();
                      }}
                    >
                      <span className="shrink-0 opacity-90">{getIcon(item.icon)}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 px-3 py-2">
            <UserAvatar user={user} />
            <div className="flex-1 min-w-0">
              <p className="text-body-strong truncate" style={{ color: "var(--color-txt-primary)" }}>
                {user?.name ?? "—"}
              </p>
              <p className="text-caption truncate" style={{ color: "var(--color-txt-muted)" }}>
                {user?.email ?? ""}
              </p>
            </div>
            <button
              type="button"
              className="text-caption font-medium shrink-0 px-2 py-1 rounded-control border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
              aria-label="Log out"
              title="Log out"
              onClick={() => { logout(); onClose?.(); }}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
