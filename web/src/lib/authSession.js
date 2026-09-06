/** Cache opcional do utilizador + idle timeout — secrets ficam em cookie httpOnly (sessão Laravel). */

const STORAGE_KEY = "workflow_auth_session";

/** Max idle time before logout (15 minutes). */
export const SESSION_IDLE_MS = 15 * 60 * 1000;

/**
 * @returns {{ user: object, expiresAt: number } | null}
 */
export function loadPersistedAuth() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { user, expiresAt } = parsed;
    if (
      !user ||
      typeof expiresAt !== "number" ||
      Number.isNaN(expiresAt) ||
      Date.now() > expiresAt
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { user, expiresAt };
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function persistAuth(user) {
  const expiresAt = Date.now() + SESSION_IDLE_MS;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user, expiresAt }));
}

/** Extend expiry (called after user activity). */
export function touchAuthSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed.user) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const expiresAt = Date.now() + SESSION_IDLE_MS;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        expiresAt,
      }),
    );
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function updatePersistedUser(user) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed.user) return;
    parsed.user = user;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function clearPersistedAuth() {
  sessionStorage.removeItem(STORAGE_KEY);
}
