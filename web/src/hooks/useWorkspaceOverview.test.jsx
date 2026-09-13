import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as boardsApi from "../api/boards";
import * as invoicesApi from "../api/invoices";
import * as projectsApi from "../api/projects";
import * as rbacApi from "../api/rbac";
import * as tasksApi from "../api/tasks";
import * as timeApi from "../api/time";
import { useWorkspaceOverview } from "./useWorkspaceOverview";

vi.mock("../api/boards", () => ({ listBoards: vi.fn() }));
vi.mock("../api/invoices", () => ({ listInvoices: vi.fn() }));
vi.mock("../api/projects", () => ({ listProjects: vi.fn() }));
vi.mock("../api/rbac", () => ({ listUsers: vi.fn(), listRoles: vi.fn() }));
vi.mock("../api/tasks", () => ({ listTasks: vi.fn() }));
vi.mock("../api/time", () => ({ reportSummary: vi.fn() }));

const permissions = {
  isAuthenticated: true,
  canReadProjects: true,
  canReadTasks: true,
  canReadBoards: true,
  canReadInvoices: true,
  canRbacUsers: true,
  canRbacRoles: true,
  canAccessTime: true,
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useWorkspaceOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts every independent overview request without waiting for task data", async () => {
    const pending = {
      tasks: deferred(),
      boards: deferred(),
      invoices: deferred(),
      users: deferred(),
      roles: deferred(),
      time: deferred(),
    };
    projectsApi.listProjects.mockResolvedValue([{ uuid: "project-1", name: "Aurora", status: "active" }]);
    tasksApi.listTasks.mockReturnValue(pending.tasks.promise);
    boardsApi.listBoards.mockReturnValue(pending.boards.promise);
    invoicesApi.listInvoices.mockReturnValue(pending.invoices.promise);
    rbacApi.listUsers.mockReturnValue(pending.users.promise);
    rbacApi.listRoles.mockReturnValue(pending.roles.promise);
    timeApi.reportSummary.mockReturnValue(pending.time.promise);

    const { result } = renderHook(() => useWorkspaceOverview(permissions));

    await waitFor(() => expect(tasksApi.listTasks).toHaveBeenCalledWith("project-1"));
    expect(boardsApi.listBoards).toHaveBeenCalledOnce();
    expect(invoicesApi.listInvoices).toHaveBeenCalledOnce();
    expect(rbacApi.listUsers).toHaveBeenCalledOnce();
    expect(rbacApi.listRoles).toHaveBeenCalledOnce();
    expect(timeApi.reportSummary).toHaveBeenCalledOnce();

    await act(async () => {
      pending.tasks.resolve([]);
      pending.boards.resolve([]);
      pending.invoices.resolve([]);
      pending.users.resolve([]);
      pending.roles.resolve([]);
      pending.time.resolve({ grand_total_minutes: 0 });
      await Promise.all(Object.values(pending).map(({ promise }) => promise));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("keeps core dashboard data when optional overview requests fail", async () => {
    projectsApi.listProjects.mockResolvedValue([{ uuid: "project-1", name: "Aurora", status: "active" }]);
    tasksApi.listTasks.mockResolvedValue([{ uuid: "task-1", board_column: "todo" }]);
    boardsApi.listBoards.mockResolvedValue([{ uuid: "board-1" }]);
    invoicesApi.listInvoices.mockResolvedValue([{ uuid: "invoice-1", status: "draft" }]);
    rbacApi.listUsers.mockRejectedValue(new Error("users unavailable"));
    rbacApi.listRoles.mockResolvedValue([{ uuid: "role-1" }]);
    timeApi.reportSummary.mockRejectedValue(new Error("summary unavailable"));

    const { result } = renderHook(() => useWorkspaceOverview(permissions));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.totalProjects).toBe(1);
    expect(result.current.totalTasks).toBe(1);
    expect(result.current.totalBoards).toBe(1);
    expect(result.current.totalInvoices).toBe(1);
    expect(result.current.rbacUsersCount).toBeNull();
    expect(result.current.rbacRolesCount).toBe(1);
    expect(result.current.timeThisMonth).toEqual({ applicable: true, minutes: null, error: true });
  });
});
