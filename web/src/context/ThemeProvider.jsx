import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./theme-context";
import * as companyApi from "../api/company";

export default function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [settings, setSettings] = useState(null);

  // Load company settings from API (gracefully handles unauthenticated)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await companyApi.getSettings();
        if (!mounted) return;
        setSettings(data);
      } catch {
        // Not authenticated or API unavailable — use defaults
        if (mounted) setSettings(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);

  const value = useMemo(
    () => ({
      dark,
      toggle,
      // Company settings
      settings,
      driveLink: settings?.drive_link ?? null,
      driveLinkLabel: settings?.drive_link_label ?? "Drive",
      logoUrl: settings?.logo_url ?? null,
      companyName: settings?.company_name ?? null,
      // Force reload settings (e.g. after saving)
      reloadSettings: async () => {
        try {
          const data = await companyApi.getSettings();
          setSettings(data);
        } catch {
          // ignore
        }
      },
    }),
    [dark, toggle, settings],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
