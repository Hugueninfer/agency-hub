import { apiRequest } from "./client";

const BASE = "/api/v1/workspace/settings";

export async function getSettings() {
  const { data } = await apiRequest(BASE, { method: "GET" });
  return data ?? null;
}

/**
 * @param {FormData} formData - logo, drive_link, drive_link_label, remove_logo
 */
export async function updateSettings(formData) {
  const { data } = await apiRequest(BASE, {
    method: "PATCH",
    body: formData,
  });
  return data;
}
