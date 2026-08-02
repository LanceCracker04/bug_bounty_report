import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

const styles: Record<ToastType, string> = {
  success: "border-emerald-800 bg-emerald-950/95 text-emerald-100",
  error: "border-red-800 bg-red-950/95 text-red-100",
  warning: "border-amber-800 bg-amber-950/95 text-amber-100",
};

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 4500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  return <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl ${styles[toast.type]}`} role="status"><span className="mt-0.5" aria-hidden="true">{toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "!"}</span><p className="flex-1">{toast.message}</p><button className="text-current/70 hover:text-current" type="button" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>×</button></div>;
}

export function ToastRegion({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  return <div className="fixed right-4 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">{toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />)}</div>;
}
