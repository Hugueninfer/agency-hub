import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import * as menuApi from "../api/menu";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";

const ICON_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "projects", label: "Projects" },
  { value: "clock", label: "Clock" },
  { value: "invoice", label: "Invoice" },
  { value: "tasks", label: "Tasks" },
  { value: "board", label: "Board" },
  { value: "bell", label: "Bell" },
  { value: "external", label: "External Link" },
  { value: "users", label: "Users" },
  { value: "shield", label: "Shield" },
  { value: "building", label: "Building" },
  { value: "gear", label: "Gear" },
];

export default function SettingsMenuPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [mainItems, setMainItems] = useState([]);
  const [settingsItems, setSettingsItems] = useState([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await menuApi.getMenu();
      setMainItems(data.main ?? []);
      setSettingsItems(data.settings ?? []);
    } catch {
      setBanner({ type: "error", text: "Could not load menu items." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateItem = useCallback((list, setList, index, field, value) => {
    setList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addItem = useCallback((section) => {
    const newItem = {
      uuid: null,
      section,
      label: "",
      icon: "external",
      route: "",
      url: "",
      permission: "",
      order: section === "main" ? mainItems.length : settingsItems.length,
      is_active: true,
    };
    if (section === "main") {
      setMainItems((prev) => [...prev, newItem]);
    } else {
      setSettingsItems((prev) => [...prev, newItem]);
    }
  }, [mainItems.length, settingsItems.length]);

  const removeItem = useCallback((list, setList, index) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveItem = useCallback((list, setList, index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    setList((prev) => {
      const updated = [...prev];
      const tmp = updated[index];
      updated[index] = { ...updated[newIndex], order: index };
      updated[newIndex] = { ...tmp, order: newIndex };
      return updated;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setBanner(null);
    try {
      const allItems = [...mainItems, ...settingsItems].map((item, i) => ({
        ...item,
        order: i,
      }));
      await menuApi.updateMenu(allItems);
      setBanner({ type: "ok", text: "Menu updated successfully!" });
    } catch (e) {
      setBanner({ type: "error", text: e instanceof ApiError ? e.message : "Could not save menu." });
    } finally {
      setSaving(false);
    }
  }, [mainItems, settingsItems]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex justify-center py-12">
          <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>Loading menu…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {banner && <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-title-lg font-bold" style={{ color: "var(--color-txt-primary)" }}>Menu Manager</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary !py-2.5 !px-8 font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Main Navigation */}
      <Panel title="Main Navigation">
        <p className="text-body mb-4" style={{ color: "var(--color-txt-secondary)" }}>
          Items in the main workspace menu. Drag to reorder or use the arrow buttons.
        </p>
        {renderItemList(mainItems, setMainItems, updateItem, moveItem, removeItem, addItem, "main")}
      </Panel>

      {/* Settings */}
      <Panel title="Settings">
        <p className="text-body mb-4" style={{ color: "var(--color-txt-secondary)" }}>
          Items in the Settings dropdown.
        </p>
        {renderItemList(settingsItems, setSettingsItems, updateItem, moveItem, removeItem, addItem, "settings")}
      </Panel>
    </PageShell>
  );
}

function renderItemList(items, setItems, updateItem, moveItem, removeItem, addItem, section) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border)" }}
        >
          {/* Reorder */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => moveItem(items, setItems, i, -1)}
              disabled={i === 0}
              className="w-5 h-4 flex items-center justify-center disabled:opacity-30 hover:opacity-70"
              style={{ color: "var(--color-txt-secondary)" }}
              aria-label="Move up"
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => moveItem(items, setItems, i, 1)}
              disabled={i === items.length - 1}
              className="w-5 h-4 flex items-center justify-center disabled:opacity-30 hover:opacity-70"
              style={{ color: "var(--color-txt-secondary)" }}
              aria-label="Move down"
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Active toggle */}
          <button
            type="button"
            onClick={() => updateItem(items, setItems, i, "is_active", !item.is_active)}
            className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
              item.is_active ? "" : "opacity-40"
            }`}
            style={{
              backgroundColor: item.is_active ? "var(--color-accent-lime)" : "var(--color-surface-muted)",
              color: item.is_active ? "#111" : "var(--color-txt-muted)",
              border: "1px solid var(--color-border)",
            }}
            title={item.is_active ? "Active" : "Inactive"}
          >
            {item.is_active ? (
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>

          {/* Icon select */}
          <select
            value={item.icon || "external"}
            onChange={(e) => updateItem(items, setItems, i, "icon", e.target.value)}
            className="form-control-themed !w-28 !py-1.5 !text-caption"
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Label */}
          <input
            type="text"
            value={item.label}
            onChange={(e) => updateItem(items, setItems, i, "label", e.target.value)}
            className="form-control-themed !py-1.5 !text-body min-w-[120px] flex-1"
            placeholder="Label"
          />

          {/* Route or URL */}
          <input
            type="text"
            value={item.route || ""}
            onChange={(e) => updateItem(items, setItems, i, "route", e.target.value)}
            className="form-control-themed !py-1.5 !text-caption w-32"
            placeholder="/route"
          />
          <input
            type="text"
            value={item.url || ""}
            onChange={(e) => updateItem(items, setItems, i, "url", e.target.value)}
            className="form-control-themed !py-1.5 !text-caption w-40"
            placeholder="https://..."
          />

          {/* Permission */}
          <input
            type="text"
            value={item.permission || ""}
            onChange={(e) => updateItem(items, setItems, i, "permission", e.target.value)}
            className="form-control-themed !py-1.5 !text-caption w-28"
            placeholder="permission.code"
          />

          {/* Delete */}
          <button
            type="button"
            onClick={() => removeItem(items, setItems, i)}
            className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30"
            style={{ color: "var(--color-danger-fg)" }}
            aria-label="Remove item"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => addItem(section)}
        className="w-full py-2 rounded-xl border-2 border-dashed text-caption font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
        style={{ borderColor: "var(--color-border)", color: "var(--color-txt-secondary)" }}
      >
        + Add item
      </button>
    </div>
  );
}
