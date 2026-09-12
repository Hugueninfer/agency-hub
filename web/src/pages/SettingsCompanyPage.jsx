import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import * as companyApi from "../api/company";
import { AlertBanner, PageShell, Panel } from "../components/page/PageLayout";
import { useTheme } from "../hooks/useTheme";

export default function SettingsCompanyPage() {
  const { reloadSettings, companyName } = useTheme();

  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [currentLogoUrl, setCurrentLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [formDriveLink, setFormDriveLink] = useState("");
  const [formDriveLabel, setFormDriveLabel] = useState("");

  const fileInputRef = useRef(null);

  // Load initial settings
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await companyApi.getSettings();
        if (!mounted) return;
        setCurrentLogoUrl(data?.logo_url ?? null);
        setFormDriveLink(data?.drive_link ?? "");
        setFormDriveLabel(data?.drive_link_label ?? "Drive");
        setLogoFile(null);
        setRemoveLogo(false);
      } catch {
        if (mounted) setBanner({ type: "error", text: "Could not load company settings." });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onload = (ev) => setCurrentLogoUrl(ev.target?.result);
      reader.readAsDataURL(file);
      setLogoFile(file);
      setRemoveLogo(false);
    }
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setCurrentLogoUrl(null);
    setLogoFile(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setBanner(null);
    try {
      const formData = new FormData();
      if (logoFile instanceof File) {
        formData.append("logo", logoFile);
      }
      if (removeLogo) {
        formData.append("remove_logo", "1");
      }
      formData.append("drive_link", formDriveLink);
      formData.append("drive_link_label", formDriveLabel);

      await companyApi.updateSettings(formData);
      await reloadSettings();
      setBanner({ type: "ok", text: "Company settings saved successfully!" });
      setLogoFile(null);
      setRemoveLogo(false);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not save settings.";
      setBanner({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  }, [logoFile, removeLogo, formDriveLink, formDriveLabel, reloadSettings]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex justify-center py-12">
          <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>Loading settings…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {banner && (
        <AlertBanner banner={banner} onDismiss={() => setBanner(null)} />
      )}

      {/* Branding Section */}
      <Panel title="Company Branding">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo */}
          <div>
            <p className="text-caption font-semibold mb-2" style={{ color: "var(--color-txt-secondary)" }}>
              Company Logo
            </p>
            <div
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}
              >
                {currentLogoUrl ? (
                  <img src={currentLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--color-txt-muted)" }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="btn-secondary !py-1.5 !px-3 !text-caption cursor-pointer inline-block text-center"
                >
                  {logoFile ? "Change logo" : "Upload logo"}
                </label>
                {(currentLogoUrl || logoFile) && (
                  <button
                    onClick={handleRemoveLogo}
                    className="text-caption font-medium hover:underline text-left"
                    style={{ color: "var(--color-danger-fg)" }}
                  >
                    Remove logo
                  </button>
                )}
                <p className="text-caption" style={{ color: "var(--color-txt-muted)" }}>
                  PNG, JPG, SVG or WebP. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div>
            <p className="text-caption font-semibold mb-2" style={{ color: "var(--color-txt-secondary)" }}>
              Company Name
            </p>
            <p className="text-body py-2 px-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-muted)", border: "1px solid var(--color-border)", color: "var(--color-txt-primary)" }}>
              {companyName || "—"}
            </p>
            <p className="text-caption mt-1" style={{ color: "var(--color-txt-muted)" }}>
              Company name is managed by the system administrator.
            </p>
          </div>
        </div>
      </Panel>

      {/* External Link Section */}
      <Panel title="External Link">
        <p className="text-body mb-4" style={{ color: "var(--color-txt-secondary)" }}>
          Configure an external link (e.g. Google Drive, Dropbox) that will appear in the main navigation menu.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
              Link Label
            </span>
            <input
              type="text"
              value={formDriveLabel}
              onChange={(e) => setFormDriveLabel(e.target.value)}
              className="form-control-themed"
              placeholder="Drive"
              maxLength={50}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
              Link URL
            </span>
            <input
              type="url"
              value={formDriveLink}
              onChange={(e) => setFormDriveLink(e.target.value)}
              className="form-control-themed"
              placeholder="https://drive.google.com/..."
            />
          </label>
        </div>
      </Panel>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary !py-2.5 !px-8 font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </PageShell>
  );
}
