import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDemoSession,
  hasDemoIntent,
  loadDemoSession,
  saveDemoSession,
} from "./demoSession";

const STORAGE_KEY = "agency-hub.demo";
const VALID_SESSION = {
  accessToken: "secret",
  expiresAt: "2099-01-01T00:00:00Z",
};

describe("demo session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads a valid saved demo session", () => {
    saveDemoSession(VALID_SESSION);

    expect(loadDemoSession()).toEqual(VALID_SESSION);
    expect(hasDemoIntent()).toBe(true);
  });

  it("removes malformed stored session data", () => {
    sessionStorage.setItem(STORAGE_KEY, "not-json");

    expect(loadDemoSession()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("removes sessions expired at the current time", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: "secret", expiresAt: "2026-09-06T00:00:00Z" }),
    );

    expect(loadDemoSession()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("rejects missing strings and invalid expiration dates", () => {
    saveDemoSession({ accessToken: "", expiresAt: VALID_SESSION.expiresAt });
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    saveDemoSession({ accessToken: "secret", expiresAt: "not-a-date" });
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: "secret", expiresAt: "not-a-date" }),
    );
    expect(loadDemoSession()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clears the active demo session explicitly", () => {
    saveDemoSession(VALID_SESSION);

    clearDemoSession();

    expect(loadDemoSession()).toBeNull();
    expect(hasDemoIntent()).toBe(false);
  });

  it("stores the token only in tab-scoped sessionStorage", () => {
    saveDemoSession(VALID_SESSION);

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(VALID_SESSION));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(document.cookie).not.toContain("secret");
  });
});
