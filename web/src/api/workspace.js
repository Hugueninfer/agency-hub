import { apiRequest } from "./client";

const PREFIX = "/api/v1/workspace";

export async function listWorkspaceUsers() {
  const { data } = await apiRequest(`${PREFIX}/users`, {
    method: "GET",
  });
  return Array.isArray(data) ? data : [];
}
