import { Component } from "react";

/**
 * Evita ecrã totalmente em branco quando um erro de React não tratado ocorre.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-8"
          style={{ backgroundColor: "var(--color-bg, #D9EA63)" }}
        >
          <div className="max-w-md rounded-[24px] p-6 shadow-lg bg-white dark:bg-neutral-900" style={{ color: "#111" }}>
            <h1 className="text-title-md font-semibold mb-2">Something went wrong</h1>
            <pre className="text-caption whitespace-pre-wrap break-words opacity-90">{this.state.error?.message}</pre>
            <button
              type="button"
              className="mt-4 rounded-xl px-4 py-2 font-medium"
              style={{ backgroundColor: "var(--color-accent-lime, #DCEB63)", color: "#111" }}
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
