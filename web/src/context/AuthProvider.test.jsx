import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AuthProvider from "./AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { loadDemoSession, saveDemoSession } from "../lib/demoSession";
import DemoBanner from "../components/DemoBanner";
import DemoResetCard from "../components/settings/DemoResetCard";
import { apiRequest } from "../api/client";
import * as authApi from "../api/auth";

const demo = { uuid: "demo-user", name: "Demo", permissions: [], is_demo: true, expires_at: "2099-01-01T00:00:00Z" };
const personal = { uuid: "real-user", name: "Personal", permissions: [], is_demo: false, expires_at: null };
let auth, requests, me;
const json = (data, status = 200) => new Response(JSON.stringify({ success: status < 400, data, message: status === 401 ? "Unauthorized" : "OK" }), { status, headers: { "Content-Type": "application/json" } });
function Probe() {
  const current = useAuth();
  useEffect(() => { auth = current; }, [current]);
  const location = useLocation();
  return <><output>{current.identityKind || "guest"}:{current.user?.name}:{location.pathname}:{location.state?.message}</output><DemoBanner /><DemoResetCard /></>;
}
function setup(path = "/") { return render(<MemoryRouter initialEntries={[path]}><AuthProvider><Probe /></AuthProvider></MemoryRouter>); }
beforeEach(() => {
  sessionStorage.clear(); requests = []; me = null;
  vi.stubGlobal("fetch", vi.fn(async (url, options) => {
    requests.push({ url, options, stored: loadDemoSession() });
    if (url.endsWith("/auth/me")) return me ? json(me) : json(null, 401);
    if (url.endsWith("/auth/demo")) { me = demo; return json({ access_token: "demo-secret", expires_at: demo.expires_at }); }
    if (url.endsWith("/auth/login")) { me = personal; return json({ user: personal }); }
    return json(null);
  }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("saves the demo before fetching me and exposes explicit identity", async () => {
  setup("/login");
  await waitFor(() => expect(requests).toHaveLength(1));
  await act(async () => { await auth.startDemo(); });
  expect(auth.identityKind).toBe("demo");
  expect(loadDemoSession()?.accessToken).toBe("demo-secret");
  const request = requests.at(-1);
  expect(request.stored?.accessToken).toBe("demo-secret");
  expect(request.options.headers.get("Authorization")).toBe("Bearer demo-secret");
  expect(request.options.credentials).toBe("omit");
  expect(screen.getByText(/Demonstração ·/)).toBeInTheDocument();
});

it("restores a valid demo on reload without personal cookies", async () => {
  saveDemoSession({ accessToken: "demo-secret", expiresAt: demo.expires_at }); me = demo;
  setup();
  await waitFor(() => expect(auth.identityKind).toBe("demo"));
  expect(requests[0].options.credentials).toBe("omit");
  expect(screen.getByRole("button", { name: "Reiniciar demonstração" })).toBeInTheDocument();
});

it("expired demo clears storage and returns to login with a message without trying personal me", async () => {
  sessionStorage.setItem("agency-hub.demo", JSON.stringify({ accessToken: "expired", expiresAt: "2000-01-01T00:00:00Z" })); me = personal;
  setup();
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("/login"));
  expect(screen.getByRole("status")).toHaveTextContent(/expirou/i);
  expect(loadDemoSession()).toBeNull();
  expect(requests).toHaveLength(0);
  expect(auth.identityKind).toBeNull();
});

it("clears a newly stored token if demo me fails", async () => {
  setup(); await waitFor(() => expect(requests).toHaveLength(1));
  fetch.mockImplementation(async (url) => url.endsWith("/auth/demo") ? json({ access_token: "bad", expires_at: demo.expires_at }) : json(null, 401));
  await act(async () => { await expect(auth.startDemo()).rejects.toThrow(); });
  expect(loadDemoSession()).toBeNull(); expect(auth.identityKind).toBeNull();
});

it("demo logout clears local state first but sends the captured Bearer token to the demo endpoint", async () => {
  saveDemoSession({ accessToken: "demo-secret", expiresAt: demo.expires_at }); me = demo;
  setup(); await waitFor(() => expect(auth.identityKind).toBe("demo"));
  await act(async () => { await auth.logout(); });
  const request = requests.at(-1);
  expect(request.url).toBe("/api/v1/auth/demo/logout");
  expect(request.stored).toBeNull();
  expect(request.options.headers.get("Authorization")).toBe("Bearer demo-secret");
  expect(request.options.credentials).toBe("omit");
  expect(auth.identityKind).toBeNull();
});

it("personal login clears demo credentials before CSRF and uses personal logout", async () => {
  saveDemoSession({ accessToken: "demo-secret", expiresAt: demo.expires_at }); me = demo;
  setup(); await waitFor(() => expect(auth.identityKind).toBe("demo"));
  await act(async () => { await auth.login("real@example.com", "password"); });
  expect(auth.identityKind).toBe("personal");
  for (const request of requests.slice(1)) {
    expect(request.options.headers.has("Authorization")).toBe(false);
    expect(request.options.credentials).toBe("include");
  }
  expect(screen.queryByText(/Demonstração ·/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reiniciar demonstração" })).not.toBeInTheDocument();
  await act(async () => { await auth.logout(); });
  expect(requests.at(-1).url).toBe("/api/v1/auth/logout");
});

it("requires reset confirmation then refreshes me and invalidates route data once", async () => {
  saveDemoSession({ accessToken: "demo-secret", expiresAt: demo.expires_at }); me = demo;
  setup(); await waitFor(() => expect(auth.identityKind).toBe("demo"));
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar demonstração" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent(/todas.*alterações/i);
  expect(screen.getByRole("alertdialog")).toHaveTextContent(/apenas esta demonstração/i);
  expect(requests).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reinício" }));
  await waitFor(() => expect(auth.dataVersion).toBe(1));
  expect(requests.map((r) => r.url)).toEqual(["/api/v1/auth/me", "/api/v1/auth/demo/reset", "/api/v1/auth/me"]);
  expect(requests.every((r) => r.options.credentials === "omit")).toBe(true);
});

it("an expired demo request never falls back to personal cookies before the expiry timer", async () => {
  saveDemoSession({ accessToken: "demo-secret", expiresAt: demo.expires_at }); me = demo;
  setup(); await waitFor(() => expect(auth.identityKind).toBe("demo"));
  sessionStorage.setItem("agency-hub.demo", JSON.stringify({ accessToken: "expired", expiresAt: "2000-01-01T00:00:00Z" }));
  await act(async () => { await expect(apiRequest("/api/v1/projects")).rejects.toThrow(); });
  expect(requests).toHaveLength(1);
  expect(auth.identityKind).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent(/expirou/i);
});

it("a captured logout token cannot be replaced by a newer demo session", async () => {
  saveDemoSession({ accessToken: "new-demo", expiresAt: demo.expires_at });
  await authApi.logoutDemo("old-demo");
  expect(requests[0].options.headers.get("Authorization")).toBe("Bearer old-demo");
});

it("a personal logout keeps cookie transport even if a demo starts during CSRF", async () => {
  fetch.mockImplementation(async (url, options) => {
    requests.push({ url, options });
    if (url === "/sanctum/csrf-cookie") saveDemoSession({ accessToken: "new-demo", expiresAt: demo.expires_at });
    return json(null);
  });
  await authApi.logout();
  expect(requests.at(-1).options.credentials).toBe("include");
  expect(requests.at(-1).options.headers.has("Authorization")).toBe(false);
});

it("a late bootstrap response cannot replace a demo started in the meantime", async () => {
  let finishBoot;
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finishBoot = resolve; }));
  setup("/login");
  await act(async () => { await auth.startDemo(); });
  await act(async () => { finishBoot(json(personal)); });
  expect(auth.identityKind).toBe("demo");
  expect(auth.user.name).toBe("Demo");
});

it("personal sessions cannot reset", async () => {
  me = personal; setup(); await waitFor(() => expect(auth.identityKind).toBe("personal"));
  await expect(auth.resetDemo()).rejects.toThrow(/Apenas demonstrações/);
  expect(requests).toHaveLength(1);
});

it("demo lifetime is absolute even after activity and expired requests return to login", async () => {
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  saveDemoSession({ accessToken: "demo-secret", expiresAt }); me = { ...demo, expires_at: expiresAt };
  setup(); await waitFor(() => expect(auth.identityKind).toBe("demo"));
  const before = JSON.parse(sessionStorage.getItem("workflow_auth_session")).expiresAt;
  fireEvent.click(document.body);
  expect(JSON.parse(sessionStorage.getItem("workflow_auth_session")).expiresAt).toBe(before);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(expiresAt));
  // Dispatching an activity must never extend demo expiry.
  fireEvent.click(document.body);
  await act(async () => { await expect(apiRequest("/api/v1/projects")).rejects.toThrow(); });
  expect(screen.getByRole("status")).toHaveTextContent(/expirou/i);
});

it("a late unauthorized demo response cannot clear a newer token", async () => {
  saveDemoSession({ accessToken: "old-demo", expiresAt: demo.expires_at });
  let finish;
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const request = apiRequest("/api/v1/projects");
  saveDemoSession({ accessToken: "new-demo", expiresAt: demo.expires_at });
  finish(json(null, 401));
  await expect(request).rejects.toThrow();
  expect(loadDemoSession()?.accessToken).toBe("new-demo");
});

it("a request that finishes after demo expiry cannot make the next request use cookies", async () => {
  vi.useFakeTimers();
  const expiresAt = new Date(Date.now() + 1_000).toISOString();
  saveDemoSession({ accessToken: "demo-secret", expiresAt });
  fetch.mockImplementationOnce(async () => {
    vi.setSystemTime(new Date(expiresAt));
    return json([]);
  });
  await apiRequest("/api/v1/projects");
  await expect(apiRequest("/api/v1/projects")).rejects.toThrow(/expirou/);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("canceling the reset confirmation preserves current demo data", async () => {
  saveDemoSession({ accessToken: "demo-secret", expiresAt: demo.expires_at }); me = demo;
  setup(); await waitFor(() => expect(auth.identityKind).toBe("demo"));
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar demonstração" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reiniciar demonstração" })).toHaveFocus();
  expect(requests).toHaveLength(1);
  expect(auth.dataVersion).toBe(0);
});
