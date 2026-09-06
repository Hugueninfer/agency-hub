import { apiRequest } from "./client";

const T = "/api/v1/tasks";

export async function listTasks(projectUuid) {
  const { data } = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectUuid)}/tasks`, {
    method: "GET",
  });
  return Array.isArray(data) ? data : [];
}

export async function createTask(projectUuid, body) {
  const { data } = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectUuid)}/tasks`, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function getTask(taskUuid) {
  const { data } = await apiRequest(`${T}/${encodeURIComponent(taskUuid)}`, {
    method: "GET",
  });
  return data;
}

export async function updateTask(taskUuid, body) {
  const { data } = await apiRequest(`${T}/${encodeURIComponent(taskUuid)}`, {
    method: "PATCH",
    json: body,
  });
  return data;
}

export async function deleteTask(taskUuid) {
  await apiRequest(`${T}/${encodeURIComponent(taskUuid)}`, {
    method: "DELETE",
  });
}

export async function moveTask(taskUuid, body) {
  const { data } = await apiRequest(`${T}/${encodeURIComponent(taskUuid)}/move`, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function createSubtask(taskUuid, body) {
  const { data } = await apiRequest(`${T}/${encodeURIComponent(taskUuid)}/subtasks`, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function updateSubtask(taskUuid, subtaskUuid, body) {
  const { data } = await apiRequest(
    `${T}/${encodeURIComponent(taskUuid)}/subtasks/${encodeURIComponent(subtaskUuid)}`,
    {
      method: "PATCH",
      json: body,
    },
  );
  return data;
}

export async function deleteSubtask(taskUuid, subtaskUuid) {
  await apiRequest(
    `${T}/${encodeURIComponent(taskUuid)}/subtasks/${encodeURIComponent(subtaskUuid)}`,
    {
      method: "DELETE",
    },
  );
}

export async function addComment(taskUuid, jsonBody) {
  const { data } = await apiRequest(`${T}/${encodeURIComponent(taskUuid)}/comments`, {
    method: "POST",
    json: jsonBody,
  });
  return data;
}

export async function uploadTaskAttachment(taskUuid, file) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await apiRequest(`${T}/${encodeURIComponent(taskUuid)}/attachments`, {
    method: "POST",
    body,
  });
  return data;
}

export async function deleteTaskAttachment(taskUuid, attachmentUuid) {
  await apiRequest(
    `${T}/${encodeURIComponent(taskUuid)}/attachments/${encodeURIComponent(attachmentUuid)}`,
    {
      method: "DELETE",
    },
  );
}
