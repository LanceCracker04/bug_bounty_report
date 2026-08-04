import type {
  FindingLifecycleEvent,
  FindingLifecycleStatus,
  VerificationOutcome,
} from "../types/phase6";
import type { Report, ReportStatus } from "../types/report";
import { generateReportId } from "./reportHelpers";

const legacyMap: Record<ReportStatus, FindingLifecycleStatus> = {
  Draft: "Draft",
  "Ready to Submit": "Ready to Submit",
  Submitted: "Submitted",
  Triaged: "Triaged",
  Accepted: "Accepted",
  Duplicate: "Duplicate",
  Informative: "Informative",
  Resolved: "Remediated",
  Rejected: "Rejected",
};
const lifecycleToLegacy: Partial<Record<FindingLifecycleStatus, ReportStatus>> =
  {
    Draft: "Draft",
    "Ready to Submit": "Ready to Submit",
    Submitted: "Submitted",
    "Needs More Information": "Submitted",
    Triaged: "Triaged",
    Accepted: "Accepted",
    Duplicate: "Duplicate",
    Informative: "Informative",
    Rejected: "Rejected",
    Remediated: "Resolved",
    "Partially Remediated": "Accepted",
    "Not Remediated": "Accepted",
    "Ready for Retest": "Accepted",
    Retesting: "Accepted",
    "Risk Accepted": "Accepted",
    Closed: "Resolved",
    "Remediation in Progress": "Accepted",
  };
export const reasonRequired = (
  from: FindingLifecycleStatus | undefined,
  to: FindingLifecycleStatus,
): boolean =>
  to === "Risk Accepted" ||
  (from === "Accepted" && to === "Rejected") ||
  (from === "Ready for Retest" && to === "Closed") ||
  (from === "Remediated" && to === "Retesting") ||
  (from === "Closed" &&
    !["Closed", "Duplicate", "Informative", "Rejected"].includes(to));
export const isImportantLifecycleTransition = (
  from: FindingLifecycleStatus | undefined,
  to: FindingLifecycleStatus,
) =>
  to === "Submitted" ||
  to === "Retesting" ||
  to === "Remediated" ||
  to === "Closed" ||
  from === "Closed";
export function lifecycleFromLegacy(
  status: ReportStatus,
  outcome?: string,
): FindingLifecycleStatus {
  if (outcome === "Needs More Information") return "Needs More Information";
  return legacyMap[status] ?? "Draft";
}
export function statusForLifecycle(
  status: FindingLifecycleStatus,
  current: ReportStatus,
): ReportStatus {
  return lifecycleToLegacy[status] ?? current;
}
export function lifecycleSuggestedActions(
  status: FindingLifecycleStatus,
  report: Report,
): string[] {
  const actions: Record<FindingLifecycleStatus, string[]> = {
    Draft: ["Complete report details and review evidence."],
    "Ready to Submit": [
      "Complete the submission checklist and record the submission.",
    ],
    Submitted: ["Track program responses and follow-up dates."],
    "Needs More Information": [
      "Create an information request response and attach only reviewed evidence.",
    ],
    Triaged: ["Record the triage result and any requested follow-up."],
    Accepted: ["Record remediation ownership or await a retest-ready notice."],
    "Remediation in Progress": [
      "Track the proposed build or remediation owner.",
    ],
    "Ready for Retest": [
      "Review scope, build, prior behavior, and begin an authorized retest.",
    ],
    Retesting: [
      "Record observed behavior; do not infer a fix without confirmation.",
    ],
    Remediated: [
      "Retain verification evidence and monitor for regression if appropriate.",
    ],
    "Partially Remediated": ["Describe residual risk and planned follow-up."],
    "Not Remediated": [
      "Record the current observed behavior and coordinate next steps.",
    ],
    "Risk Accepted": [
      "Keep the risk acceptance note and review any expiry or follow-up.",
    ],
    Duplicate: ["Link related findings if useful."],
    Informative: ["Retain the record and any learning notes."],
    Rejected: ["Record rationale or request clarification if appropriate."],
    Closed: [
      "Retain history; reopen only if new similar behavior is observed.",
    ],
  };
  const next = actions[status] ?? [];
  if (report.redactionScanSummary?.unresolvedHighConfidenceCount)
    next.push(
      "Resolve high-confidence sensitive-data findings before sharing or retesting.",
    );
  return next;
}
export function createLifecycleEvent(
  reportId: string,
  previousStatus: FindingLifecycleStatus | undefined,
  nextStatus: FindingLifecycleStatus,
  reason: string | undefined,
  source: FindingLifecycleEvent["source"],
  actorLabel?: string,
): FindingLifecycleEvent {
  return {
    id: generateReportId(),
    reportId,
    timestamp: new Date().toISOString(),
    previousStatus,
    nextStatus,
    reason: reason?.trim() || undefined,
    actorLabel: actorLabel?.trim() || undefined,
    source,
  };
}
export function outcomeLifecycleSuggestion(
  outcome: VerificationOutcome,
): FindingLifecycleStatus | undefined {
  const suggestions: Partial<
    Record<VerificationOutcome, FindingLifecycleStatus>
  > = {
    "Still Reproducible": "Not Remediated",
    "Partially Fixed": "Partially Remediated",
    "No Longer Reproducible": "Remediated",
    "Regression Detected": "Retesting",
    "Unable to Verify": "Ready for Retest",
  };
  return suggestions[outcome];
}
