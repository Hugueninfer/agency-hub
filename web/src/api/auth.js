import { apiRequest } from "./client";
import { clearDemoSession } from "../lib/demoSession";

const PREFIX = "/api/v1/auth";

/** Obtém cookie CSRF (XSRF-TOKEN) antes de POST/PATCH/DELETE com sessão. */
export async function fetchCsrfCookie() {
  await apiRequest("/sanctum/csrf-cookie", {
    method: "GET",
    credentials: "include",
    skipAuthEvent: true,
  });
}

/**
 * @returns {Promise<{ user: object }>}
 */
export async function login({ email, password }) {
  clearDemoSession();
  await fetchCsrfCookie();
  const { data } = await apiRequest(`${PREFIX}/login`, {
    method: "POST",
    json: { email, password },
    credentials: "include",
    skipAuthEvent: true,
  });
  if (!data?.user) {
    throw new Error("Login response did not include user.");
  }
  return { user: data.user };
}

/**
 * Valida sessão atual (cookie). Use skipAuthEvent no cliente para não disparar logout global em 401.
 */
export async function fetchMe(accessToken) {
  const { data } = await apiRequest(`${PREFIX}/me`, {
    method: "GET",
    credentials: accessToken ? "omit" : "include",
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    skipAuthEvent: true,
  });
  return data;
}

export async function logout() {
  await fetchCsrfCookie();
  await apiRequest(`${PREFIX}/logout`, {
    method: "POST",
    credentials: "include",
    skipAuthEvent: true,
  });
}

export const createDemo = () => apiRequest("/api/v1/auth/demo", {
  method: "POST",
  json: {},
  skipAuthEvent: true,
  timeoutMs: 60_000,
});

export const resetDemo = (accessToken) => apiRequest("/api/v1/auth/demo/reset", {
  method: "POST",
  json: {},
  ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
});

export const logoutDemo = (accessToken) => apiRequest("/api/v1/auth/demo/logout", {
  method: "POST",
  json: {},
  ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  skipAuthEvent: true,
});
