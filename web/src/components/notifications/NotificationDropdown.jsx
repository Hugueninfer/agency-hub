import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationItem from "./NotificationItem";

export default function NotificationDropdown({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications(1, 5);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleViewAll = () => {
    navigate("/notifications");
    onClose();
  };

  const items = Array.isArray(notifications?.data) ? notifications.data : [];

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 rounded-2xl shadow-lg z-50 overflow-hidden"
      style={{
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <h3 className="text-body-strong font-semibold" style={{ color: "var(--color-txt-primary)" }}>
          Notifications
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-caption font-medium hover:underline"
              style={{ color: "var(--color-accent-lime)" }}
            >
              Mark all read
            </button>
          )}
          <span
            className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold px-1"
            style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
          >
            {unreadCount}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto px-2 py-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>
              No notifications yet
            </p>
          </div>
        ) : (
          items.map((n) => (
            <NotificationItem
              key={n.uuid}
              notification={n}
              onMarkRead={markAsRead}
              compact
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={handleViewAll}
          className="w-full text-center text-caption font-medium py-2 rounded-xl transition-colors hover:bg-[var(--color-surface-muted)]"
          style={{ color: "var(--color-txt-secondary)" }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
