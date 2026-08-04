import type { Report } from "../types/report";

export type SubmissionPreset =
  | "Generic"
  | "HackerOne"
  | "Bugcrowd"
  | "Intigriti"
  | "YesWeHack"
  | "Direct Email";

function steps(report: Report): string {
  return report.structuredSteps.length
    ? report.structuredSteps
        .map(
          (step, index) =>
            `${index + 1}. ${step.title ? `${step.title}: ` : ""}${step.instruction}${step.expectedResult ? `\n   Expected: ${step.expectedResult}` : ""}${step.actualResult ? `\n   Actual: ${step.actualResult}` : ""}`,
        )
        .join("\n")
    : report.reproductionSteps;
}

function evidence(report: Report): string {
  return (
    report.evidenceItems
      .map(
        (item) =>
          `- ${item.title}${item.description ? `: ${item.description}` : ""}${item.sourceUrl ? ` (${item.sourceUrl})` : ""}`,
      )
      .join("\n") || report.evidence
  );
}

export function createSubmissionContent(
  report: Report,
  preset: SubmissionPreset,
): string {
  const base = `Title: ${report.title}\n\nSummary\n${report.summary}\n\nTarget\n${report.target || report.affectedAsset}\n\nVulnerability Type\n${report.vulnerabilityType}\n\nSeverity / CVSS\n${report.severity}${report.cvssScore ? ` (${report.cvssScore})` : ""}${report.cvssVector ? `\n${report.cvssVector}` : ""}\n\nDescription\n${report.description}\n\nSteps to Reproduce\n${steps(report)}\n\nImpact\n${report.impact}\n\nEvidence\n${evidence(report)}\n\nRecommended Remediation\n${report.remediation}${report.references.length ? `\n\nReferences\n${report.references.map((item) => `- ${item.label}: ${item.url}`).join("\n")}` : ""}`;
  if (preset === "Direct Email")
    return `Subject: Vulnerability report — ${report.title}\n\nHello ${report.programName || "Security Team"},\n\nI am reporting a potential security issue identified within the authorized scope of your program. A concise summary follows:\n\n${base}\n\nThank you for reviewing this report. I am happy to provide additional authorized testing details if needed.\n\nRegards,\n${report.researcherName || "Security Researcher"}`;
  if (preset === "HackerOne")
    return `## Summary\n${report.summary}\n\n## Steps To Reproduce\n${steps(report)}\n\n## Impact\n${report.impact}\n\n## Supporting Details\nTarget: ${report.target}\nType: ${report.vulnerabilityType}\nSeverity: ${report.severity}\nCVSS: ${report.cvssScore}\n\n## Remediation\n${report.remediation}\n\n## Evidence\n${evidence(report)}`;
  if (preset === "Bugcrowd")
    return `Vulnerability Title\n${report.title}\n\nVulnerability Details\n${report.description}\n\nProof of Concept\n${steps(report)}\n\nBusiness Impact\n${report.impact}\n\nRecommendation\n${report.remediation}\n\n${evidence(report)}`;
  if (preset === "Intigriti" || preset === "YesWeHack")
    return `# ${report.title}\n\n## Summary\n${report.summary}\n\n## Affected Asset\n${report.target || report.affectedAsset}\n\n## Reproduction\n${steps(report)}\n\n## Impact\n${report.impact}\n\n## Remediation\n${report.remediation}\n\n## Evidence\n${evidence(report)}`;
  return base;
}

export function downloadPlainText(text: string, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
