import type { Report } from "../types/report";
import type { ExportPreferences } from "../types/settings";
import { formatUpdatedAt } from "./reportHelpers";

function section(title: string, value: string): string {
  return value.trim() ? `\n## ${title}\n\n${value.trim()}\n` : "";
}

export function createReportMarkdown(report: Report, preferences: ExportPreferences): string {
  const metadata = [
    ["Reference", report.reportReference], ["Status", report.status], ["Prepared by", report.researcherName],
    ["Program", report.programName], ["Platform", report.platform], ["Target", report.target], ["Affected asset", report.affectedAsset],
    ["Vulnerable endpoint", report.vulnerableEndpoint], ["Vulnerability type", report.vulnerabilityType], ["Vulnerability class", report.vulnerabilityClass],
    ["Severity", report.severity], ["CVSS score", report.cvssScore], ["CVSS vector", report.cvssVector],
    ["Created", formatUpdatedAt(report.createdAt)], ["Updated", formatUpdatedAt(report.updatedAt)], ["Discovered", report.discoveredAt],
  ].filter(([, value]) => value).map(([label, value]) => `- **${label}:** ${value}`).join("\n");
  const steps = report.structuredSteps.length
    ? report.structuredSteps.map((step, index) => `${index + 1}. **${step.title || `Step ${index + 1}`}**\n   ${step.instruction}${step.expectedResult ? `\n   - Expected: ${step.expectedResult}` : ""}${step.actualResult ? `\n   - Actual: ${step.actualResult}` : ""}`).join("\n")
    : report.reproductionSteps;
  const evidence = report.evidenceItems.map((item) => `- **${item.title}** (${item.type})${item.description && preferences.includeEvidenceDescriptions ? `: ${item.description}` : ""}${item.sourceUrl ? ` — ${item.sourceUrl}` : ""}`).join("\n");
  const references = report.references.map((item) => `- [${item.label}](${item.url})`).join("\n");
  const timeline = report.disclosureTimeline.map((item) => `- ${item.date ? `${item.date}: ` : ""}${item.event}`).join("\n");
  return `# ${report.title || "Untitled report"}\n\n${metadata}${section("Executive Summary", report.summary)}${section("Technical Description", report.description)}${section("Prerequisites", report.prerequisites)}${section("Steps to Reproduce", steps)}${section("Security Impact", report.impact)}${section("Evidence", `${report.evidence}${report.evidence && evidence ? "\n\n" : ""}${evidence}`)}${section("Recommended Remediation", report.remediation)}${preferences.includeReferences ? section("References", references) : ""}${preferences.includeDisclosureTimeline ? section("Disclosure Timeline", timeline) : ""}`.trim() + "\n";
}

export function safeMarkdownFilename(title: string): string {
  const filename = title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${filename || "bug-bounty-report"}.md`;
}

export function downloadMarkdown(markdown: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
