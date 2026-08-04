import { useEffect, useMemo, useState } from "react";
import type { EvidenceItem, Report } from "../../types/report";
import type { AppSettings } from "../../types/settings";
import {
  createReportMarkdown,
  downloadMarkdown,
  safeMarkdownFilename,
} from "../../utils/markdownExport";
import { getEvidenceFile } from "../../utils/evidenceDatabase";
import { formatUpdatedAt } from "../../utils/reportHelpers";

interface ReportPreviewDocumentProps {
  report: Report;
  settings: AppSettings;
  onBack: () => void;
  onNotify: (type: "success" | "error" | "warning", message: string) => void;
  overlay?: boolean;
  onPrepareSubmission?: (report: Report) => void;
}

function textSection(title: string, id: string, value: string, number: number) {
  if (!value.trim()) return null;
  return (
    <section className="report-section" id={id} key={id}>
      <h2>
        <span>{String(number).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="report-prose whitespace-pre-wrap">{value}</div>
    </section>
  );
}

function EvidenceContent({ items }: { items: EvidenceItem[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    const load = async () => {
      const images: Record<string, string> = {};
      for (const item of items.filter((entry) => entry.type === "image")) {
        try {
          const file = await getEvidenceFile(item.id);
          if (file) {
            const url = URL.createObjectURL(file.blob);
            images[item.id] = url;
            created.push(url);
          }
        } catch {
          /* Metadata still renders if IndexedDB is unavailable. */
        }
      }
      if (active) setUrls(images);
    };
    void load();
    return () => {
      active = false;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [items]);
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article className="report-evidence" key={item.id}>
          <h3>{item.title}</h3>
          {item.type === "image" &&
            (urls[item.id] ? (
              <img
                className="mt-3 max-h-120 rounded border border-slate-300"
                src={urls[item.id]}
                alt={item.title}
              />
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Attachment unavailable in this browser.
              </p>
            ))}
          {item.type === "url" && item.sourceUrl && (
            <a
              className="mt-2 inline-block break-all text-blue-700 underline"
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {item.sourceUrl}
            </a>
          )}
          {item.description && (
            <pre
              className={
                item.type === "text"
                  ? "report-code"
                  : "report-prose mt-2 whitespace-pre-wrap"
              }
            >
              {item.description}
            </pre>
          )}
        </article>
      ))}
    </div>
  );
}

export function ReportPreviewDocument({
  report,
  settings,
  onBack,
  onNotify,
  overlay = false,
  onPrepareSubmission,
}: ReportPreviewDocumentProps) {
  const markdown = useMemo(
    () => createReportMarkdown(report, settings.exportPreferences),
    [report, settings.exportPreferences],
  );
  const sections = [
    ["Executive Summary", "summary", report.summary],
    ["Technical Description", "description", report.description],
    ["Prerequisites", "prerequisites", report.prerequisites],
    [
      "Steps to Reproduce",
      "steps",
      report.structuredSteps.length || report.reproductionSteps,
    ],
    ["Security Impact", "impact", report.impact],
    ["Evidence", "evidence", report.evidence || report.evidenceItems.length],
    ["Recommended Remediation", "remediation", report.remediation],
    [
      "References",
      "references",
      settings.exportPreferences.includeReferences && report.references.length,
    ],
    [
      "Disclosure Timeline",
      "timeline",
      settings.exportPreferences.includeDisclosureTimeline &&
        report.disclosureTimeline.length,
    ],
  ].filter((section) => Boolean(section[2])) as Array<
    [string, string, string | number | boolean]
  >;
  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      onNotify("success", "Markdown copied to the clipboard.");
    } catch {
      onNotify(
        "error",
        "Markdown could not be copied. Your browser may block clipboard access.",
      );
    }
  };
  let sectionNumber = 1;
  const nextNumber = () => sectionNumber++;
  const numberedTextSection = (title: string, id: string, value: string) =>
    value.trim() ? textSection(title, id, value, nextNumber()) : null;
  const renderSteps = () => {
    if (!report.structuredSteps.length && !report.reproductionSteps.trim())
      return null;
    const index = nextNumber();
    return (
      <section className="report-section" id="steps">
        <h2>
          <span>{String(index).padStart(2, "0")}</span>Steps to Reproduce
        </h2>
        {report.structuredSteps.length ? (
          <ol className="space-y-4">
            {report.structuredSteps.map((step, stepIndex) => (
              <li className="report-step" key={step.id}>
                <h3>
                  {stepIndex + 1}. {step.title || `Step ${stepIndex + 1}`}
                </h3>
                <p className="report-prose whitespace-pre-wrap">
                  {step.instruction}
                </p>
                {step.expectedResult && (
                  <p className="mt-3 text-sm">
                    <strong>Expected result:</strong> {step.expectedResult}
                  </p>
                )}
                {step.actualResult && (
                  <p className="mt-2 text-sm">
                    <strong>Actual result:</strong> {step.actualResult}
                  </p>
                )}
                {step.evidenceIds.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Evidence:{" "}
                    {step.evidenceIds
                      .map(
                        (id) =>
                          report.evidenceItems.find((item) => item.id === id)
                            ?.title,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <div className="report-prose whitespace-pre-wrap">
            {report.reproductionSteps}
          </div>
        )}
      </section>
    );
  };
  const renderEvidence = () => {
    if (!report.evidence.trim() && !report.evidenceItems.length) return null;
    const index = nextNumber();
    return (
      <section className="report-section" id="evidence">
        <h2>
          <span>{String(index).padStart(2, "0")}</span>Evidence
        </h2>
        {report.evidence.trim() && (
          <div className="report-prose mb-5 whitespace-pre-wrap">
            {report.evidence}
          </div>
        )}
        {report.evidenceItems.length > 0 && (
          <EvidenceContent items={report.evidenceItems} />
        )}
      </section>
    );
  };

  const document = (
    <article className="report-document">
      <header className="report-header">
        <div>
          <p className="report-eyebrow">Vulnerability Report</p>
          <h1>{report.title || "Untitled Report"}</h1>
        </div>
        <div className="text-right">
          {settings.exportPreferences.includeReportReferenceInHeader && (
            <p className="font-mono text-sm font-semibold text-slate-700">
              {report.reportReference}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-500">{report.status}</p>
        </div>
      </header>
      <section className="report-metadata">
        <dl>
          {[
            ["Prepared by", report.researcherName],
            ["Program", report.programName],
            ["Platform", report.platform],
            ["Target", report.target],
            ["Affected asset", report.affectedAsset],
            ["Vulnerable endpoint", report.vulnerableEndpoint],
            ["Vulnerability type", report.vulnerabilityType],
            ["Vulnerability class", report.vulnerabilityClass],
            ["CVSS score", report.cvssScore],
            ["CVSS vector", report.cvssVector],
            ["Created", formatUpdatedAt(report.createdAt)],
            ["Updated", formatUpdatedAt(report.updatedAt)],
            ["Discovered", report.discoveredAt],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        <div
          className={`report-severity report-severity-${report.severity.toLowerCase()}`}
        >
          <span>Severity</span>
          <strong>{report.severity}</strong>
        </div>
      </section>
      <nav className="report-toc" aria-label="Report table of contents">
        <h2>Table of Contents</h2>
        <ol>
          {sections.map(([title, id], index) => (
            <li key={id}>
              <a href={`#${id}`}>
                {String(index + 1).padStart(2, "0")} {title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {numberedTextSection("Executive Summary", "summary", report.summary)}
      {numberedTextSection(
        "Technical Description",
        "description",
        report.description,
      )}
      {numberedTextSection(
        "Prerequisites",
        "prerequisites",
        report.prerequisites,
      )}
      {renderSteps()}
      {numberedTextSection("Security Impact", "impact", report.impact)}
      {renderEvidence()}
      {numberedTextSection(
        "Recommended Remediation",
        "remediation",
        report.remediation,
      )}
      {settings.exportPreferences.includeReferences &&
        report.references.length > 0 && (
          <section className="report-section" id="references">
            <h2>
              <span>{String(nextNumber()).padStart(2, "0")}</span>References
            </h2>
            <ul className="report-prose list-disc space-y-2 pl-5">
              {report.references.map((reference) => (
                <li key={reference.id}>
                  <a
                    className="text-blue-700 underline"
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {reference.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      {settings.exportPreferences.includeDisclosureTimeline &&
        report.disclosureTimeline.length > 0 && (
          <section className="report-section" id="timeline">
            <h2>
              <span>{String(nextNumber()).padStart(2, "0")}</span>Disclosure
              Timeline
            </h2>
            <ul className="report-prose space-y-2">
              {report.disclosureTimeline.map((item) => (
                <li key={item.id}>
                  <strong>{item.date || "Undated"}</strong> — {item.event}
                </li>
              ))}
            </ul>
          </section>
        )}
      <footer className="report-print-footer">
        {settings.exportPreferences.includeReportReferenceInHeader &&
          report.reportReference}
        {settings.exportPreferences.includeReportReferenceInHeader &&
          settings.exportPreferences.includeResearcherNameInFooter &&
          " · "}
        {settings.exportPreferences.includeResearcherNameInFooter &&
          report.researcherName}
      </footer>
    </article>
  );
  return (
    <div
      className={
        overlay
          ? "report-preview-shell report-preview-overlay"
          : "report-preview-shell"
      }
    >
      <div className="report-preview-controls">
        <button className="button-secondary" type="button" onClick={onBack}>
          ← Back
        </button>
        <div className="flex flex-wrap gap-2">
          {onPrepareSubmission && (
            <button
              className="button-secondary"
              type="button"
              onClick={() => onPrepareSubmission(report)}
            >
              Prepare Submission
            </button>
          )}
          <button
            className="button-secondary"
            type="button"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              downloadMarkdown(markdown, safeMarkdownFilename(report.title));
              onNotify("success", "Markdown download started.");
            }}
          >
            Download Markdown
          </button>
          <button
            className="button-primary"
            type="button"
            onClick={() => void copyMarkdown()}
          >
            Copy Markdown
          </button>
        </div>
      </div>
      {document}
    </div>
  );
}
