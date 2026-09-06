const STORAGE_KEY = "agency-hub.demo";

function isValidDemoSession(session) {
  if (
    !session ||
    typeof session.accessToken !== "string" ||
    session.accessToken.trim() === "" ||
    typeof session.expiresAt !== "string" ||
    session.expiresAt.trim() === ""
  ) {
    return false;
  }

  const expiresAtMs = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
}

function getSessionStorage() {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadDemoSession() {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!isValidDemoSession(session)) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
    };
  } catch {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return null;
  }
}

export function saveDemoSession(session) {
  const storage = getSessionStorage();
  if (!storage || !isValidDemoSession(session)) {
    clearDemoSession();
    return false;
  }

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearDemoSession() {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function hasDemoIntent() {
  return loadDemoSession() !== null;
}
