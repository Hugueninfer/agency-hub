import { useEffect, useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { PageShell, Panel } from "../components/page/PageLayout";

const TYPE_LABELS = {
  task_assigned: "Task assigned",
  task_comment_added: "New comment on task",
  task_mentioned: "@Mention in comment",
  task_status_changed: "Task status changed",
  task_completed: "Task completed",
  project_updated: "Project updated",
  invoice_status_changed: "Invoice status changed",
};

export default function NotificationPreferencesPage() {
  const { preferences, preferencesLoading, fetchPreferences, updatePreferences } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (preferences.length > 0) {
      setLocalPrefs(preferences.map((p) => ({ ...p })));
    }
  }, [preferences]);

  const handleToggle = (type, channel) => {
    setLocalPrefs((prev) =>
      prev.map((p) =>
        p.type === type ? { ...p, [channel]: !p[channel] } : p,
      ),
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updatePreferences(localPrefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (preferencesLoading) {
    return (
      <PageShell>
        <div className="flex justify-center py-12">
          <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>Loading preferences...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="text-title-lg font-bold" style={{ color: "var(--color-txt-primary)" }}>
          Notification Preferences
        </h1>
        <button
          onClick={handleSave}
          disabled={saving || localPrefs.length === 0}
          className="btn-primary !py-2 !px-6 disabled:opacity-40"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>

      <Panel>
        <table className="w-full text-left">
          <thead>
            <tr className="text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
              <th className="pb-3 pr-4">Notification Type</th>
              <th className="pb-3 pr-4 text-center">In-App</th>
              <th className="pb-3 text-center">Email</th>
            </tr>
          </thead>
          <tbody>
            {localPrefs.map((pref) => (
              <tr
                key={pref.type}
                className="border-t"
                style={{ borderColor: "var(--color-border)" }}
              >
                <td className="py-3 pr-4">
                  <span className="text-body font-medium" style={{ color: "var(--color-txt-primary)" }}>
                    {TYPE_LABELS[pref.type] || pref.type}
                  </span>
                </td>
                <td className="py-3 pr-4 text-center">
                  <button
                    onClick={() => handleToggle(pref.type, "database_enabled")}
                    className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                      pref.database_enabled ? "bg-[var(--color-accent-lime)]" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pref.database_enabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="py-3 text-center">
                  <button
                    onClick={() => handleToggle(pref.type, "email_enabled")}
                    className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                      pref.email_enabled ? "bg-[var(--color-accent-lime)]" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pref.email_enabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageShell>
  );
}
