import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as projectsApi from "../api/projects";
import ConfirmDialog from "../components/ConfirmDialog";
import FieldSelect from "../components/FieldSelect";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

/** Status pill — purple / neutral accents per design.json */
function StatusPill({ status }) {
  const archived = status === "archived";
  return (
    <span
      className="inline-flex rounded-full px-3 py-1 text-caption font-medium capitalize"
      style={{
        backgroundColor: archived ? "var(--color-surface-muted)" : "var(--color-accent-purple-soft)",
        color: archived ? "var(--color-txt-secondary)" : "var(--color-accent-purple)",
        border: `1px solid ${archived ? "var(--color-border)" : "rgba(139, 92, 246, 0.2)"}`,
      }}
    >
      {status}
    </span>
  );
}

export default function ProjectsPage() {
  const { isAuthenticated, hasPermission } = useAuth();

  const canRead = hasPermission("project.read");
  const canCreate = hasPermission("project.create");
  const canUpdate = hasPermission("project.update");
  const canDelete = hasPermission("project.delete");

  const showList = canRead;
  const showCreate = canCreate;
  const showWorkspace = showList || showCreate;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingUuid, setEditingUuid] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteProjectUuid, setDeleteProjectUuid] = useState(null);

  const counts = useMemo(() => {
    let active = 0;
    let archived = 0;
    for (const p of projects) {
      if (p.status === "archived") archived += 1;
      else active += 1;
    }
    return { active, archived, total: projects.length };
  }, [projects]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !canRead) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const list = await projectsApi.listProjects();
      setProjects(list);
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not load projects.",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, canRead]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!isAuthenticated || !canCreate || !name.trim()) return;
    setCreating(true);
    setBanner(null);
    try {
      await projectsApi.createProject({
        name: name.trim(),
        description: description.trim() || null,
        status: "active",
      });
      setName("");
      setDescription("");
      setBanner({ type: "ok", text: "Project created." });
      await load();
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof ApiError ? err.message : "Could not create project.",
      });
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p) {
    setEditingUuid(p.uuid);
    setEditName(p.name);
    setEditDescription(p.description ?? "");
    setEditStatus(p.status ?? "active");
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!isAuthenticated || !canUpdate || !editingUuid || !editName.trim()) return;
    setSavingEdit(true);
    setBanner(null);
    try {
      await projectsApi.updateProject(editingUuid, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
      });
      setEditingUuid(null);
      setBanner({ type: "ok", text: "Project updated." });
      await load();
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof ApiError ? err.message : "Could not update project.",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDeleteProject() {
    const uuid = deleteProjectUuid;
    if (!isAuthenticated || !uuid || !canDelete) return;
    setBanner(null);
    try {
      await projectsApi.deleteProject(uuid);
      setBanner({ type: "ok", text: "Project deleted." });
      await load();
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof ApiError ? err.message : "Could not delete project.",
      });
      throw err;
    }
  }

  return (
    <>
    <PageShell>
      <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />

      {loading && showWorkspace ? (
        <Panel className="animate-pulse">
          <div className="h-6 w-56 rounded-lg" style={{ backgroundColor: "var(--color-border)" }} />
          <div className="mt-6 space-y-3">
            <div className="h-24 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
            <div className="h-24 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
            <div className="h-24 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
          </div>
        </Panel>
      ) : !showWorkspace ? (
        <Panel>
          <p className="text-body leading-relaxed" style={{ color: "var(--color-txt-secondary)" }}>
            You do not have permission to view or create projects.
          </p>
        </Panel>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 lg:gap-6 ${
            showList && showCreate ? "lg:grid-cols-12" : "lg:grid-cols-1"
          }`}
        >
          {showList ? (
            <section className={showCreate ? "lg:col-span-7" : "lg:col-span-12"}>
              <Panel>
                <header
                  className="flex flex-wrap items-end justify-between gap-3 border-b pb-5"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div>
                    <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                      Project directory
                    </h2>
                    <p className="text-caption mt-1" style={{ color: "var(--color-txt-muted)" }}>
                      Names, status, and a short note — no dense tables.
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-caption font-medium"
                    style={{
                      backgroundColor: "var(--color-accent-purple-soft)",
                      color: "var(--color-accent-purple)",
                    }}
                  >
                    {counts.total} {counts.total === 1 ? "project" : "projects"}
                  </span>
                </header>

                <div className="scrollbar-themed mt-6 space-y-2 max-h-[min(560px,60vh)] overflow-y-auto pr-1">
                  {projects.length === 0 ? (
                    <p className="py-14 text-center text-body" style={{ color: "var(--color-txt-secondary)" }}>
                      {showCreate
                        ? "No projects yet — add your first one using the form beside this list."
                        : "No projects yet."}
                    </p>
                  ) : (
                    projects.map((p) => (
                      <div
                        key={p.uuid}
                        className="rounded-xl border px-4 py-3 transition-shadow duration-200"
                        style={{
                          backgroundColor: "var(--color-surface-muted)",
                          borderColor: "var(--color-border)",
                        }}
                      >
                        {editingUuid === p.uuid ? (
                          <form onSubmit={saveEdit} className="space-y-4">
                            <label className="block space-y-1.5">
                              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                                Name
                              </span>
                              <input
                                required
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded-xl px-3 py-2.5 text-body-strong outline-none focus:ring-2"
                                style={{
                                  backgroundColor: "var(--color-card)",
                                  border: "1px solid var(--color-border)",
                                  color: "var(--color-txt-primary)",
                                }}
                              />
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                                Description
                              </span>
                              <textarea
                                rows={3}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full rounded-xl px-3 py-2.5 text-body resize-y min-h-[72px] outline-none focus:ring-2"
                                style={{
                                  backgroundColor: "var(--color-card)",
                                  border: "1px solid var(--color-border)",
                                  color: "var(--color-txt-primary)",
                                }}
                              />
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                                Status
                              </span>
                              <FieldSelect tone="contrast" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                <option value="active">active</option>
                                <option value="archived">archived</option>
                              </FieldSelect>
                            </label>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="submit"
                                disabled={savingEdit}
                                className="rounded-xl px-4 py-2.5 text-body font-medium transition-opacity disabled:opacity-50"
                                style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                              >
                                {savingEdit ? "Saving…" : "Save changes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUuid(null)}
                                className="rounded-xl px-4 py-2.5 text-body font-medium border"
                                style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 gap-y-2">
                                <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                                  {p.name}
                                </p>
                                <StatusPill status={p.status} />
                              </div>
                              {p.description ? (
                                <p
                                  className="text-caption mt-2 line-clamp-3 leading-relaxed"
                                  style={{ color: "var(--color-txt-secondary)" }}
                                >
                                  {p.description}
                                </p>
                              ) : (
                                <p className="text-caption mt-2 italic" style={{ color: "var(--color-txt-muted)" }}>
                                  No description
                                </p>
                              )}
                            </div>
                            {(canUpdate || canDelete) && (
                              <div className="flex shrink-0 gap-2">
                                {canUpdate && (
                                  <button
                                    type="button"
                                    onClick={() => startEdit(p)}
                                    className="rounded-lg px-3 py-1.5 text-caption font-medium"
                                    style={{
                                      backgroundColor: "var(--color-accent-purple-soft)",
                                      color: "var(--color-accent-purple)",
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteProjectUuid(p.uuid)}
                                    className="rounded-lg px-3 py-1.5 text-caption font-medium"
                                    style={{
                                      backgroundColor: "rgba(239,68,68,0.12)",
                                      color: "rgb(239,68,68)",
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </section>
          ) : null}

          {showCreate ? (
            <div
              className={
                showList
                  ? "lg:col-span-5"
                  : "lg:col-span-12 max-w-xl lg:max-w-2xl mx-auto lg:mx-0 w-full"
              }
            >
              <Panel>
                <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                  New project
                </h2>
                <p className="text-caption mt-1 mb-6" style={{ color: "var(--color-txt-muted)" }}>
                  Add a name and optional context — you can refine later.
                </p>
                <form onSubmit={handleCreate} className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                      Name
                    </span>
                    <input
                      required
                      maxLength={160}
                      placeholder="e.g. Website redesign"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-body outline-none transition-shadow focus:ring-2"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-txt-primary)",
                        boxShadow: "none",
                      }}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                      Notes <span style={{ color: "var(--color-txt-muted)" }}>(optional)</span>
                    </span>
                    <textarea
                      rows={4}
                      maxLength={5000}
                      placeholder="Short summary for your team"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-body outline-none focus:ring-2 resize-y min-h-[100px]"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-txt-primary)",
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full rounded-xl px-4 py-2.5 text-body font-medium transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                  >
                    {creating ? "Creating…" : "Create project"}
                  </button>
                </form>
              </Panel>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
    <ConfirmDialog
      open={!!deleteProjectUuid}
      onClose={() => setDeleteProjectUuid(null)}
      title="Delete this project?"
      description="This removes the project and its link to tasks from the workspace. This cannot be undone."
      confirmLabel="Delete project"
      pendingLabel="Deleting…"
      onConfirm={confirmDeleteProject}
    />
    </>
  );
}
