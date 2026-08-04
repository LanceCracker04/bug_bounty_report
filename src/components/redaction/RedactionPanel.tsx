import { useMemo, useState } from "react";
import type { Report } from "../../types/report";
import {
  scanReportText,
  maskText,
  type RedactionFinding,
} from "../../utils/redactionScanner";
export function RedactionPanel({
  report,
  onApply,
  onNotify,
}: {
  report: Report;
  onApply: (section: string, value: string) => void;
  onNotify: (type: "success" | "error" | "warning", message: string) => void;
}) {
  const [findings, setFindings] = useState<RedactionFinding[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fields = useMemo(
    () => ({
      summary: report.summary,
      description: report.description,
      prerequisites: report.prerequisites,
      reproductionSteps: report.reproductionSteps,
      impact: report.impact,
      evidence: report.evidence,
      remediation: report.remediation,
    }),
    [report],
  );
  const scan = () => {
    const next = scanReportText(fields);
    setFindings(next);
    setSelected(new Set(next.map((item) => item.id)));
    onNotify(
      "success",
      `Sensitive-data scan completed: ${next.length} possible finding(s).`,
    );
  };
  const apply = () => {
    for (const section of new Set(
      findings
        .filter((item) => selected.has(item.id))
        .map((item) => item.section),
    )) {
      const sectionFindings = findings.filter(
        (item) => selected.has(item.id) && item.section === section,
      );
      onApply(
        section,
        maskText(fields[section as keyof typeof fields], sectionFindings),
      );
    }
    setFindings([]);
    onNotify(
      "success",
      "Selected redactions applied. Uploaded images were not changed.",
    );
  };
  return (
    <section className="editor-section" id="redaction">
      <div className="section-heading">
        <span>11</span>
        <div>
          <h2>Sensitive Data Scan</h2>
          <p>
            Possible sensitive content is masked for review. Findings are not
            confirmed secrets.
          </p>
        </div>
      </div>
      <button className="button-secondary" type="button" onClick={scan}>
        Run Sensitive Data Scan
      </button>
      {findings.length > 0 && (
        <div className="mt-4 space-y-2">
          {findings.map((finding) => (
            <label
              className="flex items-center gap-3 rounded border border-slate-800 bg-[#0d1014] p-3 text-sm"
              key={finding.id}
            >
              <input
                type="checkbox"
                checked={selected.has(finding.id)}
                onChange={(event) =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(finding.id);
                    else next.delete(finding.id);
                    return next;
                  })
                }
              />
              <span className="flex-1 text-slate-300">
                {finding.category} · {finding.confidence} · {finding.section}
                <span className="ml-2 font-mono text-xs text-slate-500">
                  {finding.maskedPreview}
                </span>
                <span className="block text-xs text-slate-500">
                  {finding.explanation}
                </span>
              </span>
            </label>
          ))}
          <button
            className="button-danger"
            type="button"
            disabled={!selected.size}
            onClick={apply}
          >
            Apply Selected Redactions
          </button>
        </div>
      )}
    </section>
  );
}
