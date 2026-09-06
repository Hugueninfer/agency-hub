import { apiRequest } from "./client";

const PREFIX = "/api/v1/boards";

export async function listBoards() {
  const { data } = await apiRequest(PREFIX, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createBoard(body) {
  const { data } = await apiRequest(PREFIX, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function getBoard(boardUuid) {
  const { data } = await apiRequest(`${PREFIX}/${encodeURIComponent(boardUuid)}`, {
    method: "GET",
  });
  return data;
}

export async function updateBoard(boardUuid, body) {
  const { data } = await apiRequest(`${PREFIX}/${encodeURIComponent(boardUuid)}`, {
    method: "PATCH",
    json: body,
  });
  return data;
}

export async function deleteBoard(boardUuid) {
  await apiRequest(`${PREFIX}/${encodeURIComponent(boardUuid)}`, {
    method: "DELETE",
  });
}
