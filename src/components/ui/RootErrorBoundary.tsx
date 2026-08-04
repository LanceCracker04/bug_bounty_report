import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * The application keeps report content in browser storage, so an unexpected
 * render failure must never strand the user on an empty document or attempt a
 * destructive recovery. This boundary deliberately exposes no exception text:
 * rendering errors can contain report values.
 */
export class RootErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(): void {
    // Intentionally no console output or persisted diagnostic payload. Either
    // can expose report content included in a rendering exception.
  }

  private reload = (): void => {
    window.location.reload();
  };

  private openDiagnostics = (): void => {
    window.location.assign("/diagnostics");
  };

  private clearOptionalUiState = (): void => {
    try {
      // These values only affect transient navigation/UI presentation. Reports,
      // settings, templates, histories, and IndexedDB evidence are untouched.
      window.sessionStorage.clear();
      window.history.replaceState(null, "", "/");
    } catch {
      // Storage can be disabled by browser privacy settings; reload still gives
      // the user a safe recovery path.
    }
    window.location.reload();
  };

  public render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d10] p-6 text-slate-200">
        <section
          className="w-full max-w-xl rounded-lg border border-amber-900 bg-[#101318] p-6 shadow-2xl"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Recovery screen
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-100">
            The application could not render
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Your reports and evidence have not been deleted. Reload the
            application or open Diagnostics to continue recovery.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="button-primary"
              type="button"
              onClick={this.reload}
            >
              Reload Application
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={this.openDiagnostics}
            >
              Open Diagnostics
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={this.clearOptionalUiState}
            >
              Clear Optional UI State
            </button>
          </div>
        </section>
      </main>
    );
  }
}
