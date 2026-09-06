import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as rbacApi from "../api/rbac";
import ConfirmDialog from "../components/ConfirmDialog";
import FieldSelect from "../components/FieldSelect";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

function formatFieldErrors(errors) {
  if (!errors || typeof errors !== "object") return [];
  return Object.entries(errors).flatMap(([field, msgs]) =>
    (Array.isArray(msgs) ? msgs : [msgs]).map((m) => `${field}: ${String(m)}`),
  );
}

export default function SettingsUsersPage() {
  const { isAuthenticated, hasPermission } = useAuth();
  const canCreateUser = hasPermission("rbac.user.create");
  const canReadRoles = hasPermission("rbac.role.read");
  const canReadUsers = hasPermission("rbac.user.read");
  const canUpdateUser = hasPermission("rbac.user.update");
  const canDeleteUser = hasPermission("rbac.user.delete");

  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [banner, setBanner] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleUuid, setRoleUuid] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoleUuid, setEditRoleUuid] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [removeEditPhoto, setRemoveEditPhoto] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUuid, setDeletingUuid] = useState("");
  const [deleteUser, setDeleteUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isAuthenticated || !canReadRoles) {
        if (!cancelled) {
          setRoles([]);
          setRoleUuid("");
          setLoadingRoles(false);
        }
        return;
      }

      setLoadingRoles(true);
      try {
        const data = await rbacApi.listRoles();
        if (cancelled) return;
        setRoles(data);
        setRoleUuid((prev) => (prev && data.some((r) => r.uuid === prev) ? prev : (data[0]?.uuid ?? "")));
      } catch (e) {
        if (cancelled) return;
        setBanner({
          type: "error",
          text: e instanceof ApiError ? e.message : "Could not load roles.",
        });
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, canReadRoles]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isAuthenticated || !canReadUsers) {
        if (!cancelled) {
          setUsers([]);
          setLoadingUsers(false);
        }
        return;
      }

      setLoadingUsers(true);
      try {
        const data = await rbacApi.listUsers();
        if (!cancelled) setUsers(data);
      } catch (e) {
        if (cancelled) return;
        setBanner({
          type: "error",
          text: e instanceof ApiError ? e.message : "Could not load users.",
        });
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, canReadUsers]);

  const disableSubmit = useMemo(
    () =>
      !canCreateUser ||
      !canReadRoles ||
      submitting ||
      loadingRoles ||
      !name.trim() ||
      !email.trim() ||
      !password ||
      !roleUuid,
    [canCreateUser, canReadRoles, submitting, loadingRoles, name, email, password, roleUuid],
  );

  async function onSubmit(e) {
    e.preventDefault();
    if (!isAuthenticated || disableSubmit) return;

    setSubmitting(true);
    setBanner(null);
    try {
      const result = await rbacApi.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role_uuid: roleUuid,
        photo: photoFile,
      });
      setName("");
      setEmail("");
      setPassword("");
      setPhotoFile(null);
      if (canReadUsers) {
        const data = await rbacApi.listUsers();
        setUsers(data);
      }
      setBanner({ type: "ok", text: result.message || "User created successfully." });
    } catch (e) {
      const extra = e instanceof ApiError ? formatFieldErrors(e.errors) : [];
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not create user.",
        extra,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openEditUser(user) {
    const firstRoleUuid = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0].uuid : "";
    setEditingUser(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email ?? "");
    setEditRoleUuid(firstRoleUuid || roles[0]?.uuid || "");
    setEditPassword("");
    setEditPhotoFile(null);
    setRemoveEditPhoto(false);
  }

  async function submitEditUser(e) {
    e.preventDefault();
    if (!isAuthenticated || !editingUser) return;
    setSavingEdit(true);
    setBanner(null);
    try {
      const result = await rbacApi.updateUser(editingUser.uuid, {
        name: editName.trim(),
        email: editEmail.trim(),
        role_uuid: editRoleUuid,
        password: editPassword.trim() || null,
        photo: editPhotoFile,
        remove_photo: removeEditPhoto,
      });
      const data = await rbacApi.listUsers();
      setUsers(data);
      setEditingUser(null);
      setBanner({ type: "ok", text: result.message || "User updated successfully." });
    } catch (e) {
      const extra = e instanceof ApiError ? formatFieldErrors(e.errors) : [];
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not update user.",
        extra,
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteUser(user) {
    if (!isAuthenticated) return;
    setDeletingUuid(user.uuid);
    setBanner(null);
    try {
      const result = await rbacApi.deleteUser(user.uuid);
      const data = await rbacApi.listUsers();
      setUsers(data);
      setBanner({ type: "ok", text: result.message || "User deleted successfully." });
    } catch (e) {
      const extra = e instanceof ApiError ? formatFieldErrors(e.errors) : [];
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not delete user.",
        extra,
      });
    } finally {
      setDeletingUuid("");
    }
  }

  return (
    <PageShell>
      <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />

      <div className="grid grid-cols-2 gap-6">
        <Panel className="min-w-0">
          <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
            Add user
          </h2>
          <p className="mt-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
            Create a workspace user with name, email, password and optional photo.
          </p>

        {!canCreateUser ? (
          <p className="mt-4 text-body" style={{ color: "var(--color-txt-secondary)" }}>
            You need <code className="text-caption">rbac.user.create</code> to access this action.
          </p>
        ) : null}
        {!canReadRoles ? (
          <p className="mt-2 text-body" style={{ color: "var(--color-txt-secondary)" }}>
            You need <code className="text-caption">rbac.role.read</code> to select a role for the new user.
          </p>
        ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
              Name
            </span>
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-txt-primary)",
              }}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
              Email
            </span>
            <input
              required
              type="email"
              maxLength={180}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-txt-primary)",
              }}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
              Password
            </span>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-txt-primary)",
              }}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
              Role
            </span>
            <FieldSelect
              value={roleUuid}
              onChange={(e) => setRoleUuid(e.target.value)}
              disabled={loadingRoles || roles.length === 0}
            >
              {roles.length === 0 ? (
                <option value="">{loadingRoles ? "Loading roles..." : "No roles available"}</option>
              ) : (
                roles.map((r) => (
                  <option key={r.uuid} value={r.uuid}>
                    {r.name}
                  </option>
                ))
              )}
            </FieldSelect>
          </label>

            <label className="block space-y-1.5">
              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                Photo <span style={{ color: "var(--color-txt-muted)" }}>(optional)</span>
              </span>
              <label
                className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: "var(--color-surface-muted)",
                  border: "1px dashed var(--color-border)",
                  color: "var(--color-txt-primary)",
                }}
              >
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "var(--color-accent-purple-soft)", color: "var(--color-accent-purple)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="text-body">
                  {photoFile ? photoFile.name : "Upload profile photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            {photoFile ? (
              <button
                type="button"
                className="text-caption underline"
                style={{ color: "var(--color-txt-muted)" }}
                onClick={() => setPhotoFile(null)}
              >
                Remove selected photo
              </button>
            ) : null}
            </label>

          <button
            type="submit"
            disabled={disableSubmit}
            className="rounded-xl px-4 py-2.5 text-body font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
          >
            {submitting ? "Creating..." : "Create user"}
          </button>
          </form>
        </Panel>

        <Panel className="min-w-0">
          <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
            Users and roles
          </h2>
          <p className="mt-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
            Current workspace users and their assigned roles.
          </p>

          {!canReadUsers ? (
            <p className="mt-4 text-body" style={{ color: "var(--color-txt-secondary)" }}>
              You need <code className="text-caption">rbac.user.read</code> to list users.
            </p>
          ) : loadingUsers ? (
            <div className="mt-6 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: "var(--color-surface-muted)" }} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="mt-6 text-body" style={{ color: "var(--color-txt-secondary)" }}>
              No users found in this workspace.
            </p>
          ) : (
            <div className="mt-6 flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
              {users.map((u) => (
                <div
                  key={u.uuid}
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-muted)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                        {u.name}
                      </p>
                      <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                        {u.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(u.roles ?? []).length === 0 ? (
                          <span className="text-caption" style={{ color: "var(--color-txt-muted)" }}>
                            No roles
                          </span>
                        ) : (
                          (u.roles ?? []).map((r) => (
                            <span
                              key={r.uuid}
                              className="rounded-full px-2 py-0.5 text-caption font-medium"
                              style={{
                                backgroundColor: "var(--color-accent-purple-soft)",
                                color: "var(--color-accent-purple)",
                              }}
                            >
                              {r.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {(canUpdateUser || canDeleteUser) && (
                      <div className="flex shrink-0 gap-2">
                        {canUpdateUser && (
                          <button
                            type="button"
                            className="rounded-lg px-3 py-1.5 text-caption font-medium"
                            style={{
                              backgroundColor: "var(--color-accent-purple-soft)",
                              color: "var(--color-accent-purple)",
                            }}
                            onClick={() => openEditUser(u)}
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteUser && (
                          <button
                            type="button"
                            className="rounded-lg px-3 py-1.5 text-caption font-medium"
                            style={{
                              backgroundColor: "rgba(239,68,68,0.12)",
                              color: "rgb(239,68,68)",
                            }}
                            disabled={deletingUuid === u.uuid}
                            onClick={() => setDeleteUser(u)}
                          >
                            {deletingUuid === u.uuid ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {editingUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onClick={() => setEditingUser(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-[28px] p-6 md:p-8"
            style={{
              backgroundColor: "var(--color-card)",
              boxShadow: "var(--shadow-card)",
              border: "1px solid rgba(17,17,17,0.06)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
              Edit user
            </h2>
            <form className="mt-5 space-y-4" onSubmit={submitEditUser}>
              <label className="block space-y-1.5">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Name
                </span>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-txt-primary)",
                  }}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Email
                </span>
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-txt-primary)",
                  }}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Role
                </span>
                <FieldSelect
                  value={editRoleUuid}
                  onChange={(e) => setEditRoleUuid(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.uuid} value={r.uuid}>
                      {r.name}
                    </option>
                  ))}
                </FieldSelect>
              </label>
              <label className="block space-y-1.5">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  New password <span style={{ color: "var(--color-txt-muted)" }}>(optional)</span>
                </span>
                <input
                  type="password"
                  minLength={8}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-body outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-txt-primary)",
                  }}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                  Photo <span style={{ color: "var(--color-txt-muted)" }}>(optional)</span>
                </span>
                {editingUser?.photo_url && !removeEditPhoto && !editPhotoFile ? (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
                    <img
                      src={editingUser.photo_url}
                      alt={editingUser.name}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                      Current photo
                    </span>
                  </div>
                ) : null}
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: "var(--color-surface-muted)",
                    border: "1px dashed var(--color-border)",
                    color: "var(--color-txt-primary)",
                  }}
                >
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "var(--color-accent-purple-soft)", color: "var(--color-accent-purple)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </span>
                  <span className="text-body">
                    {editPhotoFile ? editPhotoFile.name : "Upload new photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setEditPhotoFile(e.target.files?.[0] ?? null);
                      if (e.target.files?.[0]) setRemoveEditPhoto(false);
                    }}
                    className="sr-only"
                  />
                </label>
                {(editingUser?.photo_url || editPhotoFile) ? (
                  <div className="flex gap-3">
                    {editPhotoFile ? (
                      <button
                        type="button"
                        className="text-caption underline"
                        style={{ color: "var(--color-txt-muted)" }}
                        onClick={() => setEditPhotoFile(null)}
                      >
                        Remove selected file
                      </button>
                    ) : null}
                    {editingUser?.photo_url ? (
                      <button
                        type="button"
                        className="text-caption underline"
                        style={{ color: "var(--color-danger-fg)" }}
                        onClick={() => {
                          setRemoveEditPhoto(true);
                          setEditPhotoFile(null);
                        }}
                      >
                        Remove current photo
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-xl px-4 py-2.5 text-body font-medium disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-accent-lime)", color: "#111" }}
                  disabled={savingEdit || !editName.trim() || !editEmail.trim() || !editRoleUuid}
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="rounded-xl px-4 py-2.5 text-body font-medium"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Delete this user?"
        description={
          deleteUser
            ? `This action removes ${deleteUser.name} from your workspace and cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete user"
        pendingLabel="Deleting..."
        onConfirm={async () => {
          if (!deleteUser) return;
          await handleDeleteUser(deleteUser);
          setDeleteUser(null);
        }}
      />
    </PageShell>
  );
}
