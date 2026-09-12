import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as projectsApi from "../api/projects";
import * as timeApi from "../api/time";
import * as workspaceApi from "../api/workspace";
import DatePickerField from "../components/DatePickerField";
import FieldSelect from "../components/FieldSelect";
import ConfirmDialog from "../components/ConfirmDialog";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

/** Local calendar date YYYY-MM-DD (matches `<input type="date">`). */
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

/** True when worked_date string is later than today (local). */
function workedDateIsInFuture(iso) {
  if (!iso || typeof iso !== "string") return false;
  return iso > todayIso();
}

function splitMinutes(total) {
  const m = Math.max(0, Number(total) || 0);
  return { hours: Math.floor(m / 60), minutes: m % 60 };
}

function combineMinutes(hours, minutes) {
  const hRaw = Number.parseInt(String(hours ?? 0), 10);
  const miRaw = Number.parseInt(String(minutes ?? 0), 10);
  const h = Number.isNaN(hRaw) ? 0 : hRaw;
  const mi = Number.isNaN(miRaw) ? 0 : miRaw;
  return Math.max(1, h * 60 + mi);
}

function formatDuration(minutes) {
  const m = Number(minutes) || 0;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

function elapsedSince(iso) {
  if (!iso) return 0;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

const CLOCK_ICON = (
  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/** Stop-and-save entry — stop icon */
const STOP_REGISTER_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
  </svg>
);

function formatClockHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function initialsFromName(name) {
  if (!name || typeof name !== "string") return "?";
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function PersonCell({ name, photoUrl }) {
  const [imgErr, setImgErr] = useState(false);
  const displayName = name ?? "—";
  const showImg = Boolean(photoUrl) && !imgErr;

  return (
    <div className="flex min-w-0 items-center gap-2">
      {showImg ? (
        <img
          src={photoUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full border object-cover"
          style={{ borderColor: "var(--color-border)" }}
          onError={() => setImgErr(true)}
        />
      ) : (
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-semibold"
          style={{
            backgroundColor: "var(--color-accent-purple-soft)",
            color: "var(--color-accent-purple)",
          }}
          aria-hidden
        >
          {initialsFromName(displayName === "—" ? "" : displayName)}
        </span>
      )}
      <span className="min-w-0 truncate text-body" style={{ color: "var(--color-txt-primary)" }}>
        {displayName}
      </span>
    </div>
  );
}

/** Unique projects derived from assignee tasks only (timer modal). */
function projectsFromAssignableTasksOnly(tasksArr) {
  const map = new Map();
  for (const t of tasksArr) {
    const p = t.project;
    if (p?.uuid) {
      map.set(p.uuid, { uuid: p.uuid, name: p.name ?? "Project" });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Filters panel: tenant projects merged with assignee-task projects for report filter. */
function mergeProjectsFromApiAndTasks(apiProjects, tasksArr) {
  const map = new Map();
  for (const p of apiProjects) {
    if (p?.uuid) {
      map.set(p.uuid, { uuid: p.uuid, name: p.name ?? "Project" });
    }
  }
  for (const t of tasksArr) {
    const p = t.project;
    if (p?.uuid) {
      map.set(p.uuid, { uuid: p.uuid, name: p.name ?? "Project" });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function HoursPage() {
  const { user, hasPermission } = useAuth();
  const canRead = hasPermission("time.read");
  const canCreate = hasPermission("time.create");
  const canUpdateOwn = hasPermission("time.update_own");
  const canDeleteOwn = hasPermission("time.delete_own");

  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);

  const [projects, setProjects] = useState([]);
  /** Projects that have assignee tasks only (timer modal & manual entry project filters). */
  const [timerModalProjects, setTimerModalProjects] = useState([]);
  /** Full assignable task list (before timer-project filter). */
  const [tasksAll, setTasksAll] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);

  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [filterProjectUuid, setFilterProjectUuid] = useState("");
  const [filterUserUuid, setFilterUserUuid] = useState("");
  const [taskListProjectUuid, setTaskListProjectUuid] = useState("");
  /** Narrows task list in «Add manual entry» only (independent from timer modal). */
  const [manualEntryProjectUuid, setManualEntryProjectUuid] = useState("");

  const [activePayload, setActivePayload] = useState(null);
  const [tick, setTick] = useState(0);

  const [draft, setDraft] = useState({
    task_uuid: "",
    worked_date: todayIso(),
    hours: "0",
    minutes: "30",
  });

  const [timerTaskUuid, setTimerTaskUuid] = useState("");
  const [timerModalOpen, setTimerModalOpen] = useState(false);

  const [rowDrafts, setRowDrafts] = useState({});
  const [deleteUuid, setDeleteUuid] = useState(null);
  const [saving, setSaving] = useState(false);

  const myUuid = user?.uuid ?? null;

  const loadFiltersData = useCallback(async () => {
    try {
      const taskList = await timeApi.listAssignableTasks({});
      const tasksAllArr = Array.isArray(taskList) ? taskList : [];
      setTasksAll(tasksAllArr);
      setTimerModalProjects(projectsFromAssignableTasksOnly(tasksAllArr));
      const tasksArr = taskListProjectUuid
        ? tasksAllArr.filter((t) => (t.project?.uuid ?? "") === taskListProjectUuid)
        : tasksAllArr;
      setTasks(tasksArr);

      let apiProjects = [];
      try {
        const raw = await projectsApi.listProjects();
        apiProjects = Array.isArray(raw) ? raw : [];
      } catch {
        apiProjects = [];
      }

      setProjects(mergeProjectsFromApiAndTasks(apiProjects, tasksAllArr));
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not load tasks for time tracking.",
      });
      setTasks([]);
      setTasksAll([]);
      setProjects([]);
      setTimerModalProjects([]);
    }
  }, [taskListProjectUuid]);

  const loadWorkspaceUsers = useCallback(async () => {
    try {
      const users = await workspaceApi.listWorkspaceUsers();
      setWorkspaceUsers(Array.isArray(users) ? users : []);
    } catch {
      setWorkspaceUsers([]);
    }
  }, []);

  const loadCore = useCallback(async () => {
    if (!canRead) {
      setEntries([]);
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const [entriesPayload, summaryPayload, active] = await Promise.all([
        timeApi.listEntries({
          date_from: dateFrom,
          date_to: dateTo,
          user_uuid: filterUserUuid ? [filterUserUuid] : undefined,
          project_uuid: filterProjectUuid ? [filterProjectUuid] : undefined,
          per_page: 100,
        }),
        timeApi.reportSummary({
          date_from: dateFrom,
          date_to: dateTo,
          user_uuid: filterUserUuid ? [filterUserUuid] : undefined,
          project_uuid: filterProjectUuid ? [filterProjectUuid] : undefined,
        }),
        timeApi.getActiveSession(),
      ]);
      setEntries(entriesPayload?.items ?? []);
      setSummary(summaryPayload);
      setActivePayload(active);
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not load time data.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    canRead,
    dateFrom,
    dateTo,
    filterProjectUuid,
    filterUserUuid,
  ]);

  useEffect(() => {
    if (!timerModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setTimerModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timerModalOpen]);

  useEffect(() => {
    loadFiltersData();
  }, [loadFiltersData]);

  useEffect(() => {
    loadWorkspaceUsers();
  }, [loadWorkspaceUsers]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!canRead) return undefined;
    const id = setInterval(() => {
      timeApi.getActiveSession().then(setActivePayload).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [canRead]);

  const active = activePayload?.active === true ? activePayload.session : null;
  const activeSeconds = useMemo(() => {
    void tick;
    if (!active?.started_at) return 0;
    return elapsedSince(active.started_at);
  }, [active, tick]);

  const isMine = useCallback(
    (entry) => entry?.user?.uuid && myUuid && entry.user.uuid === myUuid,
    [myUuid],
  );

  const taskOptions = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      map.set(t.uuid, t);
    }
    for (const e of entries) {
      if (e.task?.uuid && !map.has(e.task.uuid)) {
        map.set(e.task.uuid, {
          uuid: e.task.uuid,
          title: e.task.title,
          project: e.project,
        });
      }
    }
    return [...map.values()];
  }, [tasks, entries]);

  /** Tasks shown in Add manual entry — filtered by project when set; merges tasks from visible entries. */
  const manualEntryTaskOptions = useMemo(() => {
    const base = manualEntryProjectUuid
      ? tasksAll.filter((t) => (t.project?.uuid ?? "") === manualEntryProjectUuid)
      : tasksAll;
    const map = new Map();
    for (const t of base) {
      map.set(t.uuid, t);
    }
    for (const e of entries) {
      if (e.task?.uuid && !map.has(e.task.uuid)) {
        map.set(e.task.uuid, {
          uuid: e.task.uuid,
          title: e.task.title,
          project: e.project,
        });
      }
    }
    return [...map.values()];
  }, [tasksAll, manualEntryProjectUuid, entries]);

  function initRowDraft(entry) {
    const { hours, minutes } = splitMinutes(entry.duration_minutes);
    return {
      task_uuid: entry.task?.uuid ?? "",
      worked_date: entry.worked_date ?? todayIso(),
      hours: String(hours),
      minutes: String(minutes),
    };
  }

  async function handleStartTimer() {
    if (!canCreate || !timerTaskUuid) {
      setBanner({ type: "error", text: "Pick a task to start the timer." });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await timeApi.startSession(timerTaskUuid);
      setTimerModalOpen(false);
      await loadCore();
      await loadFiltersData();
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not start the timer.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleStopTimer() {
    setSaving(true);
    setBanner(null);
    try {
      await timeApi.stopSession();
      await loadCore();
      await loadFiltersData();
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not stop the timer.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateManual() {
    if (!canCreate) return;
    if (!draft.task_uuid) {
      setBanner({ type: "error", text: "Select a task." });
      return;
    }
    if (workedDateIsInFuture(draft.worked_date)) {
      setBanner({
        type: "error",
        text: "Worked date cannot be in the future.",
      });
      return;
    }
    const duration_minutes = combineMinutes(draft.hours, draft.minutes);
    setSaving(true);
    setBanner(null);
    try {
      await timeApi.createEntry({
        task_uuid: draft.task_uuid,
        worked_date: draft.worked_date,
        duration_minutes,
      });
      setDraft({
        task_uuid: "",
        worked_date: todayIso(),
        hours: "0",
        minutes: "30",
      });
      await loadCore();
      await loadFiltersData();
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not save entry.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRow(entry) {
    if (!canUpdateOwn || !isMine(entry)) return;
    const d = rowDrafts[entry.uuid] ?? initRowDraft(entry);
    if (workedDateIsInFuture(d.worked_date)) {
      setBanner({
        type: "error",
        text: "Worked date cannot be in the future.",
      });
      return;
    }
    const duration_minutes = combineMinutes(d.hours, d.minutes);
    setSaving(true);
    setBanner(null);
    try {
      await timeApi.updateEntry(entry.uuid, {
        task_uuid: d.task_uuid || entry.task?.uuid,
        worked_date: d.worked_date,
        duration_minutes,
      });
      await loadCore();
      setRowDrafts((prev) => {
        const next = { ...prev };
        delete next[entry.uuid];
        return next;
      });
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not update entry.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteUuid || !canDeleteOwn) return;
    setSaving(true);
    setBanner(null);
    try {
      await timeApi.deleteEntry(deleteUuid);
      setDeleteUuid(null);
      await loadCore();
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not delete entry.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <div className="space-y-6 pb-28">
        {banner && <AlertBanner type={banner.type} message={banner.text} onClose={() => setBanner(null)} />}

        <Panel title="Filters">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
              From
              <DatePickerField value={dateFrom} onChange={setDateFrom} showClear={false} placeholder="Start date" />
            </label>
            <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
              To
              <DatePickerField value={dateTo} onChange={setDateTo} showClear={false} placeholder="End date" />
            </label>
            <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
              People (optional)
              <FieldSelect value={filterUserUuid} onChange={(e) => setFilterUserUuid(e.target.value)}>
                <option value="">All people</option>
                {workspaceUsers.map((u) => (
                  <option key={u.uuid} value={u.uuid}>
                    {u.name}
                  </option>
                ))}
              </FieldSelect>
            </label>
            <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
              Projects (optional)
              <FieldSelect value={filterProjectUuid} onChange={(e) => setFilterProjectUuid(e.target.value)}>
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.name}
                  </option>
                ))}
              </FieldSelect>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const url = timeApi.getExportUrl({
                  date_from: dateFrom,
                  date_to: dateTo,
                  user_uuid: filterUserUuid ? [filterUserUuid] : undefined,
                  project_uuid: filterProjectUuid ? [filterProjectUuid] : undefined,
                });
                window.open(url, "_blank");
              }}
              className="btn-secondary inline-flex items-center gap-2 !py-2 !px-4"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Excel
            </button>
          </div>
        </Panel>

        {summary && canRead && (
          <Panel title="Summary">
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <p className="text-caption uppercase tracking-wide" style={{ color: "var(--color-txt-muted)" }}>
                  Total (period)
                </p>
                <p className="text-title-lg font-semibold mt-1" style={{ color: "var(--color-txt-primary)" }}>
                  {formatDuration(summary.grand_total_minutes)}
                </p>
              </div>
              <div>
                <p className="text-caption uppercase tracking-wide mb-2" style={{ color: "var(--color-txt-muted)" }}>
                  By project
                </p>
                <ul className="space-y-1 text-body">
                  {(summary.by_project ?? []).map((row) => (
                    <li key={row.project_uuid ?? row.project_name} className="flex justify-between gap-4">
                      <span style={{ color: "var(--color-txt-primary)" }}>{row.project_name}</span>
                      <span className="font-mono" style={{ color: "var(--color-txt-secondary)" }}>
                        {formatDuration(row.duration_minutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-caption uppercase tracking-wide mb-2" style={{ color: "var(--color-txt-muted)" }}>
                  By person
                </p>
                <ul className="space-y-1 text-body">
                  {(summary.by_user ?? []).map((row) => (
                    <li key={row.user_uuid ?? row.user_name} className="flex justify-between gap-4">
                      <span style={{ color: "var(--color-txt-primary)" }}>{row.user_name}</span>
                      <span className="font-mono" style={{ color: "var(--color-txt-secondary)" }}>
                        {formatDuration(row.duration_minutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Entries">
          {!canRead ? (
            <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>
              You do not have permission to view team entries.
            </p>
          ) : loading ? (
            <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>
              Loading…
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[60rem] table-fixed border-collapse text-left text-body">
                  <colgroup>
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th className="py-3 pr-3 align-middle text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                        Project
                      </th>
                      <th className="py-3 pr-3 align-middle text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                        Task
                      </th>
                      <th className="py-3 pr-3 align-middle text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                        Date
                      </th>
                      <th className="py-3 pr-3 align-middle text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                        Duration
                      </th>
                      <th className="py-3 pr-3 align-middle text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                        Person
                      </th>
                      <th className="py-3 pr-0 text-right align-middle text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const mine = isMine(entry);
                      const rd = rowDrafts[entry.uuid] ?? initRowDraft(entry);
                      const editMode = mine && canUpdateOwn;
                      return (
                        <tr key={entry.uuid} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td className="min-w-0 py-3 pr-3 align-middle" style={{ color: "var(--color-txt-secondary)" }}>
                            <span className="line-clamp-2">{entry.project?.name ?? "—"}</span>
                          </td>
                          <td className="min-w-0 py-3 pr-3 align-middle">
                            {editMode ? (
                              <FieldSelect
                                className="w-full min-w-0 py-1.5 text-body"
                                value={rd.task_uuid}
                                onChange={(e) =>
                                  setRowDrafts((prev) => {
                                    const base = prev[entry.uuid] ?? initRowDraft(entry);
                                    return {
                                      ...prev,
                                      [entry.uuid]: { ...base, task_uuid: e.target.value },
                                    };
                                  })
                                }
                              >
                                {taskOptions.map((t) => (
                                  <option key={t.uuid} value={t.uuid}>
                                    {(t.project?.name ? `${t.project.name} — ` : "") + t.title}
                                  </option>
                                ))}
                              </FieldSelect>
                            ) : (
                              <span className="line-clamp-2 block" style={{ color: "var(--color-txt-primary)" }}>
                                {entry.task?.title ?? "—"}
                              </span>
                            )}
                          </td>
                          <td className="min-w-0 py-3 pr-3 align-middle">
                            {editMode ? (
                              <DatePickerField
                                className="w-full min-w-0"
                                value={rd.worked_date}
                                max={todayIso()}
                                showClear={false}
                                placeholder="Date"
                                onChange={(v) =>
                                  setRowDrafts((prev) => {
                                    const base = prev[entry.uuid] ?? initRowDraft(entry);
                                    return {
                                      ...prev,
                                      [entry.uuid]: { ...base, worked_date: v },
                                    };
                                  })
                                }
                              />
                            ) : (
                              <span className="tabular-nums" style={{ color: "var(--color-txt-primary)" }}>
                                {entry.worked_date ?? "—"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-3 align-middle whitespace-nowrap">
                            {editMode ? (
                              <div className="inline-flex items-center gap-4">
                                <span className="inline-flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-control-themed box-border w-[4.25rem] min-w-[4.25rem] shrink-0 py-2 text-center tabular-nums"
                                    value={rd.hours}
                                    onChange={(e) =>
                                      setRowDrafts((prev) => {
                                        const base = prev[entry.uuid] ?? initRowDraft(entry);
                                        return {
                                          ...prev,
                                          [entry.uuid]: { ...base, hours: e.target.value },
                                        };
                                      })
                                    }
                                  />
                                  <span className="shrink-0 text-caption leading-none" style={{ color: "var(--color-txt-muted)" }}>
                                    h
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    className="form-control-themed box-border w-[4.25rem] min-w-[4.25rem] shrink-0 py-2 text-center tabular-nums"
                                    value={rd.minutes}
                                    onChange={(e) =>
                                      setRowDrafts((prev) => {
                                        const base = prev[entry.uuid] ?? initRowDraft(entry);
                                        return {
                                          ...prev,
                                          [entry.uuid]: { ...base, minutes: e.target.value },
                                        };
                                      })
                                    }
                                  />
                                  <span className="shrink-0 text-caption leading-none" style={{ color: "var(--color-txt-muted)" }}>
                                    m
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <span className="tabular-nums" style={{ color: "var(--color-txt-primary)" }}>
                                {formatDuration(entry.duration_minutes)}
                              </span>
                            )}
                          </td>
                          <td className="min-w-0 py-3 pr-3 align-middle">
                            <PersonCell name={entry.user?.name} photoUrl={entry.user?.photo_url} />
                          </td>
                          <td className="py-3 pr-0 align-middle text-right whitespace-nowrap">
                            {editMode && (
                              <button
                                type="button"
                                className="text-caption font-medium mr-3 disabled:opacity-50"
                                style={{ color: "var(--color-accent-purple)" }}
                                disabled={saving}
                                onClick={() => handleSaveRow(entry)}
                              >
                                Save
                              </button>
                            )}
                            {mine && canDeleteOwn && (
                              <button
                                type="button"
                                className="text-caption font-medium"
                                style={{ color: "var(--color-danger-fg)" }}
                                disabled={saving}
                                onClick={() => setDeleteUuid(entry.uuid)}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {canCreate && (
                <div
                  className="mt-6 pt-4 border-t grid gap-3 md:grid-cols-2 lg:grid-cols-7 lg:items-end"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <p className="text-body-strong md:col-span-2 lg:col-span-7" style={{ color: "var(--color-txt-primary)" }}>
                    Add manual entry
                  </p>
                  <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Project
                    <FieldSelect
                      value={manualEntryProjectUuid}
                      onChange={(e) => {
                        setManualEntryProjectUuid(e.target.value);
                        setDraft((d) => ({ ...d, task_uuid: "" }));
                      }}
                    >
                      <option value="">All projects</option>
                      {timerModalProjects.map((p) => (
                        <option key={p.uuid} value={p.uuid}>
                          {p.name}
                        </option>
                      ))}
                    </FieldSelect>
                  </label>
                  <label className="flex flex-col gap-1 text-caption lg:col-span-2" style={{ color: "var(--color-txt-muted)" }}>
                    Task
                    <FieldSelect className="w-full" value={draft.task_uuid} onChange={(e) => setDraft((d) => ({ ...d, task_uuid: e.target.value }))}>
                      <option value="">Select…</option>
                      {manualEntryTaskOptions.map((t) => (
                        <option key={t.uuid} value={t.uuid}>
                          {(t.project?.name ? `${t.project.name} — ` : "") + t.title}
                        </option>
                      ))}
                    </FieldSelect>
                  </label>
                  <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Date
                    <DatePickerField
                      value={draft.worked_date}
                      max={todayIso()}
                      showClear={false}
                      placeholder="Worked date"
                      onChange={(v) => setDraft((d) => ({ ...d, worked_date: v }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Hours
                    <input
                      type="number"
                      min="0"
                      className="form-control-themed"
                      value={draft.hours}
                      onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Minutes
                    <input
                      type="number"
                      min="0"
                      max="59"
                      className="form-control-themed"
                      value={draft.minutes}
                      onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-primary px-4 py-2 rounded-control font-medium h-fit disabled:opacity-50"
                    disabled={saving}
                    onClick={() => handleCreateManual()}
                  >
                    Add row
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      {canCreate && (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-end p-4 pb-6 md:p-6 md:pb-8">
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              {active ? (
                <div className="group relative h-[4.5rem] w-[4.5rem] shrink-0">
                  <div
                    className="flex h-full w-full flex-col items-center justify-center rounded-full px-1 shadow-[var(--shadow-card-hover)]"
                    style={{
                      backgroundColor: "var(--color-accent-purple)",
                      color: "#FAFAFA",
                      boxShadow: "0 0 0 2px color-mix(in srgb, var(--color-accent-purple) 45%, transparent)",
                    }}
                  >
                    <span className="max-w-[4.5rem] truncate px-0.5 text-center text-[9px] font-medium leading-tight opacity-90">
                      {active.task?.title ?? "—"}
                    </span>
                    <span className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums leading-none tracking-tight">
                      {formatClockHMS(activeSeconds)}
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                    <button
                      type="button"
                      className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-md transition-transform hover:scale-[1.06]"
                      style={{
                        backgroundColor: "var(--color-accent-purple)",
                        color: "#FAFAFA",
                        boxShadow: "0 0 0 1px color-mix(in srgb, white 25%, transparent)",
                      }}
                      aria-label="Stop and save"
                      title="Stop and save"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopTimer();
                      }}
                    >
                      {STOP_REGISTER_ICON}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-card-hover)] transition-transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "var(--color-accent-purple)",
                    color: "#FAFAFA",
                    boxShadow: "0 0 0 2px color-mix(in srgb, var(--color-accent-purple) 45%, transparent)",
                  }}
                  aria-label="Open timer"
                  onClick={() => setTimerModalOpen(true)}
                >
                  {CLOCK_ICON}
                </button>
              )}
            </div>
          </div>

          {timerModalOpen && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
                aria-label="Close"
                disabled={saving}
                onClick={() => setTimerModalOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="timer-modal-title"
                className="relative z-10 w-full max-w-md rounded-[24px] p-6 shadow-2xl"
                style={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card-hover)",
                }}
              >
                <h2
                  id="timer-modal-title"
                  className="text-body-strong font-semibold"
                  style={{ color: "var(--color-txt-primary)" }}
                >
                  Start timer
                </h2>
                <p className="mt-1 text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                  Pick a task. Time runs until you stop; stopping adds an entry to the sheet below.
                </p>

                <div className="mt-5 space-y-4">
                  <label className="flex flex-col gap-1.5 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Filter by project
                    <FieldSelect value={taskListProjectUuid} onChange={(e) => setTaskListProjectUuid(e.target.value)}>
                      <option value="">All projects</option>
                      {timerModalProjects.map((p) => (
                        <option key={p.uuid} value={p.uuid}>
                          {p.name}
                        </option>
                      ))}
                    </FieldSelect>
                  </label>
                  <label className="flex flex-col gap-1.5 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Task
                    <FieldSelect value={timerTaskUuid} onChange={(e) => setTimerTaskUuid(e.target.value)}>
                      <option value="">Select…</option>
                      {taskOptions.map((t) => (
                        <option key={t.uuid} value={t.uuid}>
                          {(t.project?.name ? `${t.project.name} — ` : "") + t.title}
                        </option>
                      ))}
                    </FieldSelect>
                  </label>
                  {taskOptions.length === 0 && (
                    <p className="text-caption leading-relaxed" style={{ color: "var(--color-txt-secondary)" }}>
                      No Kanban tasks where you are assignee.
                    </p>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-4 py-2 rounded-control text-body font-medium disabled:opacity-50"
                    disabled={saving}
                    onClick={() => setTimerModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-control px-4 py-2 font-medium transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-accent-purple)",
                      color: "#FAFAFA",
                    }}
                    disabled={saving || !timerTaskUuid}
                    onClick={() => handleStartTimer()}
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteUuid)}
        title="Delete time entry?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteUuid(null)}
        onConfirm={() => confirmDelete()}
      />
    </PageShell>
  );
}
