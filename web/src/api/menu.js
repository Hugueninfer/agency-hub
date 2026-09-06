import { apiRequest } from "./client";

const BASE = "/api/v1/workspace/menu";

export async function getMenu() {
  const { data } = await apiRequest(BASE, { method: "GET" });
  return data ?? { main: [], settings: [] };
}

export async function updateMenu(items) {
  const { data } = await apiRequest(BASE, {
    method: "PUT",
    json: { items },
  });
  return data;
}
