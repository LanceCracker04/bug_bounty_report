import { useMemo, useState } from "react";
import { RemediationComparison } from "../components/remediation/RemediationComparison";
import {
  VERIFICATION_OUTCOMES,
  type FindingLifecycleStatus,
  type RetestRecord,
  type VerificationOutcome,
} from "../types/phase6";
import type { AssetRecord } from "../types/program";
import type { Report } from "../types/report";
import {
  createRetest,
  validateRetestForCompletion,
} from "../utils/retestStorage";
import { outcomeLifecycleSuggestion } from "../utils/lifecycle";

interface Props {
  reports: Report[];
  assets: AssetRecord[];
  retests: RetestRecord[];
  onSave: (retest: RetestRecord) => void;
  onDelete: (retest: RetestRecord) => void;
  onComplete: (retest: RetestRecord, proposed?: FindingLifecycleStatus) => void;
  onSaveComparisonNote: (report: Report, summary: string) => void;
}
export function RetestWorkspacePage({
  reports,
  assets,
  retests,
  onSave,
  onDelete,
  onComplete,
  onSaveComparisonNote,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>();
  const [reportId, setReportId] = useState(reports[0]?.id ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [completion, setCompletion] = useState<RetestRecord>();
  const [proposedStatus, setProposedStatus] = useState<
    FindingLifecycleStatus | "manual"
  >("manual");
  const selected = retests.find((item) => item.id === selectedId);
  const report = reports.find((item) => item.id === selected?.reportId);
  const sorted = useMemo(
    () =>
      [...retests].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [retests],
  );
  const start = (duplicate?: RetestRecord, regression = false) => {
    const sourceReport = reports.find(
      (item) => item.id === (duplicate?.reportId ?? reportId),
    );
    if (!sourceReport) return;
    const retest = createRetest(
      sourceReport,
      duplicate,
      regression ? duplicate?.id : undefined,
    );
    onSave(retest);
    setSelectedId(retest.id);
    setErrors([]);
  };
  const update = (change: Partial<RetestRecord>) => {
    if (!selected) return;
    onSave({ ...selected, ...change, updatedAt: new Date().toISOString() });
  };
  const complete = () => {
    if (!selected) return;
    const updated = {
      ...selected,
      completedAt: selected.completedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const issues = validateRetestForCompletion(updated);
    setErrors(issues);
    if (!issues.length) {
      setCompletion(updated);
      setProposedStatus(
        outcomeLifecycleSuggestion(updated.verificationOutcome) ?? "manual",
      );
    }
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-800 bg-[#101318] p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Retest Workspace
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Document manually authorized verification. This workspace never
            replays requests or concludes a fix automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="field-group min-w-64">
            <span>Finding</span>
            <select
              className="input-field"
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
            >
              {reports.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.reportReference} · {item.title || "Untitled"}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button-primary"
            type="button"
            disabled={!reportId}
            onClick={() => start()}
          >
            Start Retest
          </button>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2 rounded-lg border border-slate-800 bg-[#101318] p-3">
          <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Retests
          </h3>
          {sorted.length ? (
            sorted.map((item) => (
              <button
                className={`w-full rounded p-3 text-left ${selectedId === item.id ? "bg-cyan-950/50" : "hover:bg-slate-800"}`}
                type="button"
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setErrors([]);
                }}
              >
                <span className="block truncate text-sm font-medium text-slate-200">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.verificationOutcome} ·{" "}
                  {item.completedAt ? "Completed" : "In progress"}
                </span>
              </button>
            ))
          ) : (
            <p className="p-3 text-sm text-slate-500">No retests started.</p>
          )}
        </aside>
        {selected && report ? (
          <main className="space-y-6">
            <section className="editor-section">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-200">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Started {new Date(selected.startedAt).toLocaleString()} ·{" "}
                    {report.reportReference}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => start(selected)}
                  >
                    Duplicate structure
                  </button>
                  {["Remediated", "Closed"].includes(
                    report.lifecycleStatus ?? "",
                  ) && (
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => start(selected, true)}
                    >
                      Record regression
                    </button>
                  )}
                  <button
                    className="button-danger"
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Cancel this draft retest? This does not affect the original finding.",
                        )
                      ) {
                        onDelete(selected);
                        setSelectedId(undefined);
                      }
                    }}
                  >
                    Cancel draft
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="field-group">
                  <span>Retest title</span>
                  <input
                    className="input-field"
                    value={selected.title}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </label>
                <label className="field-group">
                  <span>Current target</span>
                  <input
                    className="input-field"
                    value={selected.targetSnapshot ?? ""}
                    onChange={(event) =>
                      update({
                        targetSnapshot: event.target.value || undefined,
                      })
                    }
                  />
                </label>
                <label className="field-group">
                  <span>Build or version</span>
                  <input
                    className="input-field"
                    value={selected.buildOrVersion ?? ""}
                    onChange={(event) =>
                      update({
                        buildOrVersion: event.target.value || undefined,
                      })
                    }
                  />
                </label>
                <label className="field-group">
                  <span>Environment</span>
                  <input
                    className="input-field"
                    value={selected.environment ?? ""}
                    onChange={(event) =>
                      update({ environment: event.target.value || undefined })
                    }
                  />
                </label>
                <label className="field-group">
                  <span>Tester name</span>
                  <input
                    className="input-field"
                    value={selected.testerName ?? ""}
                    onChange={(event) =>
                      update({ testerName: event.target.value || undefined })
                    }
                  />
                </label>
                <label className="field-group">
                  <span>Verification outcome</span>
                  <select
                    className="input-field"
                    value={selected.verificationOutcome}
                    onChange={(event) =>
                      update({
                        verificationOutcome: event.target
                          .value as VerificationOutcome,
                      })
                    }
                  >
                    {VERIFICATION_OUTCOMES.map((outcome) => (
                      <option key={outcome}>{outcome}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field-group mt-4">
                <span>Current behavior (required to complete)</span>
                <textarea
                  className="input-field min-h-28 resize-y"
                  value={selected.currentBehavior ?? ""}
                  onChange={(event) =>
                    update({ currentBehavior: event.target.value })
                  }
                  placeholder="Observed during retest…"
                />
              </label>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="field-group">
                  <span>Original behavior</span>
                  <textarea
                    className="input-field min-h-24 resize-y"
                    value={selected.originalBehavior ?? ""}
                    onChange={(event) =>
                      update({ originalBehavior: event.target.value })
                    }
                  />
                </label>
                <label className="field-group">
                  <span>Residual impact or risk</span>
                  <textarea
                    className="input-field min-h-24 resize-y"
                    value={selected.residualRisk ?? ""}
                    onChange={(event) =>
                      update({ residualRisk: event.target.value })
                    }
                  />
                </label>
                <label className="field-group lg:col-span-2">
                  <span>Retest notes / current steps</span>
                  <textarea
                    className="input-field min-h-24 resize-y"
                    value={selected.notes ?? ""}
                    onChange={(event) => update({ notes: event.target.value })}
                  />
                </label>
              </div>
            </section>
            <section className="editor-section">
              <h2 className="text-base font-semibold text-slate-200">
                Manual Retest Checklist
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Scope review, current behavior verification, and outcome
                confirmation require manual completion.
              </p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {selected.checklistItems.map((item) => (
                  <label
                    className="flex items-start gap-3 rounded border border-slate-800 bg-[#0d1014] p-3 text-sm"
                    key={item.id}
                  >
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={item.completed}
                      onChange={(event) =>
                        update({
                          checklistItems: selected.checklistItems.map(
                            (current) =>
                              current.id === item.id
                                ? {
                                    ...current,
                                    completed: event.target.checked,
                                  }
                                : current,
                          ),
                        })
                      }
                    />
                    <span className="text-slate-300">
                      {item.label}
                      {item.required && (
                        <span className="ml-1 text-amber-300">(required)</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>
            <section className="editor-section">
              <h2 className="text-base font-semibold text-slate-200">
                Links and Evidence
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Evidence is recommended but not mandatory. Link only records
                already captured locally; no requests are replayed.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <fieldset>
                  <legend className="text-xs uppercase tracking-wide text-slate-500">
                    Report evidence
                  </legend>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded border border-slate-800 p-3">
                    {report.evidenceItems.length ? (
                      report.evidenceItems.map((item) => (
                        <label
                          className="flex items-center gap-2 text-sm text-slate-300"
                          key={item.id}
                        >
                          <input
                            type="checkbox"
                            checked={selected.evidenceIds.includes(item.id)}
                            onChange={(event) =>
                              update({
                                evidenceIds: event.target.checked
                                  ? [...selected.evidenceIds, item.id]
                                  : selected.evidenceIds.filter(
                                      (id) => id !== item.id,
                                    ),
                              })
                            }
                          />
                          {item.title}
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No report evidence available.
                      </p>
                    )}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-xs uppercase tracking-wide text-slate-500">
                    Assets
                  </legend>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded border border-slate-800 p-3">
                    {assets
                      .filter((asset) => !asset.archivedAt)
                      .map((asset) => (
                        <label
                          className="flex items-center gap-2 text-sm text-slate-300"
                          key={asset.id}
                        >
                          <input
                            type="checkbox"
                            checked={selected.linkedAssetIds.includes(asset.id)}
                            onChange={(event) =>
                              update({
                                linkedAssetIds: event.target.checked
                                  ? [...selected.linkedAssetIds, asset.id]
                                  : selected.linkedAssetIds.filter(
                                      (id) => id !== asset.id,
                                    ),
                              })
                            }
                          />
                          {asset.name || asset.value}
                        </label>
                      ))}
                    {!assets.length && (
                      <p className="text-sm text-slate-500">
                        No assets recorded in this workspace.
                      </p>
                    )}
                  </div>
                </fieldset>
              </div>
              {!selected.evidenceIds.length && (
                <p className="mt-3 rounded border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-200">
                  No new evidence is linked. You can complete the retest, but
                  attach appropriate evidence when available.
                </p>
              )}
              {!selected.targetSnapshot && !selected.buildOrVersion && (
                <p className="mt-3 rounded border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-200">
                  Document a target or build/version before relying on this
                  verification record.
                </p>
              )}
              {report.redactionScanSummary?.unresolvedHighConfidenceCount ? (
                <p className="mt-3 rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">
                  The original report has unresolved high-confidence
                  sensitive-data findings. Review redaction before sharing
                  retest material.
                </p>
              ) : null}
            </section>
            {errors.length > 0 && (
              <section
                className="rounded border border-red-900 bg-red-950/30 p-4"
                aria-live="polite"
              >
                <h2 className="font-medium text-red-200">
                  Retest cannot be completed yet
                </h2>
                <ul className="mt-2 list-disc pl-5 text-sm text-red-100">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </section>
            )}
            <div className="flex justify-end">
              <button
                className="button-primary"
                type="button"
                onClick={complete}
              >
                Complete Retest and Review Lifecycle
              </button>
            </div>
            <RemediationComparison
              report={report}
              retest={selected}
              onSaveNote={(summary) => onSaveComparisonNote(report, summary)}
            />
          </main>
        ) : (
          <main className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
            Select or start a retest to document manual verification.
          </main>
        )}
      </div>
      {completion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-[#161a20] p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="retest-complete-title"
          >
            <h2
              id="retest-complete-title"
              className="text-lg font-semibold text-slate-100"
            >
              Review proposed lifecycle change
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Outcome: {completion.verificationOutcome}. The proposed status is
              a suggestion only and will not be applied without your
              confirmation.
            </p>
            <label className="field-group mt-4">
              <span>Lifecycle after retest</span>
              <select
                className="input-field"
                value={proposedStatus}
                onChange={(event) =>
                  setProposedStatus(
                    event.target.value as FindingLifecycleStatus | "manual",
                  )
                }
              >
                <option value="manual">
                  Keep lifecycle unchanged (manual review)
                </option>
                {(
                  [
                    "Ready for Retest",
                    "Retesting",
                    "Remediated",
                    "Partially Remediated",
                    "Not Remediated",
                    "Needs More Information",
                  ] as FindingLifecycleStatus[]
                ).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setCompletion(undefined)}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={() => {
                  onComplete(
                    completion,
                    proposedStatus === "manual" ? undefined : proposedStatus,
                  );
                  setCompletion(undefined);
                }}
              >
                Complete retest
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
