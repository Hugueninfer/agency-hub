import { apiRequest } from "./client";

export async function getConfig() {
  const { data } = await apiRequest("/api/v1/config", {
    method: "GET",
    credentials: "omit",
    skipAuthEvent: true,
  });
  return data ?? null;
}
