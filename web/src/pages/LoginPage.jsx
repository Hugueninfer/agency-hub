import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

export default function LoginPage() {
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || "Could not sign in.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggle}
            className="icon-btn"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>

        <div className="card space-y-6">
          <div>
            <h1 className="text-title-lg font-semibold" style={{ color: "var(--color-txt-primary)" }}>
              Sign in
            </h1>
            <p className="text-body mt-1" style={{ color: "var(--color-txt-secondary)" }}>
              Sign in to your account to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-control px-3 py-2 text-caption"
                style={{
                  backgroundColor: "var(--color-surface-muted)",
                  border: "1px solid var(--color-border-strong)",
                  color: "var(--color-txt-primary)",
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <label className="block space-y-1.5">
              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                Email
              </span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-control px-3 py-2.5 text-body border transition-colors outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-txt-primary)",
                }}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-caption font-medium" style={{ color: "var(--color-txt-secondary)" }}>
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-control px-3 py-2.5 text-body border transition-colors outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-txt-primary)",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-control font-semibold text-body transition-opacity disabled:opacity-60"
              style={{
                backgroundColor: "var(--color-accent-lime)",
                color: "#111",
              }}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
