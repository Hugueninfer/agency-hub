import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as boardsApi from "../api/boards";
import * as invoicesApi from "../api/invoices";
import * as projectsApi from "../api/projects";
import * as rbacApi from "../api/rbac";
import * as tasksApi from "../api/tasks";
import * as timeApi from "../api/time";

const BOARD_COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "pendency", label: "Pendency" },
  { id: "done", label: "Complete" },
];

const TASK_FETCH_CONCURRENCY = 8;

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonthIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Fetch tasks for many projects without unbounded parallelism.
 * @template T
 * @param {Array<{uuid: string}>} projects
 * @param {(projectUuid: string) => Promise<T[]>} fetchFn
 */
async function batchedTasksByProject(projects, fetchFn) {
  const map = new Map();
  for (let i = 0; i < projects.length; i += TASK_FETCH_CONCURRENCY) {
    const slice = projects.slice(i, i + TASK_FETCH_CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (p) => [p.uuid, await fetchFn(p.uuid)]),
    );
    for (const [uuid, tasks] of results) {
      map.set(uuid, tasks);
    }
  }
  return map;
}

function taskTimestamp(t) {
  const u = t?.updated_at;
  const c = t?.created_at;
  const du = u ? Date.parse(u) : NaN;
  const dc = c ? Date.parse(c) : NaN;
  if (!Number.isNaN(du) && !Number.isNaN(dc)) return Math.max(du, dc);
  if (!Number.isNaN(du)) return du;
  return Number.isNaN(dc) ? 0 : dc;
}

/**
 * Workspace-wide overview for Dashboard (frontend aggregation).
 *
 * @param {{
 *   isAuthenticated: boolean,
 *   canReadProjects: boolean,
 *   canReadTasks: boolean,
 *   canReadBoards: boolean,
 *   canReadInvoices: boolean,
 *   canRbacUsers: boolean,
 *   canRbacRoles: boolean,
 *   canAccessTime: boolean,
 * }} opts
 */
export function useWorkspaceOverview({
  isAuthenticated,
  canReadProjects,
  canReadTasks,
  canReadBoards,
  canReadInvoices,
  canRbacUsers,
  canRbacRoles,
  canAccessTime,
}) {
  const [projects, setProjects] = useState([]);
  const [tasksByProjectUuid, setTasksByProjectUuid] = useState(() => new Map());
  const [boards, setBoards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [rbacUsersCount, setRbacUsersCount] = useState(null);
  const [rbacRolesCount, setRbacRolesCount] = useState(null);
  /** Month-to-date total minutes when `canAccessTime`; error flag if the summary request failed. */
  const [timeThisMonth, setTimeThisMonth] = useState(() => ({
    applicable: false,
    minutes: null,
    error: false,
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([]);
      setTasksByProjectUuid(new Map());
      setBoards([]);
      setInvoices([]);
      setRbacUsersCount(null);
      setRbacRolesCount(null);
      setTimeThisMonth({ applicable: false, minutes: null, error: false });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectsAndTasks = (async () => {
        let projectList = [];
        if (canReadProjects) {
          projectList = await projectsApi.listProjects();
        }

        const taskMap = new Map();
        if (canReadTasks && projectList.length > 0) {
          const batches = await batchedTasksByProject(projectList, (uuid) =>
            tasksApi.listTasks(uuid),
          );
          for (const p of projectList) {
            taskMap.set(p.uuid, batches.get(p.uuid) ?? []);
          }
        }

        return { projectList, taskMap };
      })();

      const boardsRequest = canReadBoards ? boardsApi.listBoards() : Promise.resolve([]);
      const invoicesRequest = canReadInvoices ? invoicesApi.listInvoices() : Promise.resolve([]);
      const usersCountRequest = canRbacUsers
        ? rbacApi.listUsers().then((users) => users.length).catch(() => null)
        : Promise.resolve(null);
      const rolesCountRequest = canRbacRoles
        ? rbacApi.listRoles().then((roles) => roles.length).catch(() => null)
        : Promise.resolve(null);
      const timeRequest = canAccessTime
        ? timeApi.reportSummary({
          date_from: startOfMonthIso(),
          date_to: todayIso(),
        }).then((summary) => ({
          applicable: true,
          minutes: summary?.grand_total_minutes ?? 0,
          error: false,
        })).catch(() => ({ applicable: true, minutes: null, error: true }))
        : Promise.resolve({ applicable: false, minutes: null, error: false });

      const [core, boardList, invoiceList, usersCount, rolesCount, timeSummary] = await Promise.all([
        projectsAndTasks,
        boardsRequest,
        invoicesRequest,
        usersCountRequest,
        rolesCountRequest,
        timeRequest,
      ]);

      setProjects(core.projectList);
      setTasksByProjectUuid(core.taskMap);
      setBoards(boardList);
      setInvoices(invoiceList);
      setRbacUsersCount(usersCount);
      setRbacRolesCount(rolesCount);
      setTimeThisMonth(timeSummary);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load workspace overview.");
      setProjects([]);
      setTasksByProjectUuid(new Map());
      setBoards([]);
      setInvoices([]);
      setTimeThisMonth({ applicable: false, minutes: null, error: false });
    } finally {
      setLoading(false);
    }
  }, [
    isAuthenticated,
    canReadProjects,
    canReadTasks,
    canReadBoards,
    canReadInvoices,
    canRbacUsers,
    canRbacRoles,
    canAccessTime,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const derived = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status !== "archived").length;
    const archivedProjects = projects.filter((p) => p.status === "archived").length;

    let totalTasks = 0;
    let doneTasks = 0;
    const byColumn = Object.fromEntries(BOARD_COLUMNS.map((c) => [c.id, 0]));

    /** @type {Array<{ task: object, projectName: string, projectUuid: string }>} */
    const flat = [];

    for (const p of projects) {
      const tasks = tasksByProjectUuid.get(p.uuid) ?? [];
      const name = p.name ?? "Project";
      for (const t of tasks) {
        totalTasks += 1;
        const col = t.board_column;
        if (col && byColumn[col] !== undefined) byColumn[col] += 1;
        else if (byColumn.todo !== undefined) byColumn.todo += 1;
        if (col === "done") doneTasks += 1;
        flat.push({ task: t, projectName: name, projectUuid: p.uuid });
      }
    }

    const openTasks = totalTasks - doneTasks;

    const recent = [...flat]
      .sort((a, b) => taskTimestamp(b.task) - taskTimestamp(a.task))
      .slice(0, 10);

    const projectProgress = projects.map((p) => {
      const tasks = tasksByProjectUuid.get(p.uuid) ?? [];
      const tot = tasks.length;
      const done = tasks.filter((t) => t.board_column === "done").length;
      const pct = tot > 0 ? Math.round((done / tot) * 100) : 0;
      return { project: p, total: tot, done, progressPct: pct };
    });

    const columnChart = BOARD_COLUMNS.map((c) => ({
      id: c.id,
      label: c.label,
      count: byColumn[c.id] ?? 0,
    }));
    const maxCol = Math.max(1, ...columnChart.map((x) => x.count));

    const now = Date.now();
    let draftInvoices = 0;
    let sentInvoices = 0;
    let paidInvoices = 0;
    let overdueInvoices = 0;
    for (const inv of invoices) {
      const status = (inv?.status ?? "").toLowerCase();
      if (status === "draft") draftInvoices += 1;
      if (status === "sent") sentInvoices += 1;
      if (status === "paid") paidInvoices += 1;

      const due = inv?.due_date ? Date.parse(inv.due_date) : NaN;
      if (!Number.isNaN(due) && due < now && status !== "paid") {
        overdueInvoices += 1;
      }
    }

    return {
      activeProjects,
      archivedProjects,
      totalProjects: projects.length,
      totalTasks,
      doneTasks,
      openTasks,
      byColumn,
      columnChart,
      maxCol,
      recent,
      projectProgress,
      totalBoards: boards.length,
      totalInvoices: invoices.length,
      draftInvoices,
      sentInvoices,
      paidInvoices,
      overdueInvoices,
    };
  }, [projects, tasksByProjectUuid, boards, invoices]);

  return {
    loading,
    error,
    refresh: load,
    projects,
    boards,
    invoices,
    rbacUsersCount,
    rbacRolesCount,
    timeThisMonth,
    ...derived,
  };
}
