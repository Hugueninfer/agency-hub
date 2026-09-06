import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as boardsApi from "../api/boards";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useAuth } from "../hooks/useAuth";

function normalizeScene(scene) {
  return {
    elements: Array.isArray(scene?.elements) ? scene.elements : [],
    appState: scene?.appState && typeof scene.appState === "object" ? scene.appState : {},
    files: scene?.files && typeof scene.files === "object" ? scene.files : {},
  };
}

export default function BoardEditorPage() {
  const { boardUuid } = useParams();
  const { isAuthenticated, hasPermission } = useAuth();
  const canRead = hasPermission("board.read");
  const canSave = hasPermission("board.create");

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [saveState, setSaveState] = useState("idle");

  const sceneRef = useRef(normalizeScene(null));
  const lastSavedRef = useRef("");
  const saveTimerRef = useRef(null);

  const readOnly = useMemo(() => !canSave, [canSave]);

  const saveBoard = useCallback(
    async (scene, { silent = false } = {}) => {
      if (!isAuthenticated || !boardUuid || !canSave) return;
      const payloadScene = normalizeScene(scene);
      const nextHash = JSON.stringify(payloadScene);
      if (nextHash === lastSavedRef.current) return;

      setSaveState("saving");
      try {
        const response = await boardsApi.updateBoard(boardUuid, {
          excalidraw_data: payloadScene,
        });
        lastSavedRef.current = nextHash;
        setSaveState("saved");
        if (!silent && response.message) {
          setBanner({ type: "ok", text: response.message });
        }
      } catch (e) {
        setSaveState("error");
        if (!silent) {
          setBanner({
            type: "error",
            text: e instanceof ApiError ? e.message : "Could not save board.",
          });
        }
      }
    },
    [isAuthenticated, boardUuid, canSave],
  );

  const loadBoard = useCallback(async () => {
    if (!isAuthenticated || !boardUuid || !canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const data = await boardsApi.getBoard(boardUuid);
      setBoard(data);
      const scene = normalizeScene(data?.excalidraw_data);
      sceneRef.current = scene;
      lastSavedRef.current = JSON.stringify(scene);
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof ApiError ? e.message : "Could not load board.",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, boardUuid, canRead]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const onChange = useCallback(
    (elements, appState, files) => {
      const nextScene = normalizeScene({ elements, appState, files });
      sceneRef.current = nextScene;
      if (!canSave) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void saveBoard(nextScene, { silent: true });
      }, 1800);
    },
    [canSave, saveBoard],
  );

  async function handleManualSave() {
    await saveBoard(sceneRef.current, { silent: false });
  }

  return (
    <PageShell>
      <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption" style={{ color: "var(--color-txt-muted)" }}>
              <Link to="/boards" className="underline">
                Boards
              </Link>{" "}
              / {board?.name ?? "Board"}
            </p>
            <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
              {board?.name ?? "Board editor"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-caption" style={{ color: "var(--color-txt-muted)" }}>
              {readOnly
                ? "Read-only mode"
                : saveState === "saving"
                  ? "Saving..."
                  : saveState === "saved"
                    ? "Saved"
                    : "Ready"}
            </span>
            <button
              type="button"
              onClick={() => void handleManualSave()}
              disabled={readOnly || loading || saveState === "saving"}
              className="rounded-xl px-4 py-2 text-caption font-medium transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-accent-lime)",
                color: "#111",
              }}
            >
              Save
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-[70vh] animate-pulse rounded-[20px]" style={{ backgroundColor: "var(--color-surface-muted)" }} />
        ) : (
          <div className="h-[70vh] overflow-hidden rounded-[20px] border" style={{ borderColor: "var(--color-border)" }}>
            <Excalidraw
              initialData={normalizeScene(board?.excalidraw_data)}
              onChange={onChange}
              viewModeEnabled={readOnly}
            />
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
