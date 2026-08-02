import type { SanitizationMode, SanitizationProfile, SanitizedReportCopy } from "../types/phase6";
import type { Report } from "../types/report";
import { scanReportText } from "./redactionScanner";
import { generateReportId } from "./reportHelpers";

const values = (report: Report): Array<[string, string, string]> => [["Program name", report.programName, "[PROGRAM]"], ["Target", report.target, "example.com"], ["Endpoint", report.vulnerableEndpoint, "/redacted-endpoint"], ["Submission ID", report.submissionDetails.submissionId ?? "", "[SUBMISSION_ID]"], ["Program URL", report.submissionDetails.submissionUrl ?? "", "[PROGRAM_URL]"], ["Researcher", report.researcherName, "Researcher"], ["Analyst", report.submissionDetails.analystName ?? "", "Triager"]];
function replaceWhole(value: string, source: string, replacement: string): string { if (!source) return value; const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const wordBoundary = /^[\w.-]+$/.test(source); return value.replace(new RegExp(`${wordBoundary ? "\\b" : ""}${escaped}${wordBoundary ? "\\b" : ""}`, "gi"), replacement); }
export function createSanitizationProfile(report: Report, mode: SanitizationMode): SanitizationProfile { const now = new Date().toISOString(); const replacements = values(report).filter(([, source]) => source).map(([category, source, replacement]) => ({ id: generateReportId(), category, source, replacement, enabled: mode !== "Minimal" || ["Program name", "Target", "Endpoint", "Submission ID"].includes(category) })); if (mode === "Strict") replacements.push({ id: generateReportId(), category: "Internal hostname", source: "", replacement: "[INTERNAL_HOST]", enabled: true }, { id: generateReportId(), category: "Date", source: "", replacement: "[DATE REDACTED]", enabled: true }); return { id: generateReportId(), name: `${mode} profile — ${report.title || report.reportReference}`, mode, replacements, createdAt: now, updatedAt: now }; }
function sanitizeText(value: string, profile: SanitizationProfile): string { let output = value; for (const item of profile.replacements.filter((item) => item.enabled && item.source)) output = replaceWhole(output, item.source, item.replacement); if (profile.mode === "Strict") { output = output.replace(/\b(?:[a-z0-9-]+\.)+(?:internal|local|corp|lan)\b/gi, "[INTERNAL_HOST]").replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[IP_ADDRESS]").replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]"); } return output; }
export function createSanitizedCopy(report: Report, profile: SanitizationProfile): SanitizedReportCopy {
  const copy = structuredClone(report);
  const fields: Array<keyof Report> = ["title", "programName", "target", "vulnerableEndpoint", "summary", "description", "prerequisites", "reproductionSteps", "impact", "evidence", "remediation", "researcherName", "affectedAsset", "testingEnvironment", "vulnerabilityType", "vulnerabilityClass"];
  fields.forEach((field) => {
    const value = copy[field];
    if (typeof value === "string") (copy[field] as string) = sanitizeText(value, profile);
  });
  copy.structuredSteps = copy.structuredSteps.map((step) => ({
    ...step,
    title: sanitizeText(step.title, profile),
    instruction: sanitizeText(step.instruction, profile),
    expectedResult: step.expectedResult ? sanitizeText(step.expectedResult, profile) : undefined,
    actualResult: step.actualResult ? sanitizeText(step.actualResult, profile) : undefined,
  }));
  copy.references = copy.references.map((reference) => ({ ...reference, label: sanitizeText(reference.label, profile), url: sanitizeText(reference.url, profile) }));
  copy.disclosureTimeline = copy.disclosureTimeline.map((item) => ({ ...item, event: sanitizeText(item.event, profile) }));
  copy.reportReference = "[REPORT_REFERENCE]";
  copy.submissionDetails = { ...copy.submissionDetails, programName: "[PROGRAM]", submissionId: "[SUBMISSION_ID]", submissionUrl: undefined, analystName: "Triager", bountyAmount: undefined, notes: copy.submissionDetails.notes ? sanitizeText(copy.submissionDetails.notes, profile) : undefined };
  copy.evidenceItems = copy.evidenceItems.map((item, index) => ({ ...item, title: `Evidence ${index + 1}`, fileName: undefined, description: item.description ? sanitizeText(item.description, profile) : undefined, sourceUrl: undefined }));
  const scanCount = scanReportText({ title: copy.title, summary: copy.summary, description: copy.description, impact: copy.impact, evidence: copy.evidence }).length;
  return { report: copy, profile, scanCount, warnings: report.evidenceItems.some((item) => item.type === "image") ? ["Image evidence is excluded by default. Manually sanitize screenshots before including a selected revision."] : [] };
}
