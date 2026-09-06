import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import * as boardsApi from "../api/boards";
import ConfirmDialog from "../components/ConfirmDialog";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

export default function BoardsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, hasPermission } = useAuth();
  const canRead = hasPermission("board.read");
  const canCreate = hasPermission("board.create");
  const canDelete = hasPermission("board.delete");

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteBoardUuid, setDeleteBoardUuid] = useState(null);

  const showList = canRead;
  const showCreate = canCreate;
  const showWorkspace = showList || showCreate;

  const totalLabel = useMemo(() => {
    const total = boards.length;
    return `${total} ${total === 1 ? "board" : "boards"}`;
  }, [boards]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !canRead) {
      setBoards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setBanner(null);
    try {
      const list = await boardsApi.listBoards();
      setBoards(list);
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not load boards.",
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
      const response = await boardsApi.createBoard({
        name: name.trim(),
      });
      setName("");
      setBanner({ type: "ok", text: response.message || "Board created successfully." });
      await load();
      if (response.data?.uuid) {
        navigate(`/boards/${response.data.uuid}`);
      }
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not create board.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function confirmDeleteBoard() {
    const uuid = deleteBoardUuid;
    if (!isAuthenticated || !uuid || !canDelete) return;

    setBanner(null);
    try {
      const response = await boardsApi.deleteBoard(uuid);
      setBanner({ type: "ok", text: response.message || "Board deleted successfully." });
      await load();
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not delete board.",
      });
      throw e;
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
              You do not have permission to view or create boards.
            </p>
          </Panel>
        ) : (
          <div className={`grid grid-cols-1 gap-6 ${showList && showCreate ? "lg:grid-cols-12" : "lg:grid-cols-1"}`}>
            {showList ? (
              <section className={showCreate ? "lg:col-span-8" : "lg:col-span-12"}>
                <Panel>
                  <header
                    className="flex flex-wrap items-end justify-between gap-3 border-b pb-5"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div>
                      <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                        Boards
                      </h2>
                      <p className="mt-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                        Shared whiteboards for your tenant.
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-caption font-medium"
                      style={{
                        backgroundColor: "var(--color-accent-purple-soft)",
                        color: "var(--color-accent-purple)",
                      }}
                    >
                      {totalLabel}
                    </span>
                  </header>

                  <div className="mt-6 flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
                    {boards.length === 0 ? (
                      <p className="py-14 text-center text-body" style={{ color: "var(--color-txt-secondary)" }}>
                        {showCreate
                          ? "No boards yet — create your first board using the panel beside this list."
                          : "No boards available."}
                      </p>
                    ) : (
                      boards.map((board) => (
                        <div
                          key={board.uuid}
                          className="rounded-xl border px-4 py-3"
                          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-muted)" }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                                {board.name}
                              </p>
                              <p className="text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                                Updated {board.updated_at ? new Date(board.updated_at).toLocaleString() : "just now"}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/boards/${board.uuid}`)}
                                className="rounded-lg px-3 py-1.5 text-caption font-medium"
                                style={{
                                  backgroundColor: "var(--color-accent-purple-soft)",
                                  color: "var(--color-accent-purple)",
                                }}
                              >
                                Open
                              </button>
                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => setDeleteBoardUuid(board.uuid)}
                                  className="rounded-lg px-3 py-1.5 text-caption font-medium"
                                  style={{
                                    backgroundColor: "rgba(239,68,68,0.12)",
                                    color: "rgb(239,68,68)",
                                  }}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </section>
            ) : null}

            {showCreate ? (
              <section className={showList ? "lg:col-span-4" : "lg:col-span-12 max-w-xl"}>
                <Panel>
                  <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                    New board
                  </h2>
                  <p className="mb-6 mt-1 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    Create a board and start drawing with Excalidraw.
                  </p>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <label className="block space-y-1.5">
                      <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                        Name
                      </span>
                      <input
                        required
                        maxLength={160}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sprint planning"
                        className="w-full rounded-xl px-3 py-2.5 text-body outline-none transition-shadow focus:ring-2"
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
                      {creating ? "Creating…" : "Create board"}
                    </button>
                  </form>
                </Panel>
              </section>
            ) : null}
          </div>
        )}
      </PageShell>

      <ConfirmDialog
        open={!!deleteBoardUuid}
        onClose={() => setDeleteBoardUuid(null)}
        title="Delete this board?"
        description="This removes the board and all saved drawing data. This action cannot be undone."
        confirmLabel="Delete board"
        pendingLabel="Deleting…"
        onConfirm={confirmDeleteBoard}
      />
    </>
  );
}
