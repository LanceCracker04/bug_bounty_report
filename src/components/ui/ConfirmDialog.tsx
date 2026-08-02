import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  confirmTone?: "danger" | "primary";
  cancelLabel?: string;
  isProcessing?: boolean;
}

export function ConfirmDialog({ isOpen, title, description, confirmLabel, onConfirm, onCancel, secondaryLabel, onSecondary, confirmTone = "danger", cancelLabel = "Cancel", isProcessing = false }: ConfirmDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessing) onCancel();
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>("[data-confirm-dialog]");
      const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')] : [];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [isOpen, isProcessing, onCancel]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={() => { if (!isProcessing) onCancel(); }}>
      <section data-confirm-dialog className="w-full max-w-md rounded-lg border border-slate-700 bg-[#161a20] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="confirmation-title" className="text-lg font-semibold text-slate-100">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={cancelButton} className="button-secondary" type="button" disabled={isProcessing} onClick={onCancel}>{cancelLabel}</button>
          {secondaryLabel && onSecondary && <button className="button-secondary" type="button" disabled={isProcessing} onClick={onSecondary}>{secondaryLabel}</button>}
          <button className={confirmTone === "danger" ? "button-danger" : "button-primary"} type="button" disabled={isProcessing} onClick={onConfirm}>{isProcessing ? "Processing…" : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
