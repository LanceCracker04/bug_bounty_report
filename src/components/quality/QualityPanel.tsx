import { useState } from "react";
import type { Report, ReportQualityResult } from "../../types/report";

interface QualityPanelProps {
  report: Report;
  onRun: () => void;
  onReviewIssue: (issueId: string) => void;
  onGoTo: (section?: string) => void;
}

const gradeStyle: Record<ReportQualityResult["grade"], string> = {
  Excellent: "text-emerald-300",
  Good: "text-cyan-300",
  "Needs Work": "text-amber-300",
  Incomplete: "text-red-300",
};

export function QualityPanel({
  report,
  onRun,
  onReviewIssue,
  onGoTo,
}: QualityPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const result = report.qualityResult;
  const issues = result?.issues ?? [];
  const counts = {
    error: issues.filter((item) => item.severity === "error").length,
    warning: issues.filter((item) => item.severity === "warning").length,
    suggestion: issues.filter((item) => item.severity === "suggestion").length,
  };
  return (
    <section className="editor-section" id="quality">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="section-index">07</span>
            <h2 className="text-base font-semibold text-slate-200">
              Report Quality
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Deterministic checks help improve clarity and submission readiness.
            A high score does not guarantee acceptance.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="button-secondary"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <button className="button-primary" type="button" onClick={onRun}>
            {result ? "Re-run Check" : "Run Quality Check"}
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          {result ? (
            <div className="mt-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <article className="rounded-md border border-slate-700 bg-[#0d1014] p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Score
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">
                    {result.score}
                    <span className="text-sm text-slate-500">/100</span>
                  </p>
                </article>
                <article className="rounded-md border border-slate-700 bg-[#0d1014] p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Grade
                  </p>
                  <p
                    className={`mt-2 font-semibold ${gradeStyle[result.grade]}`}
                  >
                    {result.grade}
                  </p>
                </article>
                <article className="rounded-md border border-slate-700 bg-[#0d1014] p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Blocking errors
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">
                    {counts.error}
                  </p>
                </article>
                <article className="rounded-md border border-slate-700 bg-[#0d1014] p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Checked
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {new Date(result.checkedAt).toLocaleString()}
                  </p>
                </article>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <span className="rounded border border-red-900 bg-red-950/50 px-2 py-1 text-red-300">
                  Errors: {counts.error}
                </span>
                <span className="rounded border border-amber-900 bg-amber-950/50 px-2 py-1 text-amber-300">
                  Warnings: {counts.warning}
                </span>
                <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300">
                  Suggestions: {counts.suggestion}
                </span>
              </div>
              <div className="mt-5 space-y-2">
                {issues.length ? (
                  issues.map((item) => (
                    <article
                      className="flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-[#0d1014] px-3 py-3 text-sm"
                      key={item.id}
                    >
                      <span
                        className={`badge ${item.severity === "error" ? "border-red-900 bg-red-950/60 text-red-300" : item.severity === "warning" ? "border-amber-900 bg-amber-950/60 text-amber-300" : "border-slate-700 bg-slate-800 text-slate-300"}`}
                      >
                        {item.severity}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {item.category}
                      </span>
                      <p className="min-w-48 flex-1 text-slate-300">
                        {item.message}
                        {item.reviewed && (
                          <span className="ml-2 text-emerald-400">
                            Reviewed
                          </span>
                        )}
                      </p>
                      {item.section && (
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => onGoTo(item.section)}
                        >
                          Go to Section
                        </button>
                      )}
                      <button
                        className="table-action"
                        type="button"
                        disabled={item.reviewed}
                        onClick={() => onReviewIssue(item.id)}
                      >
                        {item.reviewed ? "Reviewed" : "Mark Reviewed"}
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="rounded border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-300">
                    No quality issues were found by the current local rules.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-slate-700 p-5 text-sm text-slate-500">
              Run the local checker when you are ready to review report
              completeness, clarity, evidence, and submission consistency.
            </div>
          )}
        </>
      )}
    </section>
  );
}
