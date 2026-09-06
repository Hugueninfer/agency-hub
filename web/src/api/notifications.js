import { apiRequest } from "./client";

const BASE = "/api/v1/notifications";

export async function listNotifications(page = 1, perPage = 20, filter = null) {
  let url = `${BASE}?page=${page}&per_page=${perPage}`;
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  const { data } = await apiRequest(url, { method: "GET" });
  return data;
}

export async function getUnreadCount() {
  const { data } = await apiRequest(`${BASE}/unread-count`, { method: "GET" });
  return data?.count ?? 0;
}

export async function markAsRead(uuid) {
  await apiRequest(`${BASE}/${encodeURIComponent(uuid)}/read`, { method: "PATCH" });
}

export async function markAllAsRead() {
  const { data } = await apiRequest(`${BASE}/read-all`, { method: "PATCH" });
  return data?.marked_read_count ?? 0;
}

export async function getPreferences() {
  const { data } = await apiRequest(`${BASE}/preferences`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function updatePreferences(preferences) {
  const { data } = await apiRequest(`${BASE}/preferences`, {
    method: "PUT",
    json: { preferences },
  });
  return data;
}
