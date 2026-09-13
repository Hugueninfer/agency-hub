import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

import { createDemo } from "./auth";
import { apiRequest } from "./client";

describe("demo authentication", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ data: {} });
  });

  it("allows the free hosted database enough time to prepare an isolated demo", async () => {
    await createDemo();

    expect(apiRequest).toHaveBeenCalledWith("/api/v1/auth/demo", expect.objectContaining({
      timeoutMs: 60_000,
    }));
  });
});
