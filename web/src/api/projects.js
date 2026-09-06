import { apiRequest } from "./client";

const PREFIX = "/api/v1/projects";

export async function listProjects() {
  const { data } = await apiRequest(`${PREFIX}`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createProject(body) {
  const { data } = await apiRequest(`${PREFIX}`, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function getProject(uuid) {
  const { data } = await apiRequest(`${PREFIX}/${encodeURIComponent(uuid)}`, {
    method: "GET",
  });
  return data;
}

export async function updateProject(uuid, body) {
  const { data } = await apiRequest(`${PREFIX}/${encodeURIComponent(uuid)}`, {
    method: "PATCH",
    json: body,
  });
  return data;
}

export async function deleteProject(uuid) {
  await apiRequest(`${PREFIX}/${encodeURIComponent(uuid)}`, {
    method: "DELETE",
  });
}
