import type { Report } from "../../types/report";
import { compareReports } from "../../utils/reportSimilarity";
export function SimilarityPanel({
  report,
  reports,
  onOpen,
  onNotify,
}: {
  report: Report;
  reports: Report[];
  onOpen: (report: Report) => void;
  onNotify: (type: "success" | "error" | "warning", message: string) => void;
}) {
  const candidates = reports
    .filter((item) => item.id !== report.id && !item.archivedAt)
    .map((item) => ({ report: item, result: compareReports(report, item) }))
    .filter((item) => item.result.score >= 40)
    .sort((a, b) => b.result.score - a.result.score);
  return (
    <section className="editor-section" id="similarity">
      <div className="section-heading">
        <span>12</span>
        <div>
          <h2>Possible Duplicate Reports</h2>
          <p>
            Deterministic local similarity only; reports are never automatically
            marked duplicate.
          </p>
        </div>
      </div>
      <button
        className="button-secondary"
        type="button"
        onClick={() =>
          onNotify(
            "success",
            `Similarity scan completed: ${candidates.length} possible overlap(s).`,
          )
        }
      >
        Check Similar Reports
      </button>
      {candidates.length > 0 && (
        <div className="mt-4 space-y-2">
          {candidates.slice(0, 8).map(({ report: candidate, result }) => (
            <article
              className="rounded border border-slate-800 bg-[#0d1014] p-3"
              key={candidate.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-200">
                    {candidate.reportReference} ·{" "}
                    {candidate.title || "Untitled"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {result.level} · {result.matchingFields.join(", ")}
                  </p>
                </div>
                <span className="font-mono text-cyan-300">{result.score}%</span>
              </div>
              <button
                className="table-action mt-2"
                type="button"
                onClick={() => onOpen(candidate)}
              >
                Open Other Report
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
