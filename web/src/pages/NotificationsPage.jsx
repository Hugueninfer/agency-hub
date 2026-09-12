import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { PageShell, Panel } from "../components/page/PageLayout";
import NotificationItem from "../components/notifications/NotificationItem";

function groupByDate(notifications) {
  const groups = { today: [], yesterday: [], older: [] };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (d >= today) {
      groups.today.push(n);
    } else if (d >= yesterday) {
      groups.yesterday.push(n);
    } else {
      groups.older.push(n);
    }
  }
  return groups;
}

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, fetchNotifications, unreadCount } = useNotifications();
  const [filter, setFilter] = useState(null); // null = all, 'unread'
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    fetchNotifications(page, 20, filter);
  }, [fetchNotifications, page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (nextFilter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  const items = Array.isArray(notifications?.data) ? notifications.data : [];
  const pagination = notifications?.meta || notifications || {};
  const lastPage = pagination.last_page ?? 1;
  const total = pagination.total ?? 0;

  const grouped = groupByDate(items);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    load();
  };

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-lg font-bold" style={{ color: "var(--color-txt-primary)" }}>
            Notifications
          </h1>
          <p className="text-body mt-1" style={{ color: "var(--color-txt-secondary)" }}>
            {unreadCount} unread · {total} total
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary !py-2 !px-4">
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => changeFilter(null)}
          className={`px-4 py-2 rounded-xl text-caption font-medium transition-colors ${
            filter === null ? "btn-primary" : "btn-secondary"
          }`}
        >
          All
        </button>
        <button
          onClick={() => changeFilter("unread")}
          className={`px-4 py-2 rounded-xl text-caption font-medium transition-colors ${
            filter === "unread" ? "btn-primary" : "btn-secondary"
          }`}
        >
          Unread
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>Loading...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <Panel>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl mb-4"
              style={{ backgroundColor: "var(--color-surface-muted)" }}
            >
              🔔
            </div>
            <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </h2>
            <p className="text-body mt-2 max-w-sm" style={{ color: "var(--color-txt-secondary)" }}>
              {filter === "unread"
                ? "You've caught up on everything. Great job!"
                : "Notifications about your tasks, projects, and activity will appear here."}
            </p>
          </div>
        </Panel>
      )}

      {/* Notification groups */}
      {!loading && items.length > 0 && (
        <>
          {grouped.today.length > 0 && (
            <Panel title="Today">
              {grouped.today.map((n) => (
                <NotificationItem key={n.uuid} notification={n} onMarkRead={markAsRead} />
              ))}
            </Panel>
          )}

          {grouped.yesterday.length > 0 && (
            <Panel title="Yesterday">
              {grouped.yesterday.map((n) => (
                <NotificationItem key={n.uuid} notification={n} onMarkRead={markAsRead} />
              ))}
            </Panel>
          )}

          {grouped.older.length > 0 && (
            <Panel title="Older">
              {grouped.older.map((n) => (
                <NotificationItem key={n.uuid} notification={n} onMarkRead={markAsRead} />
              ))}
            </Panel>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary !py-2 !px-4 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-caption px-3" style={{ color: "var(--color-txt-secondary)" }}>
                Page {page} of {lastPage}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="btn-secondary !py-2 !px-4 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
