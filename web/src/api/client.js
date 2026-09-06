/**
 * HTTP client for workflow-api (Laravel Sanctum — sessão via cookie + CSRF).
 * Envelope: { success, message, data?, errors? }
 */

import { clearDemoSession, hasStoredDemoSession, loadDemoSession } from "../lib/demoSession";

export class ApiError extends Error {
  constructor(message, { status, body, errors } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.errors = errors ?? null;
  }
}

export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw === undefined || raw === "") return "";
  return String(raw).replace(/\/$/, "");
}

function buildUrl(path) {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

const DEFAULT_TIMEOUT_MS = 30_000;

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const DEMO_AUTH_PATHS = new Set([
  "/api/v1/auth/demo",
  "/api/v1/auth/demo/reset",
  "/api/v1/auth/demo/logout",
]);

const PERSONAL_AUTH_PATHS = new Set([
  "/sanctum/csrf-cookie",
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
]);

/**
 * Cookie XSRF-TOKEN (legível pelo JS) para header X-XSRF-TOKEN em pedidos mutáveis.
 */
function readXsrfTokenFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? match[1] : null;
}

function applyXsrfHeader(headers, method) {
  const m = (method || "GET").toUpperCase();
  if (!UNSAFE_METHODS.has(m)) return;
  const raw = readXsrfTokenFromCookie();
  if (!raw) return;
  try {
    headers.set("X-XSRF-TOKEN", decodeURIComponent(raw));
  } catch {
    headers.set("X-XSRF-TOKEN", raw);
  }
}

/**
 * @param {string} path - e.g. /api/v1/auth/login
 * @param {RequestInit & { json?: unknown, skipAuthEvent?: boolean }} options
 */
export async function apiRequest(path, options = {}) {
  const {
    json,
    headers: extraHeaders,
    signal: userSignal,
    skipAuthEvent,
    credentials: credentialsOpt,
    ...fetchInit
  } = options;

  const method = fetchInit.method || "GET";
  const headers = new Headers(extraHeaders);
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const isPersonalAuth = PERSONAL_AUTH_PATHS.has(path);
  const hadDemo = !isPersonalAuth && hasStoredDemoSession();
  const demo = isPersonalAuth ? null : loadDemoSession();
  if (isPersonalAuth) headers.delete("Authorization");
  // An explicit token is a snapshot of the requesting identity (e.g. logout).
  if (demo && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${demo.accessToken}`);
  const requestToken = headers.get("Authorization");
  const wasDemo = demo !== null || Boolean(requestToken?.startsWith("Bearer "));
  const isDemoRequest = wasDemo || DEMO_AUTH_PATHS.has(path);
  if (hadDemo && !demo && !requestToken && !DEMO_AUTH_PATHS.has(path)) {
    if (!skipAuthEvent && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("api:unauthorized", { detail: { wasDemo: true } }));
    }
    throw new ApiError("Sua demonstração expirou.", { status: 401 });
  }

  if (!isDemoRequest) applyXsrfHeader(headers, method);

  const defaultCredentials = typeof window !== "undefined" ? "include" : "same-origin";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const combinedSignal = controller.signal;

  const url = buildUrl(path);
  let res;
  try {
    res = await fetch(url, {
      ...fetchInit,
      method,
      credentials: isDemoRequest ? "omit" : (credentialsOpt ?? defaultCredentials),
      headers,
      signal: combinedSignal,
      body: json !== undefined ? JSON.stringify(json) : fetchInit.body,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e?.name === "AbortError") {
      throw new ApiError("Request was cancelled or timed out.", {
        status: 0,
      });
    }
    throw new ApiError(e?.message || "Network error.", { status: 0 });
  }
  clearTimeout(timeoutId);

  if (res.status === 204) {
    return { message: null, data: null };
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let parsed = null;
  if (isJson) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  } else if (res.status !== 204) {
    try {
      const text = await res.text();
      parsed = text ? { raw: text } : null;
    } catch {
      parsed = null;
    }
  }

  const treatAsAuthenticatedCall = !skipAuthEvent;

  const currentDemo = res.status === 401 && wasDemo ? loadDemoSession() : null;
  const matchesDemo = wasDemo && (!currentDemo || requestToken === `Bearer ${currentDemo.accessToken}`);
  if (res.status === 401 && matchesDemo) clearDemoSession();

  if (
    res.status === 401 &&
    (!wasDemo || matchesDemo) &&
    treatAsAuthenticatedCall &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(
      new CustomEvent("api:unauthorized", { detail: { wasDemo } }),
    );
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed.message === "string" && parsed.message) ||
      res.statusText ||
      "Request failed.";
    const errors = parsed && parsed.errors ? parsed.errors : null;
    throw new ApiError(message, { status: res.status, body: parsed, errors });
  }

  if (parsed && Object.prototype.hasOwnProperty.call(parsed, "success")) {
    if (parsed.success === false) {
      throw new ApiError(
        (typeof parsed.message === "string" && parsed.message) || "Operation could not be completed.",
        { status: res.status, body: parsed, errors: parsed.errors ?? null },
      );
    }
    return { message: parsed.message, data: parsed.data };
  }

  return { message: null, data: parsed };
}
