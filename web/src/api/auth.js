import { apiRequest } from "./client";

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
export async function fetchMe() {
  const { data } = await apiRequest(`${PREFIX}/me`, {
    method: "GET",
    credentials: "include",
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
