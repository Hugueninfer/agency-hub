import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RBAC_NAV_PERMISSIONS } from "../constants/rbacPermissions";
import { clearPersistedAuth, loadPersistedAuth, persistAuth, SESSION_IDLE_MS, touchAuthSession, updatePersistedUser } from "../lib/authSession";
import { clearDemoSession, hasStoredDemoSession, loadDemoSession, saveDemoSession } from "../lib/demoSession";
import * as authApi from "../api/auth";
import { AuthContext } from "./auth-context";

const DEMO_EXPIRED = "Sua demonstração expirou. Inicie uma nova demonstração para continuar.";

function validateIdentity(user, kind) {
  if (!user || (user.is_demo === true) !== (kind === "demo")) throw new Error("A identidade da sessão não corresponde ao acesso solicitado.");
  if (kind === "demo" && !(Date.parse(user.expires_at) > Date.now())) throw new Error(DEMO_EXPIRED);
  return user;
}

export default function AuthProvider({ children }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  const [bootHadDemo] = useState(hasStoredDemoSession);
  const [user, setUser] = useState(null);
  const [identityKind, setIdentityKind] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const identity = useRef({ kind: null, token: null });
  const generation = useRef(0);
  const pending = useRef(false);

  const clearLocal = useCallback(() => {
    generation.current++;
    identity.current = { kind: null, token: null };
    clearDemoSession();
    clearPersistedAuth();
    setUser(null);
    setIdentityKind(null);
    setIsLoading(false);
  }, []);

  const accept = useCallback((nextUser, kind, token = null) => {
    validateIdentity(nextUser, kind);
    identity.current = { kind, token };
    persistAuth(nextUser);
    setUser(nextUser);
    setIdentityKind(kind);
  }, []);

  const endSession = useCallback((message) => {
    clearLocal();
    navigateRef.current("/login", { replace: true, state: message ? { message } : null });
  }, [clearLocal]);

  useEffect(() => {
    let cancelled = false;
    const revision = generation.current;
    const demo = loadDemoSession();
    if (bootHadDemo && !demo) {
      endSession(DEMO_EXPIRED);
      return undefined;
    }
    const kind = demo ? "demo" : "personal";
    (async () => {
      try {
        const me = await authApi.fetchMe(demo?.accessToken);
        if (cancelled || revision !== generation.current) return;
        accept(me, kind, demo?.accessToken);
      } catch {
        if (cancelled || revision !== generation.current) return;
        if (kind === "demo") endSession(DEMO_EXPIRED);
        else clearLocal();
      } finally {
        if (!cancelled && revision === generation.current) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accept, bootHadDemo, clearLocal, endSession]);

  const logout = useCallback(async (options) => {
    const snapshot = identity.current;
    endSession();
    if (options?.skipRemote) return;
    try {
      if (snapshot.kind === "demo") await authApi.logoutDemo(snapshot.token);
      else if (snapshot.kind === "personal") await authApi.logout();
    } catch { /* Local logout succeeds even when the remote session has expired. */ }
  }, [endSession]);

  useEffect(() => {
    const onUnauthorized = (event) => {
      // Responses from a previous identity must not end the current session.
      if (Boolean(event.detail?.wasDemo) !== (identity.current.kind === "demo")) return;
      endSession(event.detail?.wasDemo ? DEMO_EXPIRED : undefined);
    };
    window.addEventListener("api:unauthorized", onUnauthorized);
    return () => window.removeEventListener("api:unauthorized", onUnauthorized);
  }, [endSession]);

  useEffect(() => {
    if (!user) return undefined;
    let lastActivity = 0;
    const onActivity = () => {
      if (identity.current.kind !== "personal" || Date.now() - lastActivity < 30_000) return;
      lastActivity = Date.now();
      touchAuthSession();
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    const interval = setInterval(() => {
      if (identity.current.kind === "demo") {
        if (!loadDemoSession() || Date.parse(user.expires_at) <= Date.now()) endSession(DEMO_EXPIRED);
      } else if (identity.current.kind === "personal" && !loadPersistedAuth()) endSession();
    }, 5_000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      clearInterval(interval);
    };
  }, [user, endSession]);

  const login = useCallback(async (email, password) => {
    if (pending.current) throw new Error("Aguarde a operação em andamento.");
    pending.current = true;
    clearLocal();
    const revision = generation.current;
    try {
      const { user: nextUser } = await authApi.login({ email, password });
      if (revision !== generation.current) throw new Error("A sessão foi encerrada.");
      accept(nextUser, "personal");
      return nextUser;
    } finally { pending.current = false; }
  }, [accept, clearLocal]);

  const startDemo = useCallback(async () => {
    if (pending.current) throw new Error("Aguarde a operação em andamento.");
    pending.current = true;
    clearLocal();
    const revision = generation.current;
    try {
      const { data } = await authApi.createDemo();
      if (revision !== generation.current) throw new Error("A sessão foi encerrada.");
      const token = data?.access_token;
      if (!saveDemoSession({ accessToken: token, expiresAt: data?.expires_at })) throw new Error("Não foi possível salvar a demonstração neste navegador.");
      const me = await authApi.fetchMe(token);
      if (revision !== generation.current) throw new Error("A sessão foi encerrada.");
      accept(me, "demo", token);
      return me;
    } catch (error) {
      if (revision === generation.current) clearLocal();
      throw error;
    } finally { pending.current = false; }
  }, [accept, clearLocal]);

  const refreshMe = useCallback(async () => {
    const snapshot = identity.current;
    const revision = generation.current;
    if (!snapshot.kind) return null;
    try {
      const me = validateIdentity(await authApi.fetchMe(snapshot.token), snapshot.kind);
      if (revision !== generation.current) return null;
      setUser(me);
      updatePersistedUser(me);
      return me;
    } catch { return null; }
  }, []);

  const resetDemo = useCallback(async () => {
    if (identity.current.kind !== "demo") throw new Error("Apenas demonstrações podem ser reiniciadas.");
    if (pending.current) throw new Error("Aguarde a operação em andamento.");
    const token = loadDemoSession()?.accessToken;
    if (!token) { endSession(DEMO_EXPIRED); throw new Error(DEMO_EXPIRED); }
    pending.current = true;
    const revision = generation.current;
    try {
      await authApi.resetDemo(token);
      const me = await authApi.fetchMe(token);
      if (revision !== generation.current) throw new Error("A sessão foi encerrada.");
      accept(me, "demo", token);
      setDataVersion((version) => version + 1);
      return me;
    } catch (error) {
      if (error.status === 401 && revision === generation.current) endSession(DEMO_EXPIRED);
      throw error;
    } finally { pending.current = false; }
  }, [accept, endSession]);

  const permissions = useMemo(() => Array.isArray(user?.permissions) ? user.permissions : [], [user]);
  const hasPermission = useCallback((code) => typeof code === "string" && permissions.includes(code), [permissions]);
  const hasAnyPermission = useCallback((codes) => Array.isArray(codes) && codes.some((code) => permissions.includes(code)), [permissions]);
  const canAccessRbacPage = useMemo(() => RBAC_NAV_PERMISSIONS.some((code) => permissions.includes(code)), [permissions]);
  const value = useMemo(() => ({ user, identityKind, isLoading, dataVersion, permissions, sessionIdleMs: SESSION_IDLE_MS, isAuthenticated: Boolean(user), canAccessRbacPage, hasPermission, hasAnyPermission, login, startDemo, resetDemo, logout, refreshMe }), [user, identityKind, isLoading, dataVersion, permissions, canAccessRbacPage, hasPermission, hasAnyPermission, login, startDemo, resetDemo, logout, refreshMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
