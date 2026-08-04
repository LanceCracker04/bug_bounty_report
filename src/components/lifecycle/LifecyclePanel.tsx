import { useState } from "react";
import {
  FINDING_LIFECYCLE_STATUSES,
  type FindingLifecycleStatus,
} from "../../types/phase6";
import type { Report } from "../../types/report";
import {
  lifecycleSuggestedActions,
  reasonRequired,
} from "../../utils/lifecycle";

export function LifecycleBadge({
  status,
}: {
  status?: FindingLifecycleStatus;
}) {
  return (
    <span className="badge border-violet-800 bg-violet-950/50 text-violet-200">
      Lifecycle: {status ?? "Draft"}
    </span>
  );
}
export function LifecyclePanel({
  report,
  onTransition,
  compact = false,
}: {
  report: Report;
  onTransition: (
    next: FindingLifecycleStatus,
    reason: string,
    actor: string,
    source: "Researcher" | "Program Response",
  ) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<FindingLifecycleStatus>(
    report.lifecycleStatus ?? "Draft",
  );
  const [reason, setReason] = useState("");
  const [actor, setActor] = useState("");
  const [source, setSource] = useState<"Researcher" | "Program Response">(
    "Researcher",
  );
  const current = report.lifecycleStatus ?? "Draft";
  const events = report.lifecycleEvents ?? [];
  const submit = () => {
    if (next === current) {
      setOpen(false);
      return;
    }
    if (reasonRequired(current, next) && !reason.trim()) return;
    onTransition(next, reason, actor, source);
    setReason("");
    setActor("");
    setOpen(false);
  };
  return (
    <section
      className={
        compact
          ? "rounded border border-slate-800 bg-[#0d1014] p-3"
          : "editor-section"
      }
      aria-labelledby="lifecycle-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="lifecycle-title"
              className={
                compact
                  ? "text-sm font-semibold text-slate-200"
                  : "text-base font-semibold text-slate-200"
              }
            >
              Finding Lifecycle
            </h2>
            <LifecycleBadge status={current} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Last changed:{" "}
            {events[events.length - 1]
              ? new Date(events[events.length - 1].timestamp).toLocaleString()
              : "Migrated or not yet changed"}
          </p>
        </div>
        <button
          className="button-secondary px-3 py-1.5 text-xs"
          type="button"
          onClick={() => {
            setNext(current);
            setOpen(true);
          }}
        >
          Change status
        </button>
      </div>
      {!compact && (
        <>
          <div className="mt-4 rounded border border-slate-800 bg-[#0d1014] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Next suggested actions
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
              {lifecycleSuggestedActions(current, report).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div
            className="mt-4 max-h-56 space-y-2 overflow-y-auto"
            aria-label="Lifecycle status history"
          >
            {events.length ? (
              [...events].reverse().map((event) => (
                <article
                  className="rounded border border-slate-800 bg-[#0d1014] p-3 text-sm"
                  key={event.id}
                >
                  <p className="font-medium text-slate-200">
                    {event.previousStatus ?? "Initial"} → {event.nextStatus}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleString()} ·{" "}
                    {event.source}
                    {event.actorLabel ? ` · ${event.actorLabel}` : ""}
                  </p>
                  {event.reason && (
                    <p className="mt-2 text-slate-400">
                      Reason: {event.reason}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No formal lifecycle events yet. Existing report status was
                preserved and mapped safely.
              </p>
            )}
          </div>
        </>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
        >
          <section
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-[#161a20] p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lifecycle-dialog-title"
          >
            <h2
              id="lifecycle-dialog-title"
              className="text-lg font-semibold text-slate-100"
            >
              Change lifecycle status
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Every change is recorded locally with a timestamp. Important
              transitions preserve a report snapshot first.
            </p>
            <label className="field-group mt-4">
              <span>New status</span>
              <select
                className="input-field"
                value={next}
                onChange={(event) =>
                  setNext(event.target.value as FindingLifecycleStatus)
                }
              >
                {FINDING_LIFECYCLE_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="field-group mt-3">
              <span>
                Reason{" "}
                {reasonRequired(current, next) ? "(required)" : "(recommended)"}
              </span>
              <textarea
                className="input-field min-h-20 resize-y"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-describedby={
                  reasonRequired(current, next)
                    ? "lifecycle-reason-help"
                    : undefined
                }
              />
            </label>
            {reasonRequired(current, next) && (
              <p
                id="lifecycle-reason-help"
                className="mt-1 text-xs text-amber-300"
              >
                This transition needs a reason before it can be recorded.
              </p>
            )}
            <label className="field-group mt-3">
              <span>Actor label (optional)</span>
              <input
                className="input-field"
                value={actor}
                onChange={(event) => setActor(event.target.value)}
                placeholder="Researcher or triager label"
              />
            </label>
            <label className="field-group mt-3">
              <span>Source</span>
              <select
                className="input-field"
                value={source}
                onChange={(event) =>
                  setSource(
                    event.target.value as "Researcher" | "Program Response",
                  )
                }
              >
                <option>Researcher</option>
                <option>Program Response</option>
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                type="button"
                disabled={
                  next !== current &&
                  reasonRequired(current, next) &&
                  !reason.trim()
                }
                onClick={submit}
              >
                Record change
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
