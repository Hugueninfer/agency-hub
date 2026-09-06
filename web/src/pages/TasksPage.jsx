import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as projectsApi from "../api/projects";
import * as tasksApi from "../api/tasks";
import * as workspaceApi from "../api/workspace";
import ConfirmDialog from "../components/ConfirmDialog";
import FieldSelect from "../components/FieldSelect";
import ImageLightbox from "../components/ImageLightbox";
import RichTextEditor from "../components/RichTextEditor";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

const BOARD = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "pendency", label: "Pendency" },
  { id: "done", label: "Complete" },
];

/** Column header accent — matches lime / purple design tokens. */
const COLUMN_ACCENT = {
  todo: "var(--color-accent-purple)",
  in_progress: "var(--color-accent-lime-h)",
  pendency: "#F59E0B",
  done: "#22C55E",
};

const FILTER_ANYONE = "";

const FILTER_UNASSIGNED = "__unassigned__";

const STATUS_FILTER_ALL = "all";

/** Sentinel value for Project filter: merged tasks from every project. */
const FILTER_PROJECT_ALL = "__all_projects__";

function sortTasksWithinColumn(a, b, projectUuidSetting) {
  if (projectUuidSetting === FILTER_PROJECT_ALL) {
    const na = a.project?.name ?? "";
    const nb = b.project?.name ?? "";
    const byName = na.localeCompare(nb, undefined, { sensitivity: "base" });
    if (byName !== 0) return byName;
  }
  return (a.position ?? 0) - (b.position ?? 0);
}

/** Same ordering as the Kanban columns (multi-project merge sorts by project name, then position). */
function partitionTasksByColumn(filteredTasks, projectUuidSetting) {
  const m = Object.fromEntries(BOARD.map((c) => [c.id, []]));
  for (const t of filteredTasks) {
    const col = t.board_column;
    if (m[col]) m[col].push(t);
    else if (m.todo) m.todo.push(t);
  }
  for (const c of BOARD) {
    m[c.id].sort((a, b) => sortTasksWithinColumn(a, b, projectUuidSetting));
  }
  return m;
}

/**
 * Backend `move` expects `position` within the destination column for that task's project only.
 * In merged "All projects" view, droppable indices mix projects — convert to project-local index.
 */
function projectScopedDestinationIndex(filteredTasks, result, projectUuidSetting) {
  const { destination, draggableId } = result;
  if (!destination || projectUuidSetting !== FILTER_PROJECT_ALL) return destination.index;

  const moving = filteredTasks.find((t) => t.uuid === draggableId);
  if (!moving?.project?.uuid) return destination.index;

  const others = filteredTasks.filter((t) => t.uuid !== draggableId);
  const cols = partitionTasksByColumn(others, projectUuidSetting);
  const destCol = destination.droppableId;
  const list = [...(cols[destCol] ?? [])];
  list.splice(destination.index, 0, { ...moving, board_column: destCol });
  const sameProject = list.filter((t) => t.project?.uuid === moving.project.uuid);
  const idx = sameProject.findIndex((t) => t.uuid === draggableId);
  return idx >= 0 ? idx : destination.index;
}

/** Mirrors backend reorder logic for optimistic Kanban UI (no snap-back while the request runs). */
function applyDragResult(prevTasks, result, projectUuidSetting) {
  const { destination, draggableId } = result;
  if (!destination) return prevTasks;

  const moving = prevTasks.find((t) => t.uuid === draggableId);
  if (!moving) return prevTasks;

  const columnIds = BOARD.map((c) => c.id);
  const byColumn = Object.fromEntries(columnIds.map((id) => [id, []]));

  for (const t of prevTasks) {
    if (t.uuid === draggableId) continue;
    const col = t.board_column;
    if (byColumn[col]) byColumn[col].push(t);
    else if (byColumn.todo) byColumn.todo.push(t);
  }

  for (const id of columnIds) {
    byColumn[id].sort((a, b) => sortTasksWithinColumn(a, b, projectUuidSetting));
  }

  const destCol = destination.droppableId;
  if (!byColumn[destCol]) return prevTasks;

  const insertAt = Math.max(0, Math.min(destination.index, byColumn[destCol].length));
  byColumn[destCol].splice(insertAt, 0, { ...moving, board_column: destCol });

  const next = [];
  for (const id of columnIds) {
    byColumn[id].forEach((t, i) => {
      next.push({ ...t, board_column: id, position: i });
    });
  }
  return next;
}

function initials(name) {
  if (!name || typeof name !== "string") return "?";
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function TasksPage() {
  const { isAuthenticated, hasPermission } = useAuth();
  const canRead = hasPermission("task.read");
  const canCreate = hasPermission("task.create");
  const canUpdate = hasPermission("task.update");
  const canDelete = hasPermission("task.delete");

  const [projects, setProjects] = useState([]);
  const [projectUuid, setProjectUuid] = useState(FILTER_PROJECT_ALL);
  const [tasks, setTasks] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [activeTask, setActiveTask] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftProjectUuid, setDraftProjectUuid] = useState("");
  const [draftAssignees, setDraftAssignees] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState("");
  const [newComment, setNewComment] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createProjectUuid, setCreateProjectUuid] = useState("");
  const [createAssignees, setCreateAssignees] = useState([]);
  const [createSubtaskLines, setCreateSubtaskLines] = useState([""]);
  const [createImageFile, setCreateImageFile] = useState(null);
  const [createPreviewUrl, setCreatePreviewUrl] = useState(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [taskDeleteConfirmOpen, setTaskDeleteConfirmOpen] = useState(false);
  const [attachmentDeleteUuid, setAttachmentDeleteUuid] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [filterAssignee, setFilterAssignee] = useState(FILTER_ANYONE);
  const [filterStatus, setFilterStatus] = useState(STATUS_FILTER_ALL);

  const filtersAffectBoard = filterAssignee !== FILTER_ANYONE || filterStatus !== STATUS_FILTER_ALL;

  const assigneesFromTasks = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      for (const u of t.assignees ?? []) {
        if (u?.uuid) map.set(u.uuid, u);
      }
    }
    return [...map.values()].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  }, [tasks]);

  const peopleFilterOptions = useMemo(() => {
    const map = new Map();
    for (const u of workspaceUsers) {
      if (u?.uuid) map.set(u.uuid, u);
    }
    for (const u of assigneesFromTasks) {
      if (u?.uuid) map.set(u.uuid, u);
    }
    return [...map.values()].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
    );
  }, [workspaceUsers, assigneesFromTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== STATUS_FILTER_ALL && t.board_column !== filterStatus) return false;
      if (filterAssignee === FILTER_ANYONE) return true;
      const assignees = t.assignees ?? [];
      if (filterAssignee === FILTER_UNASSIGNED) return assignees.length === 0;
      return assignees.some((u) => u.uuid === filterAssignee);
    });
  }, [tasks, filterAssignee, filterStatus]);

  const tasksByColumn = useMemo(
    () => partitionTasksByColumn(filteredTasks, projectUuid),
    [filteredTasks, projectUuid],
  );

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated || !canRead) return;
    const list = await projectsApi.listProjects();
    setProjects(list);
    setProjectUuid((prev) => {
      if (prev === FILTER_PROJECT_ALL) return prev;
      if (prev && list.some((p) => p.uuid === prev)) return prev;
      return FILTER_PROJECT_ALL;
    });
  }, [isAuthenticated, canRead]);

  const loadTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setTasks([]);
      return [];
    }
    if (!projectUuid) {
      setTasks([]);
      return [];
    }
    try {
      if (projectUuid === FILTER_PROJECT_ALL) {
        if (projects.length === 0) {
          setTasks([]);
          return [];
        }
        const lists = await Promise.all(projects.map((p) => tasksApi.listTasks(p.uuid)));
        const merged = lists.flat();
        setTasks(merged);
        return merged;
      }
      const list = await tasksApi.listTasks(projectUuid);
      setTasks(list);
      return list;
    } catch {
      setTasks([]);
      return [];
    }
  }, [isAuthenticated, projectUuid, projects]);

  const loadWorkspaceUsers = useCallback(async () => {
    if (!isAuthenticated || !canRead) {
      setWorkspaceUsers([]);
      return;
    }
    try {
      const u = await workspaceApi.listWorkspaceUsers();
      setWorkspaceUsers(u);
    } catch {
      setWorkspaceUsers([]);
    }
  }, [isAuthenticated, canRead]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!isAuthenticated || !canRead) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await loadProjects();
      } catch (e) {
        if (!cancel) {
          setBanner({
            type: "err",
            text: e instanceof ApiError ? e.message : "Could not load projects.",
          });
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isAuthenticated, canRead, loadProjects]);

  useEffect(() => {
    if (!projectUuid) return;
    if (projectUuid === FILTER_PROJECT_ALL && projects.length === 0) return;
    let cancel = false;
    (async () => {
      try {
        await loadTasks();
        await loadWorkspaceUsers();
      } catch (e) {
        if (!cancel) {
          setBanner({
            type: "err",
            text: e instanceof ApiError ? e.message : "Could not load tasks.",
          });
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [projectUuid, projects.length, loadTasks, loadWorkspaceUsers]);

  useEffect(() => {
    setFilterAssignee(FILTER_ANYONE);
    setFilterStatus(STATUS_FILTER_ALL);
  }, [projectUuid]);

  useEffect(() => {
    if (!activeTask) {
      setTaskDeleteConfirmOpen(false);
      setAttachmentDeleteUuid(null);
      setLightboxIndex(null);
    }
  }, [activeTask]);

  useEffect(() => {
    if (!createImageFile) { setCreatePreviewUrl(null); return; }
    const url = URL.createObjectURL(createImageFile);
    setCreatePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [createImageFile]);

  const refreshAll = useCallback(async () => loadTasks(), [loadTasks]);

  // Board list only carries counts for comments/attachments (see TaskRepository::listForProjectBoard) —
  // the open task modal needs the full relations, which only the detail (show) endpoint loads.
  const refreshActiveTask = useCallback(async (uuid) => {
    const full = await tasksApi.getTask(uuid);
    setActiveTask((current) => (current?.uuid === uuid ? full : current));
    return full;
  }, []);

  const handleUploadAttachment = useCallback(async (file) => {
    if (!file || !activeTask || !isAuthenticated) return;
    setUploadingImage(true);
    try {
      await tasksApi.uploadTaskAttachment(activeTask.uuid, file);
      await Promise.all([refreshActiveTask(activeTask.uuid), refreshAll()]);
      setBanner({ type: "ok", text: "Image uploaded." });
    } catch (err) {
      setBanner({
        type: "err",
        text: err instanceof ApiError ? err.message : "Upload failed.",
      });
    } finally {
      setUploadingImage(false);
    }
  }, [activeTask, isAuthenticated, refreshAll, refreshActiveTask]);

  /** Reload board for one project or merged all-projects view (e.g. after moving a task). */
  const reloadTasksForProject = useCallback(
    async (uuid) => {
      if (uuid === FILTER_PROJECT_ALL) {
        if (projects.length === 0) return [];
        const lists = await Promise.all(projects.map((p) => tasksApi.listTasks(p.uuid)));
        const merged = lists.flat();
        setTasks(merged);
        return merged;
      }
      if (!uuid) return [];
      const list = await tasksApi.listTasks(uuid);
      setTasks(list);
      return list;
    },
    [projects],
  );

  const onDragEnd = async (result) => {
    if (!canUpdate || !isAuthenticated) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const previousTasks = tasks;
    setTasks((prev) => applyDragResult(prev, result, projectUuid));

    const position = projectScopedDestinationIndex(filteredTasks, result, projectUuid);

    try {
      await tasksApi.moveTask(draggableId, {
        board_column: destination.droppableId,
        position,
      });
      await refreshAll();
    } catch (e) {
      setTasks(previousTasks);
      setBanner({
        type: "err",
        text: e instanceof ApiError ? e.message : "Could not move task.",
      });
    }
  };

  const openTask = (t) => {
    setActiveTask(t);
    setDraftTitle(t.title ?? "");
    setDraftDescription(t.description ?? "");
    setDraftProjectUuid(
      t.project?.uuid ?? (projectUuid !== FILTER_PROJECT_ALL ? projectUuid : ""),
    );
    setDraftAssignees((t.assignees ?? []).map((u) => u.uuid));
    setNewComment("");
    // Board card only has counts for comments/attachments — fetch the full task
    // (with images/comments) so the modal doesn't show them as empty.
    refreshActiveTask(t.uuid).catch(() => {});
  };

  const saveTaskDetails = async () => {
    if (!isAuthenticated || !activeTask) return;
    if (!draftProjectUuid) {
      setBanner({ type: "err", text: "Choose a project for this task." });
      return;
    }
    setSavingTask(true);
    try {
      const payload = {
        title: draftTitle,
        description: draftDescription || null,
        assignee_uuids: draftAssignees,
      };
      const previousProjectUuid = activeTask.project?.uuid ?? "";
      if (draftProjectUuid !== previousProjectUuid) {
        payload.project_uuid = draftProjectUuid;
      }
      await tasksApi.updateTask(activeTask.uuid, payload);
      setBanner({ type: "ok", text: "Task updated." });
      const boardUuid = payload.project_uuid ?? projectUuid;
      if (payload.project_uuid) {
        setProjectUuid(payload.project_uuid);
      }
      await Promise.all([reloadTasksForProject(boardUuid), refreshActiveTask(activeTask.uuid)]);
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof ApiError ? e.message : "Could not save task.",
      });
    } finally {
      setSavingTask(false);
    }
  };

  const resetCreateForm = useCallback(() => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateProjectUuid("");
    setCreateAssignees([]);
    setCreateSubtaskLines([""]);
    setCreateImageFile(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetCreateForm();
    const initial =
      projectUuid && projectUuid !== FILTER_PROJECT_ALL ? projectUuid : projects[0]?.uuid ?? "";
    setCreateProjectUuid(initial);
    setCreateModalOpen(true);
  }, [resetCreateForm, projectUuid, projects]);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    resetCreateForm();
  }, [resetCreateForm]);

  const toggleCreateAssignee = (uuid) => {
    setCreateAssignees((prev) =>
      prev.includes(uuid) ? prev.filter((x) => x !== uuid) : [...prev, uuid],
    );
  };

  const submitCreateTask = async () => {
    const title = createTitle.trim();
    const targetProjectUuid =
      createProjectUuid ||
      (projectUuid !== FILTER_PROJECT_ALL ? projectUuid : "") ||
      projects[0]?.uuid ||
      "";
    if (!isAuthenticated || !targetProjectUuid || !canCreate) return;
    if (!title) {
      setBanner({ type: "err", text: "Please enter a title." });
      return;
    }
    setSavingCreate(true);
    try {
      const task = await tasksApi.createTask(targetProjectUuid, {
        title,
        description: createDescription.trim() || null,
        board_column: "todo",
        ...(createAssignees.length > 0 ? { assignee_uuids: createAssignees } : {}),
      });
      const taskUuid = task?.uuid;
      if (!taskUuid) {
        throw new Error("Invalid response when creating task.");
      }
      const subTitles = createSubtaskLines.map((s) => s.trim()).filter(Boolean);
      for (const st of subTitles) {
        await tasksApi.createSubtask(taskUuid, { title: st });
      }
      if (createImageFile) {
        await tasksApi.uploadTaskAttachment(taskUuid, createImageFile);
      }
      setCreateModalOpen(false);
      resetCreateForm();
      setBanner({ type: "ok", text: "Task created." });
      if (projectUuid === FILTER_PROJECT_ALL) {
        await reloadTasksForProject(FILTER_PROJECT_ALL);
      } else {
        if (targetProjectUuid !== projectUuid) {
          setProjectUuid(targetProjectUuid);
        }
        await reloadTasksForProject(targetProjectUuid);
      }
      // Avoid opening the task-detail dialog: same full-screen shell feels like the create modal reopened.
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof ApiError ? e.message : "Could not create task.",
      });
    } finally {
      setSavingCreate(false);
    }
  };

  const toggleAssignee = (uuid) => {
    setDraftAssignees((prev) =>
      prev.includes(uuid) ? prev.filter((x) => x !== uuid) : [...prev, uuid],
    );
  };

  async function addDetailSubtask() {
    const title = newSubtask.trim();
    if (!isAuthenticated || !activeTask || !title) return;
    try {
      await tasksApi.createSubtask(activeTask.uuid, {
        title,
        ...(newSubtaskAssignee ? { assignee_uuid: newSubtaskAssignee } : {}),
      });
      setNewSubtask("");
      setNewSubtaskAssignee("");
      await Promise.all([refreshActiveTask(activeTask.uuid), refreshAll()]);
    } catch (err) {
      setBanner({
        type: "err",
        text: err instanceof ApiError ? err.message : "Could not add subtask.",
      });
    }
  }

  async function confirmDeleteActiveTask() {
    if (!isAuthenticated || !activeTask) return;
    try {
      await tasksApi.deleteTask(activeTask.uuid);
      setActiveTask(null);
      setBanner({ type: "ok", text: "Task deleted." });
      await refreshAll();
    } catch (err) {
      setBanner({
        type: "err",
        text: err instanceof ApiError ? err.message : "Delete failed.",
      });
      throw err;
    }
  }

  async function confirmRemoveAttachment() {
    const attUuid = attachmentDeleteUuid;
    if (!isAuthenticated || !activeTask || !attUuid) return;
    try {
      await tasksApi.deleteTaskAttachment(activeTask.uuid, attUuid);
      await Promise.all([refreshActiveTask(activeTask.uuid), refreshAll()]);
    } catch (err) {
      setBanner({
        type: "err",
        text: err instanceof ApiError ? err.message : "Could not remove image.",
      });
      throw err;
    }
  }

  const taskCounts = useMemo(() => tasks.length, [tasks]);
  const filteredCount = filteredTasks.length;
  const mergeBoardView = projectUuid === FILTER_PROJECT_ALL;

  if (!canRead) {
    return null;
  }

  return (
    <>
    <PageShell>
      <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />

      {loading ? (
        <Panel>
          <div className="h-48 animate-pulse rounded-2xl" style={{ backgroundColor: "var(--color-surface-muted)" }} />
        </Panel>
      ) : projects.length === 0 ? (
        <Panel>
          <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>
            Create a project first — tasks belong to a project.
          </p>
        </Panel>
      ) : (
        <>
          <Panel className="!rounded-[28px] !p-5 md:!px-8 md:!py-8">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-5" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                  Filters
                </h2>
                <p className="mt-1 max-w-xl text-caption" style={{ color: "var(--color-txt-muted)" }}>
                  Narrow by project, people, and status. Clear filters anytime to restore the full board.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary shrink-0 rounded-control px-4 py-2 text-caption font-medium"
                disabled={!filtersAffectBoard}
                onClick={() => {
                  setFilterAssignee(FILTER_ANYONE);
                  setFilterStatus(STATUS_FILTER_ALL);
                }}
              >
                Clear filters
              </button>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <label className="block min-w-0 space-y-2">
                <span className="text-label font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Project
                </span>
                <FieldSelect value={projectUuid} onChange={(e) => setProjectUuid(e.target.value)}>
                  <option value={FILTER_PROJECT_ALL}>All projects</option>
                  {projects.map((p) => (
                    <option key={p.uuid} value={p.uuid}>
                      {p.name}
                    </option>
                  ))}
                </FieldSelect>
              </label>
              <label className="block min-w-0 space-y-2">
                <span className="text-label font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  People
                </span>
                <FieldSelect value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                  <option value={FILTER_ANYONE}>Anyone</option>
                  <option value={FILTER_UNASSIGNED}>Unassigned</option>
                  {peopleFilterOptions.map((u) => (
                    <option key={u.uuid} value={u.uuid}>
                      {u.name}
                    </option>
                  ))}
                </FieldSelect>
              </label>
              <label className="block min-w-0 space-y-2">
                <span className="text-label font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Status
                </span>
                <FieldSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value={STATUS_FILTER_ALL}>All columns</option>
                  {BOARD.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </FieldSelect>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:justify-end">
                {canCreate ? (
                  <button
                    type="button"
                    className="btn-primary shrink-0 rounded-control px-6 py-3 text-body-strong shadow-card"
                    onClick={openCreateModal}
                  >
                    Add card
                  </button>
                ) : (
                  <div className="hidden lg:block" aria-hidden />
                )}
              </div>
            </div>
          </Panel>

          {!canUpdate ? (
            <p className="text-caption px-1" style={{ color: "var(--color-txt-muted)" }}>
              You don&apos;t have permission to edit tasks — drag and drop is disabled.
            </p>
          ) : null}
          {canUpdate && filtersAffectBoard ? (
            <p className="text-caption px-1" style={{ color: "var(--color-txt-muted)" }}>
              Filters are active — drag and drop is paused until you clear them (order must match the full board).
            </p>
          ) : null}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="w-full overflow-x-auto overscroll-x-contain pb-6">
              <div className="mx-auto flex w-max max-w-none gap-5 px-1 md:gap-6">
              {BOARD.map((col) => (
                <div key={col.id} className="flex w-[min(100vw-2rem,320px)] shrink-0 flex-col gap-4 sm:w-[300px] md:w-[320px]">
                  <div
                    className="flex items-center gap-3 rounded-card border px-4 py-3.5 shadow-card"
                    style={{
                      backgroundColor: "var(--color-card)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <span
                      className="h-10 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLUMN_ACCENT[col.id] ?? "var(--color-accent-purple)" }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-label font-semibold uppercase tracking-wide" style={{ color: "var(--color-txt-primary)" }}>
                        {col.label}
                      </div>
                      <div className="mt-0.5 text-caption tabular-nums" style={{ color: "var(--color-txt-muted)" }}>
                        {tasksByColumn[col.id].length}{" "}
                        {tasksByColumn[col.id].length === 1 ? "card" : "cards"}
                      </div>
                    </div>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex min-h-[168px] flex-col gap-3 rounded-card-lg border p-3 md:min-h-[200px] md:p-3.5"
                        style={{
                          backgroundColor: snapshot.isDraggingOver ? "rgba(139,92,246,0.07)" : "var(--color-surface-muted)",
                          borderColor: snapshot.isDraggingOver ? "rgba(139,92,246,0.35)" : "var(--color-border)",
                          borderStyle: snapshot.isDraggingOver ? "solid" : "dashed",
                          boxShadow: snapshot.isDraggingOver ? "var(--shadow-card)" : "none",
                        }}
                      >
                        {tasksByColumn[col.id].map((task, index) => (
                          <Draggable
                            key={task.uuid}
                            draggableId={task.uuid}
                            index={index}
                            isDragDisabled={!canUpdate || filtersAffectBoard}
                          >
                            {(dragProvided, dragSnapshot) => {
                              const { style: dragStyle, ...draggableWithoutStyle } = dragProvided.draggableProps;
                              return (
                              <div
                                ref={dragProvided.innerRef}
                                {...draggableWithoutStyle}
                                {...dragProvided.dragHandleProps}
                                role="button"
                                tabIndex={0}
                                className="relative w-full min-h-[100px] cursor-grab touch-manipulation rounded-card border text-left outline-none transition-shadow active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent-purple)] md:min-h-[112px]"
                                style={{
                                  ...dragStyle,
                                  backgroundColor: "var(--color-card)",
                                  boxShadow: dragSnapshot.isDragging ? "var(--shadow-card-hover)" : "var(--shadow-card)",
                                  borderColor: "var(--color-border)",
                                  opacity: dragSnapshot.isDragging ? 0.92 : 1,
                                  padding: "1rem 1.125rem 1.25rem",
                                }}
                                onClick={() => openTask(task)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openTask(task);
                                  }
                                }}
                              >
                                <div className="pointer-events-none flex items-start justify-between gap-2">
                                  <p
                                    className="min-w-0 flex-1 text-[14px] font-semibold leading-snug"
                                    style={{ color: "var(--color-txt-primary)" }}
                                  >
                                    {task.title}
                                  </p>
                                  {task.project?.name ? (
                                    <span
                                      className="inline-flex max-w-[45%] shrink-0 items-center truncate rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                                      style={{
                                        borderColor: "rgba(139, 92, 246, 0.35)",
                                        backgroundColor: "var(--color-accent-purple-soft)",
                                        color: "var(--color-accent-purple)",
                                      }}
                                      title={task.project.name}
                                    >
                                      {task.project.name}
                                    </span>
                                  ) : null}
                                </div>
                                {task.source === "fathom" ? (
                                  <div className="pointer-events-none mt-2 flex items-center gap-1.5">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-txt-muted)", flexShrink: 0 }}>
                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                      <line x1="12" y1="19" x2="12" y2="22" />
                                    </svg>
                                    <span
                                      className="text-[11px] font-medium"
                                      style={{ color: "var(--color-txt-muted)" }}
                                      title={task.source_metadata?.meeting_title ? `Reunião: ${task.source_metadata.meeting_title}` : "Criado via Fathom"}
                                    >
                                      via Fathom
                                      {task.source_metadata?.meeting_date ? ` · ${task.source_metadata.meeting_date}` : ""}
                                    </span>
                                  </div>
                                ) : null}
                                {task.description ? (
                                  <p
                                    className="pointer-events-none mt-2 line-clamp-3 text-body leading-relaxed"
                                    style={{ color: "var(--color-txt-secondary)" }}
                                  >
                                    {stripHtml(task.description)}
                                  </p>
                                ) : null}
                                {(task.assignees ?? []).length > 0 ? (
                                  <div className="pointer-events-none mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      {(task.assignees ?? []).slice(0, 4).map((u) => (
                                        u.photo_url ? (
                                          <img
                                            key={u.uuid}
                                            src={u.photo_url}
                                            alt={u.name}
                                            title={u.name}
                                            className="h-7 w-7 rounded-full object-cover border"
                                            style={{ borderColor: "var(--color-border)" }}
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none";
                                            }}
                                          />
                                        ) : (
                                          <span
                                            key={u.uuid}
                                            className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-2 text-caption font-semibold"
                                            style={{
                                              backgroundColor: "var(--color-accent-purple-soft)",
                                              color: "var(--color-accent-purple)",
                                            }}
                                            title={u.name}
                                          >
                                            {initials(u.name)}
                                          </span>
                                        )
                                      ))}
                                    </div>
                                    {(() => {
                                      // Board cards receive counts (comments_count/attachments_count);
                                      // fall back to array length when the full task is loaded.
                                      const commentCount = task.comments_count ?? (task.comments ?? []).length;
                                      const attachmentCount = task.attachments_count ?? (task.attachments ?? []).length;
                                      return commentCount > 0 || attachmentCount > 0 ? (
                                      <div
                                        className="flex shrink-0 items-center gap-2 text-caption"
                                        style={{ color: "var(--color-txt-muted)" }}
                                      >
                                        {commentCount > 0 ? (
                                          <span className="inline-flex items-center gap-1" title={`${commentCount} comments`}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                            <span className="tabular-nums">{commentCount}</span>
                                          </span>
                                        ) : null}
                                        {attachmentCount > 0 ? (
                                          <span className="inline-flex items-center gap-1" title={`${attachmentCount} images`}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                              <circle cx="8.5" cy="8.5" r="1.5" />
                                              <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <span className="tabular-nums">{attachmentCount}</span>
                                          </span>
                                        ) : null}
                                      </div>
                                      ) : null;
                                    })()}
                                  </div>
                                ) : null}
                              </div>
                              );
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
              </div>
            </div>
          </DragDropContext>

          <p className="text-center text-caption" style={{ color: "var(--color-txt-muted)" }}>
            {filtersAffectBoard ? (
              <>
                Showing{" "}
                <span className="font-medium tabular-nums" style={{ color: "var(--color-txt-secondary)" }}>
                  {filteredCount}
                </span>{" "}
                of{" "}
                <span className="font-medium tabular-nums" style={{ color: "var(--color-txt-secondary)" }}>
                  {taskCounts}
                </span>{" "}
                tasks
                {mergeBoardView ? " (all projects)" : " in this project"}
                {" "}
                (filters applied).
              </>
            ) : mergeBoardView ? (
              <>
                <span className="font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  {taskCounts} {taskCounts === 1 ? "task" : "tasks"}
                </span>{" "}
                across all projects.
              </>
            ) : (
              <>
                <span className="font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  {taskCounts} {taskCounts === 1 ? "task" : "tasks"}
                </span>{" "}
                in this project.
              </>
            )}
          </p>
        </>
      )}
    </PageShell>

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onClick={closeCreateModal}
          role="presentation"
        >
          <div
            className="scrollbar-themed max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] p-6 md:p-8"
            style={{
              backgroundColor: "var(--color-card)",
              boxShadow: "var(--shadow-card)",
              border: "1px solid rgba(17,17,17,0.06)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-task-dialog-title"
          >
            <h2
              id="create-task-dialog-title"
              className="text-title-md font-semibold"
              style={{ color: "var(--color-txt-primary)" }}
            >
              New card
            </h2>
            <p className="text-caption mt-1" style={{ color: "var(--color-txt-muted)" }}>
              The card is created in <strong>To do</strong>. Add a title, description, subtasks, and an optional image.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Project
                </span>
                <FieldSelect
                  value={createProjectUuid}
                  onChange={(e) => setCreateProjectUuid(e.target.value)}
                  disabled={projects.length === 0}
                >
                  {projects.length === 0 ? (
                    <option value="">No projects</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.uuid} value={p.uuid}>
                        {p.name}
                      </option>
                    ))
                  )}
                </FieldSelect>
              </label>
              <label className="block space-y-1">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Title <span style={{ color: "var(--color-txt-muted)" }}>(required)</span>
                </span>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-txt-primary)",
                  }}
                  autoFocus
                  placeholder="e.g. Quarterly report review"
                />
              </label>
              <div className="space-y-1">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Description
                </span>
                <RichTextEditor
                  key={createModalOpen ? "create-open" : "create-closed"}
                  value={createDescription}
                  onChange={setCreateDescription}
                />
              </div>

              {workspaceUsers.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Assignees
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {workspaceUsers.map((u) => (
                      <button
                        key={u.uuid}
                        type="button"
                        onClick={() => toggleCreateAssignee(u.uuid)}
                        className="rounded-full px-3 py-1.5 text-caption font-medium"
                        style={{
                          backgroundColor: createAssignees.includes(u.uuid)
                            ? "var(--color-accent-purple-soft)"
                            : "var(--color-surface-muted)",
                          color: "var(--color-txt-primary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Subtasks
                </span>
                <div className="space-y-2">
                  {createSubtaskLines.map((line, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={line}
                        onChange={(e) =>
                          setCreateSubtaskLines((prev) =>
                            prev.map((s, i) => (i === index ? e.target.value : s)),
                          )
                        }
                        className="flex-1 min-w-0 rounded-xl px-3 py-2 text-body outline-none"
                        style={{
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-txt-primary)",
                        }}
                        placeholder={`Subtask ${index + 1}`}
                      />
                      {createSubtaskLines.length > 1 ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-xl px-3 py-2 text-caption"
                          style={{ border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
                          onClick={() =>
                            setCreateSubtaskLines((prev) =>
                              prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
                            )
                          }
                          aria-label="Remove row"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-caption font-medium"
                  style={{ color: "var(--color-accent-purple)" }}
                  onClick={() => setCreateSubtaskLines((prev) => [...prev, ""])}
                >
                  + Add subtask
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Image
                </span>
                {createPreviewUrl ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={createPreviewUrl}
                      alt="Preview"
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      style={{ border: "1px solid var(--color-border)" }}
                    />
                    <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                      <p className="truncate text-caption font-medium" style={{ color: "var(--color-txt-primary)" }}>
                        {createImageFile?.name}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--color-txt-muted)" }}>
                        {createImageFile ? `${(createImageFile.size / 1024).toFixed(0)} KB` : ""}
                      </p>
                      <button
                        type="button"
                        className="text-caption"
                        style={{ color: "var(--color-txt-muted)" }}
                        onClick={() => setCreateImageFile(null)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className="flex cursor-pointer flex-col gap-1.5 rounded-xl px-3 py-3 text-caption"
                    style={{
                      backgroundColor: "var(--color-surface-muted)",
                      border: "1px dashed var(--color-border)",
                      color: "var(--color-txt-secondary)",
                    }}
                  >
                    <span className="font-medium">Choose an image file…</span>
                    <span className="text-[11px]" style={{ color: "var(--color-txt-muted)" }}>max 5 MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setCreateImageFile(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingCreate}
                  className="rounded-xl px-4 py-2.5 text-body font-medium disabled:opacity-60"
                  style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                  onClick={submitCreateTask}
                >
                  {savingCreate ? "Creating…" : "Create card"}
                </button>
                <button
                  type="button"
                  disabled={savingCreate}
                  className="rounded-xl px-4 py-2.5 text-body font-medium"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
                  onClick={closeCreateModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Task detail sidebar backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: activeTask ? 1 : 0,
          pointerEvents: activeTask ? "auto" : "none",
        }}
        onClick={() => setActiveTask(null)}
      />

      {/* Task detail sidebar panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-sidebar-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col transition-transform duration-300 ease-out sm:max-w-[520px]"
        style={{
          backgroundColor: "var(--color-card)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.14)",
          transform: activeTask ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2
            id="task-sidebar-title"
            className="min-w-0 flex-1 truncate text-title-md font-semibold pr-3"
            style={{ color: "var(--color-txt-primary)" }}
          >
            {activeTask?.title ?? "Task"}
          </h2>
          <button
            type="button"
            onClick={() => setActiveTask(null)}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-[var(--color-surface-muted)]"
            style={{ color: "var(--color-txt-secondary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        {activeTask && (
          <div className="scrollbar-themed flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Title
                </span>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-txt-primary)",
                  }}
                />
              </label>

              {projects.length > 0 && canUpdate ? (
                <label className="block space-y-1">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Project
                  </span>
                  <FieldSelect value={draftProjectUuid} onChange={(e) => setDraftProjectUuid(e.target.value)}>
                    <option value="">Select…</option>
                    {projects.map((p) => (
                      <option key={p.uuid} value={p.uuid}>{p.name}</option>
                    ))}
                  </FieldSelect>
                </label>
              ) : activeTask?.project?.name ? (
                <p className="text-caption rounded-xl px-1 py-1" style={{ color: "var(--color-txt-secondary)" }}>
                  Project:{" "}
                  <span className="font-medium" style={{ color: "var(--color-txt-primary)" }}>
                    {activeTask.project.name}
                  </span>
                </p>
              ) : null}

              {activeTask.source === "fathom" ? (
                <div
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-txt-muted)", flexShrink: 0, marginTop: 2 }}>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                      Criado via Fathom
                    </p>
                    {activeTask.source_metadata?.meeting_title ? (
                      <p className="text-caption" style={{ color: "var(--color-txt-muted)" }}>
                        {activeTask.source_metadata.meeting_title}
                        {activeTask.source_metadata.meeting_date ? ` · ${activeTask.source_metadata.meeting_date}` : ""}
                      </p>
                    ) : null}
                    {(activeTask.source_metadata?.attendees ?? []).length > 0 ? (
                      <p className="text-caption" style={{ color: "var(--color-txt-muted)" }}>
                        {activeTask.source_metadata.attendees.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Description
                </span>
                <RichTextEditor
                  key={activeTask.uuid}
                  value={draftDescription}
                  onChange={setDraftDescription}
                  readOnly={!canUpdate}
                />
              </div>

              {canUpdate && workspaceUsers.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Assignees
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {workspaceUsers.map((u) => (
                      <button
                        key={u.uuid}
                        type="button"
                        onClick={() => toggleAssignee(u.uuid)}
                        className="rounded-full px-3 py-1.5 text-caption font-medium"
                        style={{
                          backgroundColor: draftAssignees.includes(u.uuid)
                            ? "var(--color-accent-purple-soft)"
                            : "var(--color-surface-muted)",
                          color: "var(--color-txt-primary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {canUpdate ? (
                <div className="space-y-3">
                  <span className="text-caption font-semibold tracking-wide" style={{ color: "var(--color-txt-secondary)" }}>
                    Subtasks
                  </span>
                  <div
                    className="rounded-2xl p-2"
                    style={{
                      backgroundColor: "var(--color-surface-muted)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <ul className="space-y-1.5">
                      {(activeTask.subtasks ?? []).length === 0 ? (
                        <li className="rounded-xl px-3 py-4 text-center text-caption" style={{ color: "var(--color-txt-muted)" }}>
                          No subtasks yet — add one below.
                        </li>
                      ) : (
                        (activeTask.subtasks ?? []).map((s) => (
                          <li key={s.uuid}>
                            <div
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                              style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}
                            >
                              <input
                                type="checkbox"
                                checked={!!s.is_done}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                                style={{ borderColor: "var(--color-border-strong)", accentColor: "var(--color-accent-purple)" }}
                                onChange={async (e) => {
                                  try {
                                    await tasksApi.updateSubtask(activeTask.uuid, s.uuid, { is_done: e.target.checked });
                                    await Promise.all([refreshActiveTask(activeTask.uuid), refreshAll()]);
                                  } catch (err) {
                                    setBanner({ type: "err", text: err instanceof ApiError ? err.message : "Update failed." });
                                  }
                                }}
                                aria-label={`Mark "${s.title}" complete`}
                              />
                              <span
                                className="min-w-0 flex-1 text-body leading-snug"
                                style={{
                                  color: "var(--color-txt-primary)",
                                  textDecoration: s.is_done ? "line-through" : undefined,
                                  opacity: s.is_done ? 0.72 : 1,
                                }}
                              >
                                {s.title}
                              </span>
                              {workspaceUsers.length > 0 && (
                                <select
                                  value={s.assignee?.uuid ?? ""}
                                  onChange={async (e) => {
                                    try {
                                      await tasksApi.updateSubtask(activeTask.uuid, s.uuid, {
                                        assignee_uuid: e.target.value || null,
                                      });
                                      await Promise.all([refreshActiveTask(activeTask.uuid), refreshAll()]);
                                    } catch (err) {
                                      setBanner({ type: "err", text: err instanceof ApiError ? err.message : "Update failed." });
                                    }
                                  }}
                                  className="shrink-0 rounded-lg px-1.5 py-1 text-[12px] outline-none"
                                  style={{
                                    backgroundColor: s.assignee ? "var(--color-accent-purple-soft)" : "var(--color-surface-muted)",
                                    color: s.assignee ? "var(--color-accent-purple)" : "var(--color-txt-muted)",
                                    border: "1px solid var(--color-border)",
                                    maxWidth: "110px",
                                  }}
                                  aria-label="Subtask assignee"
                                >
                                  <option value="">— none</option>
                                  {workspaceUsers.map((u) => (
                                    <option key={u.uuid} value={u.uuid}>{u.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New subtask"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        className="min-h-[44px] flex-1 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-body outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--color-txt-muted)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-purple)] focus:ring-2 focus:ring-[var(--color-accent-purple)]/25"
                        style={{ color: "var(--color-txt-primary)" }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          void addDetailSubtask();
                        }}
                      />
                      <button type="button" className="btn-secondary shrink-0 justify-center px-5 py-2.5 text-body font-medium" onClick={() => void addDetailSubtask()}>
                        Add
                      </button>
                    </div>
                    {workspaceUsers.length > 0 && (
                      <select
                        value={newSubtaskAssignee}
                        onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                        className="rounded-lg px-2 py-1.5 text-[12px] outline-none self-start"
                        style={{
                          backgroundColor: newSubtaskAssignee ? "var(--color-accent-purple-soft)" : "var(--color-surface-muted)",
                          color: newSubtaskAssignee ? "var(--color-accent-purple)" : "var(--color-txt-muted)",
                          border: "1px solid var(--color-border)",
                        }}
                        aria-label="Assign new subtask to"
                      >
                        <option value="">Assign to (optional)</option>
                        {workspaceUsers.map((u) => (
                          <option key={u.uuid} value={u.uuid}>{u.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ) : null}

              {canUpdate ? (
                <div className="space-y-2">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Comments
                  </span>
                  <div className="scrollbar-themed max-h-40 space-y-2 overflow-y-auto">
                    {(activeTask.comments ?? []).map((c) => (
                      <div key={c.uuid} className="rounded-xl p-3 text-body" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-txt-primary)" }}>
                        <p className="mb-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>{c.user?.name ?? "User"}</p>
                        {c.body}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <textarea
                      rows={2}
                      placeholder="Write a comment…"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[72px] flex-1 resize-none rounded-xl px-3 py-2.5 text-caption outline-none transition-[border-color,box-shadow] focus:border-[var(--color-accent-purple)] focus:ring-2 focus:ring-[var(--color-accent-purple)]/25"
                      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-control px-4 py-2.5 text-body font-medium"
                      style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                      onClick={async () => {
                        const body = newComment.trim();
                        if (!body) return;
                        try {
                          await tasksApi.addComment(activeTask.uuid, { body });
                          setNewComment("");
                          await Promise.all([refreshActiveTask(activeTask.uuid), refreshAll()]);
                        } catch (err) {
                          setBanner({ type: "err", text: err instanceof ApiError ? err.message : "Could not comment." });
                        }
                      }}
                    >
                      Post
                    </button>
                  </div>
                </div>
              ) : null}

              {canUpdate ? (
                <div className="space-y-3">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Images{" "}
                    {(activeTask.attachments ?? []).length > 0 && (
                      <span className="tabular-nums" style={{ color: "var(--color-txt-muted)" }}>
                        ({(activeTask.attachments ?? []).length})
                      </span>
                    )}
                  </span>

                  {(activeTask.attachments ?? []).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {(activeTask.attachments ?? []).map((a, idx) => (
                        <div key={a.uuid} className="group relative aspect-square">
                          <button
                            type="button"
                            className="h-full w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-purple)]"
                            style={{ border: "1px solid var(--color-border)" }}
                            onClick={() => setLightboxIndex(idx)}
                            aria-label={`View ${a.original_name}`}
                          >
                            <img
                              src={a.url}
                              alt={a.original_name}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          </button>
                          <button
                            type="button"
                            className="btn-delete-soft-icon absolute -right-1 -top-1 z-10 opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label={`Remove ${a.original_name}`}
                            onClick={() => setAttachmentDeleteUuid(a.uuid)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label
                    className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-3 py-4 text-center text-caption transition-colors"
                    style={{
                      backgroundColor: isDraggingOver ? "var(--color-accent-purple-soft)" : "var(--color-surface-muted)",
                      border: `2px dashed ${isDraggingOver ? "var(--color-accent-purple)" : "var(--color-border)"}`,
                      color: isDraggingOver ? "var(--color-accent-purple)" : "var(--color-txt-secondary)",
                    }}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
                      for (const file of files) {
                        await handleUploadAttachment(file);
                      }
                    }}
                  >
                    {uploadingImage ? (
                      <span className="font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                        Uploading…
                      </span>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span className="font-medium">
                          {isDraggingOver ? "Drop to upload" : "Drop images or click to select"}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--color-txt-muted)" }}>
                          Multiple files supported · max 5 MB each
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        for (const file of files) {
                          await handleUploadAttachment(file);
                        }
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Sidebar footer actions */}
        {activeTask && (
          <div
            className="flex shrink-0 flex-wrap gap-2 border-t px-5 py-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            {canUpdate ? (
              <button
                type="button"
                disabled={savingTask}
                className="rounded-xl px-4 py-2.5 text-body font-medium disabled:opacity-60"
                style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                onClick={saveTaskDetails}
              >
                {savingTask ? "Saving…" : "Save changes"}
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" className="btn-delete-soft rounded-xl px-4 py-2.5" onClick={() => setTaskDeleteConfirmOpen(true)}>
                Delete
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-xl px-4 py-2.5 text-body font-medium"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
              onClick={() => setActiveTask(null)}
            >
              Close
            </button>
          </div>
        )}
      </aside>

      {lightboxIndex !== null && (activeTask?.attachments ?? []).length > 0 && (
        <ImageLightbox
          images={activeTask.attachments}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      <ConfirmDialog
        open={taskDeleteConfirmOpen}
        onClose={() => setTaskDeleteConfirmOpen(false)}
        title="Delete this task?"
        description="This removes the card along with subtasks, comments, and images for this task. You cannot undo this."
        confirmLabel="Delete task"
        pendingLabel="Deleting…"
        zIndexClass="z-[60]"
        onConfirm={confirmDeleteActiveTask}
      />

      <ConfirmDialog
        open={!!attachmentDeleteUuid}
        onClose={() => setAttachmentDeleteUuid(null)}
        title="Remove this image?"
        description="It will disappear from this task. You can upload another file later."
        confirmLabel="Remove image"
        pendingLabel="Removing…"
        zIndexClass="z-[60]"
        onConfirm={confirmRemoveAttachment}
      />
    </>
  );
}
