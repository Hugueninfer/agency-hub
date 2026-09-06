import { useNavigate } from "react-router-dom";

const NOTIFICATION_ICONS = {
  task_assigned: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
    </svg>
  ),
  task_comment_added: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  task_mentioned: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 1010 10 4 4 0 01-4-4V6" /><circle cx="12" cy="12" r="4" />
    </svg>
  ),
  task_status_changed: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  task_completed: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  invoice_status_changed: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="18" rx="2" /><line x1="6" y1="9" x2="10" y2="9" /><line x1="6" y1="13" x2="14" y2="13" /><line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  ),
  project_updated: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
};

function timeAgo(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export default function NotificationItem({ notification, onMarkRead, compact = false }) {
  const navigate = useNavigate();
  const icon = NOTIFICATION_ICONS[notification.type] || null;
  const isUnread = !notification.read;

  const handleClick = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.uuid);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-start gap-3 w-full text-left py-3 px-2 rounded-xl transition-colors hover:bg-[var(--color-surface-muted)] ${
        isUnread ? "" : "opacity-70"
      }`}
      style={isUnread ? { backgroundColor: "var(--color-surface-muted)" } : {}}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: isUnread ? "var(--color-accent-lime)" : "var(--color-surface-muted)",
          color: isUnread ? "#111" : "var(--color-txt-secondary)",
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-body ${isUnread ? "font-semibold" : ""}`}
          style={{ color: "var(--color-txt-primary)" }}
        >
          {notification.title}
        </p>
        {notification.body && !compact && (
          <p className="text-caption mt-0.5 truncate" style={{ color: "var(--color-txt-secondary)" }}>
            {notification.body}
          </p>
        )}
      </div>

      {/* Time */}
      <span className="text-caption shrink-0" style={{ color: "var(--color-txt-secondary)" }}>
        {timeAgo(notification.created_at)}
      </span>
    </button>
  );
}
