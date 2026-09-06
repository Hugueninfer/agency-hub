import { apiRequest } from "./client";

const PREFIX = "/api/v1/time";

function appendMulti(params, key, values) {
  if (!Array.isArray(values) || values.length === 0) return;
  for (const v of values) {
    if (v != null && v !== "") params.append(`${key}[]`, String(v));
  }
}

/**
 * @param {{ project_uuid?: string }} [opts]
 */
export async function listAssignableTasks(opts = {}) {
  const params = new URLSearchParams();
  if (opts.project_uuid) params.set("project_uuid", opts.project_uuid);
  const qs = params.toString();
  const url = qs ? `${PREFIX}/tasks?${qs}` : `${PREFIX}/tasks`;
  const { data } = await apiRequest(url, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function getActiveSession() {
  const { data } = await apiRequest(`${PREFIX}/sessions/active`, { method: "GET" });
  return data ?? null;
}

export async function startSession(taskUuid) {
  const { data } = await apiRequest(`${PREFIX}/sessions/start`, {
    method: "POST",
    json: { task_uuid: taskUuid },
  });
  return data;
}

export async function stopSession() {
  const { data } = await apiRequest(`${PREFIX}/sessions/stop`, {
    method: "POST",
    json: {},
  });
  return data;
}

/**
 * @param {{
 *   date_from?: string,
 *   date_to?: string,
 *   user_uuid?: string[],
 *   project_uuid?: string[],
 *   page?: number,
 *   per_page?: number,
 * }} params
 */
export async function listEntries(params = {}) {
  const q = new URLSearchParams();
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  appendMulti(q, "user_uuid", params.user_uuid);
  appendMulti(q, "project_uuid", params.project_uuid);
  if (params.page != null) q.set("page", String(params.page));
  if (params.per_page != null) q.set("per_page", String(params.per_page));
  const qs = q.toString();
  const url = qs ? `${PREFIX}/entries?${qs}` : `${PREFIX}/entries`;
  const { data } = await apiRequest(url, { method: "GET" });
  return data ?? { items: [], meta: {} };
}

export async function createEntry(body) {
  const { data } = await apiRequest(`${PREFIX}/entries`, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function updateEntry(entryUuid, body) {
  const { data } = await apiRequest(`${PREFIX}/entries/${encodeURIComponent(entryUuid)}`, {
    method: "PATCH",
    json: body,
  });
  return data;
}

export async function deleteEntry(entryUuid) {
  await apiRequest(`${PREFIX}/entries/${encodeURIComponent(entryUuid)}`, {
    method: "DELETE",
  });
}

/**
 * @param {{
 *   date_from?: string,
 *   date_to?: string,
 *   user_uuid?: string[],
 *   project_uuid?: string[],
 * }} params
 */
export async function reportSummary(params = {}) {
  const q = new URLSearchParams();
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  appendMulti(q, "user_uuid", params.user_uuid);
  appendMulti(q, "project_uuid", params.project_uuid);
  const qs = q.toString();
  const url = qs ? `${PREFIX}/reports/summary?${qs}` : `${PREFIX}/reports/summary`;
  const { data } = await apiRequest(url, { method: "GET" });
  return (
    data ?? {
      grand_total_minutes: 0,
      by_project: [],
      by_user: [],
      by_project_and_user: [],
    }
  );
}

/**
 * Build the export PDF URL with current filters.
 * Opens a download dialog in the browser.
 *
 * @param {{
 *   date_from?: string,
 *   date_to?: string,
 *   user_uuid?: string[],
 *   project_uuid?: string[],
 * }} params
 */
export function getExportUrl(params = {}) {
  const q = new URLSearchParams();
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  appendMulti(q, "user_uuid", params.user_uuid);
  appendMulti(q, "project_uuid", params.project_uuid);
  const qs = q.toString();
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  return `${base}${PREFIX}/reports/export${qs ? `?${qs}` : ""}`;
}
