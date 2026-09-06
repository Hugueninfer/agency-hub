import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as notificationsApi from "../api/notifications";
import { useAuth } from "../hooks/useAuth";
import { NotificationContext } from "./notification-context";

const POLL_INTERVAL_MS = 30_000;

export default function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  const pollingRef = useRef(null);
  const isPollingRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail — the badge just won't update this tick
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(
    async (page = 1, perPage = 20, filter = null) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const result = await notificationsApi.listNotifications(page, perPage, filter);
        setNotifications(result);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated],
  );

  const markAsRead = useCallback(
    async (uuid) => {
      try {
        await notificationsApi.markAsRead(uuid);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail
      }
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    setPreferencesLoading(true);
    try {
      const prefs = await notificationsApi.getPreferences();
      setPreferences(prefs);
    } catch {
      setPreferences([]);
    } finally {
      setPreferencesLoading(false);
    }
  }, [isAuthenticated]);

  const updatePreferences = useCallback(async (prefs) => {
    try {
      await notificationsApi.updatePreferences(prefs);
      setPreferences(prefs);
    } catch {
      // Silently fail
    }
  }, []);

  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    fetchUnreadCount();
    pollingRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
  }, [fetchUnreadCount]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      notifications,
      loading,
      preferences,
      preferencesLoading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      fetchPreferences,
      updatePreferences,
      startPolling,
      stopPolling,
    }),
    [
      unreadCount,
      notifications,
      loading,
      preferences,
      preferencesLoading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      fetchPreferences,
      updatePreferences,
      startPolling,
      stopPolling,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
