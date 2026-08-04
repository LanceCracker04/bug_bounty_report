import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { RootErrorBoundary } from "./components/ui/RootErrorBoundary.tsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML =
    '<main style="min-height:100vh;display:grid;place-items:center;background:#0b0d10;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;padding:24px"><section><h1>Application root is unavailable</h1><p>Reload the application. Stored reports and evidence have not been changed.</p></section></main>';
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
}

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  // A service worker is origin-scoped. Remove only stale development shell
  // caches so a prior preview cannot serve an out-of-date Vite entry point.
  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations.map((registration) => registration.unregister()),
      ),
    )
    .catch(() => undefined);
  if ("caches" in window)
    void caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("bbr-shell-"))
            .map((key) => caches.delete(key)),
        ),
      )
      .catch(() => undefined);
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              window.dispatchEvent(new Event("bbr-pwa-update"));
          });
        });
      })
      .catch(() => {
        // PWA support is optional; the local workspace remains usable without it.
      });
  });
}
