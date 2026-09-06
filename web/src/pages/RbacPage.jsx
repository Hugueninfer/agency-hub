import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as rbacApi from "../api/rbac";
import FieldSelect from "../components/FieldSelect";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

function formatFieldErrors(errors) {
  if (!errors || typeof errors !== "object") return [];
  return Object.entries(errors).flatMap(([field, msgs]) =>
    (Array.isArray(msgs) ? msgs : [msgs]).map(
      (m) => `${field}: ${typeof m === "string" ? m : JSON.stringify(m)}`,
    ),
  );
}

export default function RbacPage() {
  const { isAuthenticated, hasPermission } = useAuth();

  const showCatalog = hasPermission("rbac.permission.read");
  const showCreateRole = hasPermission("rbac.role.create");
  const showRolePerms =
    hasPermission("rbac.role.assign_permission") &&
    hasPermission("rbac.permission.read") &&
    hasPermission("rbac.role.read");
  const showAssignUser =
    hasPermission("rbac.user.assign_role") &&
    hasPermission("rbac.user.read") &&
    hasPermission("rbac.role.read");
  const showWorkspace = showCatalog || showCreateRole || showRolePerms || showAssignUser;

  const canListPerms = hasPermission("rbac.permission.read");
  const canListRoles = hasPermission("rbac.role.read");
  const canListUsers = hasPermission("rbac.user.read");

  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  const [selectedRoleUuid, setSelectedRoleUuid] = useState("");
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState({});
  const [assigningPerms, setAssigningPerms] = useState(false);

  const [assignUserUuid, setAssignUserUuid] = useState("");
  const [assignRoleUuid, setAssignRoleUuid] = useState("");
  const [assigningUserRole, setAssigningUserRole] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setBanner(null);
    try {
      const tasks = [];
      if (canListPerms) {
        tasks.push(rbacApi.listPermissions().then((data) => ({ key: "perm", data })));
      }
      if (canListRoles) {
        tasks.push(rbacApi.listRoles().then((data) => ({ key: "roles", data })));
      }
      if (canListUsers) {
        tasks.push(rbacApi.listUsers().then((data) => ({ key: "users", data })));
      }

      const results = tasks.length ? await Promise.all(tasks) : [];

      let p = [];
      let r = [];
      let u = [];
      for (const row of results) {
        if (row.key === "perm") p = row.data;
        if (row.key === "roles") r = row.data;
        if (row.key === "users") u = row.data;
      }

      if (!canListPerms) setPermissions([]);
      else setPermissions(p);
      if (!canListRoles) setRoles([]);
      else setRoles(r);
      if (!canListUsers) setUsers([]);
      else setUsers(u);

      setSelectedRoleUuid((prev) => {
        if (prev && r.some((x) => x.uuid === prev)) return prev;
        return r[0]?.uuid ?? "";
      });
      setAssignUserUuid((prev) => {
        if (prev && u.some((x) => x.uuid === prev)) return prev;
        return u[0]?.uuid ?? "";
      });
      setAssignRoleUuid((prev) => {
        if (prev && r.some((x) => x.uuid === prev)) return prev;
        return r[0]?.uuid ?? "";
      });
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not load access control data.",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, canListPerms, canListRoles, canListUsers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedRole = useMemo(
    () => roles.find((x) => x.uuid === selectedRoleUuid) || null,
    [roles, selectedRoleUuid],
  );

  useEffect(() => {
    if (!selectedRole?.permissions) {
      setSelectedPermissionCodes({});
      return;
    }
    const next = {};
    for (const perm of selectedRole.permissions) {
      if (perm?.code) next[perm.code] = true;
    }
    setSelectedPermissionCodes(next);
  }, [selectedRoleUuid, selectedRole]);

  function togglePermission(code) {
    setSelectedPermissionCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  }

  async function handleCreateRole(e) {
    e.preventDefault();
    if (!isAuthenticated || !newRoleName.trim()) return;
    setCreatingRole(true);
    setBanner(null);
    try {
      await rbacApi.createRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || null,
      });
      setNewRoleName("");
      setNewRoleDescription("");
      setBanner({ type: "ok", text: "Role created." });
      await loadAll();
    } catch (e) {
      const extra = e instanceof ApiError ? formatFieldErrors(e.errors) : [];
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not create role.",
        extra,
      });
    } finally {
      setCreatingRole(false);
    }
  }

  async function handleAssignPermissions(e) {
    e.preventDefault();
    if (!isAuthenticated || !selectedRoleUuid) return;
    const codes = Object.keys(selectedPermissionCodes).filter((k) => selectedPermissionCodes[k]);
    if (!codes.length) {
      setBanner({ type: "error", text: "Select at least one permission." });
      return;
    }
    setAssigningPerms(true);
    setBanner(null);
    try {
      await rbacApi.assignPermissionsToRole(selectedRoleUuid, codes);
      setBanner({ type: "ok", text: "Role permissions updated." });
      await loadAll();
    } catch (e) {
      const extra = e instanceof ApiError ? formatFieldErrors(e.errors) : [];
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not update permissions.",
        extra,
      });
    } finally {
      setAssigningPerms(false);
    }
  }

  async function handleAssignUserRole(e) {
    e.preventDefault();
    if (!isAuthenticated || !assignUserUuid || !assignRoleUuid) return;
    setAssigningUserRole(true);
    setBanner(null);
    try {
      await rbacApi.assignRoleToUser({
        user_uuid: assignUserUuid,
        role_uuid: assignRoleUuid,
      });
      setBanner({ type: "ok", text: "Role assigned to user." });
    } catch (e) {
      const extra = e instanceof ApiError ? formatFieldErrors(e.errors) : [];
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not assign role.",
        extra,
      });
    } finally {
      setAssigningUserRole(false);
    }
  }

  const selectedCount = useMemo(
    () => Object.values(selectedPermissionCodes).filter(Boolean).length,
    [selectedPermissionCodes],
  );

  return (
    <PageShell>
      <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />

      {loading && showWorkspace ? (
        <Panel className="animate-pulse">
          <div className="h-6 w-48 rounded-lg" style={{ backgroundColor: "var(--color-border)" }} />
          <div className="mt-6 space-y-3">
            <div className="h-14 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
            <div className="h-14 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
            <div className="h-14 rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
          </div>
        </Panel>
      ) : !showWorkspace ? (
        <Panel>
          <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>
            You do not have any access control actions enabled for your account.
          </p>
        </Panel>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 lg:gap-6 ${showCatalog ? "lg:grid-cols-12" : "lg:grid-cols-1"}`}
        >
          {/* Permission catalog — list rows, not dense table (design.json) */}
          {showCatalog ? (
          <section className="lg:col-span-7">
            <Panel>
              <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                    Permission catalog
                  </h2>
                  <p className="text-caption mt-1" style={{ color: "var(--color-txt-muted)" }}>
                    What each permission allows in your workspace
                  </p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-caption font-medium"
                  style={{
                    backgroundColor: "var(--color-accent-purple-soft)",
                    color: "var(--color-accent-purple)",
                  }}
                >
                  {permissions.length} items
                </span>
              </header>

              <div className="scrollbar-themed mt-6 space-y-2 max-h-[min(520px,55vh)] overflow-y-auto pr-1">
                {permissions.length === 0 ? (
                  <p className="py-12 text-center text-body" style={{ color: "var(--color-txt-secondary)" }}>
                    No permissions returned.
                  </p>
                ) : (
                  permissions.map((p) => (
                    <div
                      key={p.code}
                      className="flex flex-col gap-2 rounded-[20px] px-4 py-3 transition-shadow duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      style={{
                        backgroundColor: "var(--color-surface-muted)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                          {p.name}
                        </p>
                        {p.description ? (
                          <p className="text-caption mt-1 line-clamp-2" style={{ color: "var(--color-txt-secondary)" }}>
                            {p.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </section>
          ) : null}

          {/* Stacked action cards — editorial rhythm */}
          <div className={`space-y-6 ${showCatalog ? "lg:col-span-5" : "lg:col-span-12 max-w-xl lg:max-w-none"}`}>
            {showCreateRole ? (
            <Panel>
              <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                Create role
              </h2>
              <p className="text-caption mt-1 mb-6" style={{ color: "var(--color-txt-muted)" }}>
                Add a role for your tenant
              </p>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Name
                  </span>
                  <input
                    required
                    maxLength={80}
                    placeholder="e.g. editor"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
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
                    Description <span style={{ color: "var(--color-txt-muted)" }}>(optional)</span>
                  </span>
                  <input
                    maxLength={255}
                    placeholder="Short summary"
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-body outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-txt-primary)",
                    }}
                  />
                </label>
                <button
                  type="submit"
                  disabled={creatingRole}
                  className="w-full rounded-xl px-4 py-2.5 text-body font-medium transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                >
                  {creatingRole ? "Creating…" : "Create role"}
                </button>
              </form>
            </Panel>
            ) : null}

            {showRolePerms ? (
            <Panel>
              <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                    Role permissions
                  </h2>
                  <p className="text-caption mt-1" style={{ color: "var(--color-txt-muted)" }}>
                    {selectedCount} selected
                  </p>
                </div>
              </div>
              <form onSubmit={handleAssignPermissions} className="mt-5 space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Role
                  </span>
                  <FieldSelect value={selectedRoleUuid} onChange={(e) => setSelectedRoleUuid(e.target.value)}>
                    {roles.length === 0 ? (
                      <option value="">No roles yet</option>
                    ) : (
                      roles.map((r) => (
                        <option key={r.uuid} value={r.uuid}>
                          {r.name}
                        </option>
                      ))
                    )}
                  </FieldSelect>
                </label>

                <div
                  className="scrollbar-themed max-h-48 space-y-2 overflow-y-auto rounded-xl p-2"
                  style={{
                    backgroundColor: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {permissions.length === 0 ? (
                    <p className="py-6 text-center text-caption" style={{ color: "var(--color-txt-muted)" }}>
                      Nothing to assign
                    </p>
                  ) : (
                    permissions.map((p) => (
                      <label
                        key={p.code}
                        className="flex cursor-pointer items-start gap-3 rounded-[14px] px-3 py-2 transition-colors"
                        style={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(selectedPermissionCodes[p.code])}
                          onChange={() => togglePermission(p.code)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                          style={{ accentColor: "var(--color-accent-purple)" }}
                        />
                        <span className="min-w-0">
                          <span className="block text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                            {p.name}
                          </span>
                          {p.description ? (
                            <span className="mt-0.5 block line-clamp-2 text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                              {p.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  )}
                </div>

                <button
                  type="submit"
                  disabled={assigningPerms || !selectedRoleUuid || !roles.length}
                  className="w-full rounded-xl px-4 py-2.5 text-body font-medium disabled:opacity-45"
                  style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                >
                  {assigningPerms ? "Saving…" : "Save permissions"}
                </button>
              </form>
            </Panel>
            ) : null}

            {showAssignUser ? (
            <Panel>
              <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                Assign role to user
              </h2>
              <p className="text-caption mt-1 mb-6" style={{ color: "var(--color-txt-muted)" }}>
                Grant access in one step
              </p>
              <form onSubmit={handleAssignUserRole} className="space-y-5 pb-1">
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    User
                  </span>
                  <FieldSelect value={assignUserUuid} onChange={(e) => setAssignUserUuid(e.target.value)}>
                    {users.length === 0 ? (
                      <option value="">No users</option>
                    ) : (
                      users.map((u) => (
                        <option key={u.uuid} value={u.uuid}>
                          {u.name} ({u.email})
                        </option>
                      ))
                    )}
                  </FieldSelect>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                    Role
                  </span>
                  <FieldSelect value={assignRoleUuid} onChange={(e) => setAssignRoleUuid(e.target.value)}>
                    {roles.length === 0 ? (
                      <option value="">No roles</option>
                    ) : (
                      roles.map((r) => (
                        <option key={r.uuid} value={r.uuid}>
                          {r.name}
                        </option>
                      ))
                    )}
                  </FieldSelect>
                </label>
                <button
                  type="submit"
                  disabled={assigningUserRole || !assignUserUuid || !assignRoleUuid}
                  className="w-full rounded-xl px-4 py-2.5 text-body font-medium disabled:opacity-45"
                  style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                >
                  {assigningUserRole ? "Applying…" : "Assign role"}
                </button>
              </form>
            </Panel>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
