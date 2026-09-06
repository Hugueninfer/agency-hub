import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

export default function NotificationsCard() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications(1, 5);
  }, [fetchNotifications]);

  const items = Array.isArray(notifications?.data) ? notifications.data.slice(0, 3) : [];

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>Notifications</h3>
        <span className="flex items-center gap-1.5 text-caption" style={{ color: "var(--color-txt-secondary)" }}>
          New
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}>
            {unreadCount}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>
              No notifications yet
            </p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.uuid}
              className="flex items-start gap-3 py-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (!n.read && markAsRead) markAsRead(n.uuid);
                if (n.action_url) navigate(n.action_url);
              }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-semibold shrink-0"
                style={{
                  backgroundColor: n.read ? "var(--color-surface-muted)" : "var(--color-accent-lime)",
                  color: n.read ? "var(--color-txt-secondary)" : "#111",
                }}>
                {n.type === "task_assigned" ? "A" :
                 n.type === "task_comment_added" ? "C" :
                 n.type === "task_mentioned" ? "@" :
                 n.type === "task_completed" ? "✓" :
                 n.type === "task_status_changed" ? "↗" : "N"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body" style={{ color: "var(--color-txt-primary)" }}>
                  <span className={n.read ? "" : "font-semibold"}>{n.title}</span>
                </p>
                {n.body && (
                  <p className="text-body mt-0.5 truncate" style={{ color: "var(--color-txt-secondary)" }}>{n.body}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={() => markAllAsRead()}
          className="btn-secondary flex-1 justify-center !text-caption"
          disabled={unreadCount === 0}
        >
          Mark all read
        </button>
        <button
          onClick={() => navigate("/notifications")}
          className="btn-primary flex-1 justify-center !text-caption"
        >
          View all
        </button>
      </div>
    </div>
  );
}
