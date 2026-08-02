import type { ChecklistItem, QualityCategory, QualityGrade, QualityIssue, Report, ReportQualityResult, SubmissionPlatform } from "../types/report";
import { severityFromCvss } from "./cvss";

const manualChecklistIds = new Set(["authorized-scope", "sensitive-info", "preview-reviewed"]);

const checklistDefinitions: Array<{ id: string; label: string; required: boolean; complete: (report: Report) => boolean }> = [
  { id: "title", label: "Report title is present", required: true, complete: (report) => Boolean(report.title.trim()) },
  { id: "program", label: "Program name is present", required: true, complete: (report) => Boolean(report.programName.trim()) },
  { id: "target", label: "Target or affected asset is present", required: true, complete: (report) => Boolean(report.target.trim() || report.affectedAsset.trim()) },
  { id: "endpoint", label: "Vulnerable endpoint is identified", required: true, complete: (report) => Boolean(report.vulnerableEndpoint.trim()) },
  { id: "vulnerability", label: "Vulnerability type is present", required: true, complete: (report) => Boolean(report.vulnerabilityType.trim()) },
  { id: "severity", label: "Severity is selected", required: true, complete: (report) => Boolean(report.severity) },
  { id: "summary", label: "Executive summary is complete", required: true, complete: (report) => report.summary.trim().length >= 30 },
  { id: "description", label: "Technical description is complete", required: true, complete: (report) => report.description.trim().length >= 60 },
  { id: "reproduction", label: "At least one reproduction step exists", required: true, complete: (report) => report.structuredSteps.some((step) => step.instruction.trim()) || report.reproductionSteps.trim().length >= 20 },
  { id: "impact", label: "Security impact is explained", required: true, complete: (report) => report.impact.trim().length >= 30 },
  { id: "remediation", label: "Recommended remediation is included", required: true, complete: (report) => report.remediation.trim().length >= 30 },
  { id: "cvss", label: "CVSS score has been reviewed", required: true, complete: (report) => !Number.isNaN(Number(report.cvssScore)) && Number(report.cvssScore) >= 0 && Number(report.cvssScore) <= 10 },
  { id: "evidence", label: "Evidence has been reviewed", required: true, complete: (report) => Boolean(report.evidence.trim() || report.evidenceItems.length) },
  { id: "sensitive-info", label: "Sensitive personal information has been removed", required: true, complete: () => false },
  { id: "authorized-scope", label: "Testing was performed within authorized scope", required: true, complete: () => false },
  { id: "preview-reviewed", label: "Report preview has been reviewed", required: true, complete: () => false },
];

export function platformFromText(value: string): SubmissionPlatform {
  return (["HackerOne", "Bugcrowd", "Intigriti", "YesWeHack", "Private Program", "Direct Email", "Other"] as const).includes(value as SubmissionPlatform) ? value as SubmissionPlatform : "Other";
}

export function synchronizeChecklist(report: Report): ChecklistItem[] {
  const stored = new Map(report.submissionChecklist.map((item) => [item.id, item]));
  const system = checklistDefinitions.map((definition) => {
    const existing = stored.get(definition.id);
    return { id: definition.id, label: definition.label, required: definition.required, source: "system" as const, completed: manualChecklistIds.has(definition.id) ? existing?.completed === true : definition.complete(report) };
  });
  const custom = report.submissionChecklist.filter((item) => item.source === "custom" && item.label.trim()).map((item) => ({ ...item, source: "custom" as const }));
  return [...system, ...custom];
}

function issue(id: string, category: QualityCategory, severity: QualityIssue["severity"], message: string, section?: string): QualityIssue {
  return { id, category, severity, message, section };
}

function containsPlaceholder(value: string): boolean { return /\b(todo|tba|add details|insert screenshot|lorem ipsum|example text)\b/i.test(value); }
function validUrl(value: string): boolean { try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }

export function gradeFromScore(score: number): QualityGrade { return score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs Work" : "Incomplete"; }

export function runReportQualityCheck(report: Report, missingImageIds: string[] = []): ReportQualityResult {
  const issues: QualityIssue[] = [];
  let score = 100;
  const deduct = (amount: number, item: QualityIssue) => { score -= amount; issues.push(item); };
  ([
    ["title", report.title, "Missing title"], ["program", report.programName, "Missing program name"], ["target", report.target || report.affectedAsset, "Missing target or affected asset"], ["vulnerability", report.vulnerabilityType, "Missing vulnerability type"], ["severity", report.severity, "Missing severity"],
  ] as Array<[string, string, string]>).forEach(([id, value, message]) => { if (!value.trim()) deduct(3, issue(`required-${id}`, "Required Field", "error", message, "report-details")); });
  if (report.summary.trim().length < 40) deduct(8, issue("summary-short", "Clarity", "warning", "Executive summary is extremely short.", "report-content"));
  if (report.description.trim().length < 80) deduct(12, issue("description-short", "Clarity", "warning", "Technical description is extremely short.", "report-content"));
  [report.summary, report.description, report.impact, report.remediation].forEach((value, index) => { if (containsPlaceholder(value)) deduct(4, issue(`placeholder-${index}`, "Clarity", "warning", "Placeholder text should be replaced before submission.", "report-content")); });
  const structured = report.structuredSteps;
  if (!structured.length && report.reproductionSteps.trim().length < 30) deduct(20, issue("no-steps", "Reproduction", "error", "No usable reproduction steps are present.", "reproduction-workflow"));
  if (structured.some((step) => step.instruction.trim().length < 15)) deduct(6, issue("vague-step", "Reproduction", "warning", "One or more structured steps are too vague or have no instruction.", "reproduction-workflow"));
  if (structured.length && structured.some((step) => !step.expectedResult?.trim() || !step.actualResult?.trim())) deduct(4, issue("step-results", "Reproduction", "suggestion", "Add expected and actual results to each structured step.", "reproduction-workflow"));
  const evidenceIds = new Set(report.evidenceItems.map((item) => item.id));
  if (structured.some((step) => step.evidenceIds.some((id) => !evidenceIds.has(id)))) deduct(4, issue("missing-step-evidence", "Reproduction", "warning", "A structured step references deleted evidence.", "reproduction-workflow"));
  if (report.impact.trim().length < 50) deduct(15, issue("impact-short", "Impact", "error", "Security impact needs a concrete explanation of affected users, data, permissions, or business risk.", "report-content"));
  if (report.impact.toLocaleLowerCase().trim() === report.vulnerabilityType.toLocaleLowerCase().trim()) deduct(5, issue("impact-repeat", "Impact", "warning", "Impact should explain consequences instead of repeating the vulnerability name.", "report-content"));
  if (!report.evidenceItems.length && !report.evidence.trim()) deduct(10, issue("no-evidence", "Evidence", "warning", "No evidence is attached or described.", "evidence"));
  if (report.evidenceItems.some((item) => !item.title.trim())) deduct(3, issue("evidence-title", "Evidence", "warning", "An evidence item has no title.", "evidence"));
  if (report.evidenceItems.some((item) => item.type === "url" && (!item.sourceUrl || !validUrl(item.sourceUrl)))) deduct(3, issue("evidence-url", "Evidence", "warning", "An evidence URL appears invalid.", "evidence"));
  if (missingImageIds.length) deduct(4, issue("evidence-file", "Evidence", "warning", "One or more image metadata records have no IndexedDB file.", "evidence"));
  if (report.remediation.trim().length < 40 || /^fix this\.?$/i.test(report.remediation.trim())) deduct(10, issue("remediation-short", "Remediation", "error", "Recommended remediation needs a concrete defensive action.", "report-content"));
  const scoreValue = Number(report.cvssScore);
  if (Number.isNaN(scoreValue) || scoreValue < 0 || scoreValue > 10) deduct(5, issue("cvss-score", "CVSS", "error", "CVSS score must be between 0.0 and 10.0.", "risk-assessment"));
  else if (!/^CVSS:3\.1\//.test(report.cvssVector)) deduct(3, issue("cvss-vector", "CVSS", "warning", "CVSS vector should begin with CVSS:3.1/.", "risk-assessment"));
  else if (!report.severityOverridden && severityFromCvss(scoreValue) !== report.severity) deduct(5, issue("cvss-severity", "CVSS", "warning", "Severity does not match the CVSS score band.", "risk-assessment"));
  if (/\n{4,}/.test([report.summary, report.description, report.impact].join("\n"))) deduct(2, issue("blank-lines", "Formatting", "suggestion", "Reduce excessive consecutive blank lines.", "report-content"));
  if ([report.description, report.impact].some((value) => value.split("\n").some((line) => line.length > 700))) deduct(2, issue("long-paragraph", "Formatting", "suggestion", "Break up extremely long unbroken paragraphs.", "report-content"));
  if (new Set(report.references.map((item) => item.url.trim())).size !== report.references.length) deduct(2, issue("duplicate-references", "Formatting", "suggestion", "Remove duplicate references.", "supporting-information"));
  if (report.disclosureTimeline.some((item) => !item.event.trim())) deduct(2, issue("empty-timeline", "Formatting", "suggestion", "Remove or complete empty timeline entries.", "supporting-information"));
  if (report.status === "Ready to Submit" && synchronizeChecklist(report).some((item) => item.required && !item.completed)) deduct(5, issue("ready-blocking", "Submission", "warning", "The report is marked Ready to Submit with required checklist items incomplete.", "submission"));
  if (report.status === "Submitted" && !report.submissionDetails.submittedAt) deduct(5, issue("submitted-date", "Submission", "error", "Submitted reports need a submission date.", "submission"));
  if (report.submissionDetails.submissionUrl && !validUrl(report.submissionDetails.submissionUrl)) deduct(3, issue("submission-url", "Submission", "warning", "Submission URL appears invalid.", "submission"));
  if (report.status !== "Submitted" && report.submissionDetails.outcome === "Submitted") deduct(3, issue("submission-outcome", "Submission", "warning", "Submission outcome conflicts with the report status.", "submission"));
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  return { score: normalizedScore, grade: gradeFromScore(normalizedScore), checkedAt: new Date().toISOString(), issues };
}

export function checklistProgress(items: ChecklistItem[]): { completed: number; total: number; blocking: number } {
  return { completed: items.filter((item) => item.completed).length, total: items.length, blocking: items.filter((item) => item.required && !item.completed).length };
}
