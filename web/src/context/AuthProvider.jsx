import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RBAC_NAV_PERMISSIONS } from "../constants/rbacPermissions";
import {
  clearPersistedAuth,
  loadPersistedAuth,
  persistAuth,
  SESSION_IDLE_MS,
  touchAuthSession,
  updatePersistedUser,
} from "../lib/authSession";
import { useNavigate } from "react-router-dom";
import * as authApi from "../api/auth";
import { AuthContext } from "./auth-context";

const ACTIVITY_THROTTLE_MS = 30_000;
const EXPIRY_CHECK_MS = 5_000;

function initialUser() {
  const s = loadPersistedAuth();
  return s?.user ?? null;
}

export default function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(initialUser);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /** Valida cookie de sessão ao arrancar / F5. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.fetchMe();
        if (cancelled) return;
        setUser(me);
        persistAuth(me);
      } catch {
        if (cancelled) return;
        clearPersistedAuth();
        setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(
    async (options) => {
      clearPersistedAuth();
      setUser(null);
      if (!options?.skipRemote) {
        try {
          await authApi.logout();
        } catch {
          /* sessão já inválida */
        }
      }
      navigate("/login", { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    const onUnauthorized = () => {
      clearPersistedAuth();
      setUser(null);
      navigate("/login", { replace: true });
    };
    window.addEventListener("api:unauthorized", onUnauthorized);
    return () => window.removeEventListener("api:unauthorized", onUnauthorized);
  }, [navigate]);

  /** Idle: sliding window em sessionStorage (UX); a sessão real é controlada pelo Laravel. */
  useEffect(() => {
    if (!user) return undefined;

    let lastThrottle = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastThrottle < ACTIVITY_THROTTLE_MS) return;
      lastThrottle = now;
      touchAuthSession();
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    const intervalId = setInterval(() => {
      if (!userRef.current) return;
      if (!loadPersistedAuth()) {
        logout({ skipRemote: true });
      }
    }, EXPIRY_CHECK_MS);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(intervalId);
    };
  }, [user, logout]);

  const login = useCallback(async (email, password) => {
    const { user: nextUser } = await authApi.login({
      email,
      password,
    });
    persistAuth(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const me = await authApi.fetchMe();
      setUser(me);
      updatePersistedUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  const permissions = useMemo(
    () => (Array.isArray(user?.permissions) ? user.permissions : []),
    [user],
  );

  const hasPermission = useCallback(
    (code) => (typeof code === "string" ? permissions.includes(code) : false),
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (codes) => (Array.isArray(codes) ? codes.some((c) => permissions.includes(c)) : false),
    [permissions],
  );

  const canAccessRbacPage = useMemo(
    () => RBAC_NAV_PERMISSIONS.some((c) => permissions.includes(c)),
    [permissions],
  );

  const isAuthenticated = Boolean(user);

  const value = useMemo(
    () => ({
      user,
      permissions,
      sessionIdleMs: SESSION_IDLE_MS,
      isAuthenticated,
      canAccessRbacPage,
      hasPermission,
      hasAnyPermission,
      login,
      logout,
      refreshMe,
    }),
    [
      user,
      permissions,
      isAuthenticated,
      canAccessRbacPage,
      hasPermission,
      hasAnyPermission,
      login,
      logout,
      refreshMe,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
