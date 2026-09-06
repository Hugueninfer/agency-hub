import { apiRequest, getApiBaseUrl } from "./client";

const PREFIX = "/api/v1/rbac";

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function resolveApiAssetUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getApiBaseUrl();
  if (!base) return url;
  try {
    const parsed = new URL(base);
    const assetPath = url.startsWith("/") ? url : `/${url}`;
    return `${parsed.origin}${assetPath}`;
  } catch {
    return `${base}${url.startsWith("/") ? url : `/${url}`}`;
  }
}

export async function listPermissions() {
  const { data } = await apiRequest(`${PREFIX}/permissions`, {
    method: "GET",
  });
  return unwrapList(data);
}

export async function listRoles() {
  const { data } = await apiRequest(`${PREFIX}/roles`, {
    method: "GET",
  });
  return unwrapList(data);
}

export async function listUsers() {
  const { data } = await apiRequest(`${PREFIX}/users`, {
    method: "GET",
  });
  return unwrapList(data).map((u) => ({
    ...u,
    photo_url: resolveApiAssetUrl(u?.photo_url),
  }));
}

export async function createUser(body) {
  const form = new FormData();
  form.append("name", body.name);
  form.append("email", body.email);
  form.append("password", body.password);
  form.append("role_uuid", body.role_uuid);
  if (body.photo instanceof File) {
    form.append("photo", body.photo);
  }

  const { message, data } = await apiRequest(`${PREFIX}/users`, {
    method: "POST",
    body: form,
  });
  return {
    message,
    data: data ? { ...data, photo_url: resolveApiAssetUrl(data.photo_url) } : data,
  };
}

export async function updateUser(userUuid, body) {
  const form = new FormData();
  form.append("_method", "PATCH");
  form.append("name", body.name);
  form.append("email", body.email);
  form.append("role_uuid", body.role_uuid);
  if (body.password) form.append("password", body.password);
  if (body.photo instanceof File) form.append("photo", body.photo);
  if (body.remove_photo) form.append("remove_photo", "1");

  const { message, data } = await apiRequest(`${PREFIX}/users/${encodeURIComponent(userUuid)}`, {
    method: "POST",
    body: form,
  });
  return {
    message,
    data: data ? { ...data, photo_url: resolveApiAssetUrl(data.photo_url) } : data,
  };
}

export async function deleteUser(userUuid) {
  const { message } = await apiRequest(`${PREFIX}/users/${encodeURIComponent(userUuid)}`, {
    method: "DELETE",
  });
  return { message };
}

export async function createRole(body) {
  const { data } = await apiRequest(`${PREFIX}/roles`, {
    method: "POST",
    json: body,
  });
  return data;
}

export async function assignPermissionsToRole(roleUuid, permissionCodes) {
  const { data } = await apiRequest(`${PREFIX}/roles/${roleUuid}/permissions`, {
    method: "POST",
    json: { permission_codes: permissionCodes },
  });
  return data;
}

export async function assignRoleToUser(body) {
  await apiRequest(`${PREFIX}/user-role`, {
    method: "POST",
    json: body,
  });
}
