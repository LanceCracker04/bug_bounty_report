import type { RetestChecklistItem, RetestRecord } from "../types/phase6";
import type { Report } from "../types/report";
import { generateReportId } from "./reportHelpers";
import { loadRetests, saveRetests } from "./phase6Storage";
export { loadRetests, saveRetests };
export const SYSTEM_RETEST_CHECKLIST: Array<
  Omit<RetestChecklistItem, "id" | "completed">
> = [
  ["Program authorization and scope were reviewed", true],
  ["Current target or build was identified", true],
  ["Original reproduction steps were reviewed", true],
  ["Relevant accounts or roles were documented without passwords", false],
  ["Original evidence was reviewed", true],
  ["Current behavior was recorded", true],
  ["New evidence was attached where appropriate", false],
  ["Residual impact was considered", false],
  ["Regression risk was reviewed", false],
  ["Retest outcome was manually confirmed", true],
].map(([label, required]) => ({
  label: label as string,
  required: required as boolean,
  source: "system",
}));
export function createRetest(
  report: Report,
  duplicate?: RetestRecord,
  regressionOfRetestId?: string,
): RetestRecord {
  const now = new Date().toISOString();
  return {
    id: generateReportId(),
    reportId: report.id,
    title: duplicate
      ? `Follow-up: ${duplicate.title}`
      : `Retest: ${report.title || report.reportReference}`,
    startedAt: now,
    environment:
      duplicate?.environment ?? (report.testingEnvironment || undefined),
    targetSnapshot:
      duplicate?.targetSnapshot ??
      (report.target || report.affectedAsset || undefined),
    linkedAssetIds: duplicate?.linkedAssetIds ?? report.linkedAssetIds ?? [],
    linkedSessionId: duplicate?.linkedSessionId,
    testerName: duplicate?.testerName ?? (report.researcherName || undefined),
    buildOrVersion: duplicate?.buildOrVersion,
    verificationOutcome: "Not Tested",
    notes: duplicate?.notes,
    originalBehavior:
      duplicate?.originalBehavior ??
      report.structuredSteps
        .map((step) => step.actualResult || step.instruction)
        .filter(Boolean)
        .join("\n"),
    currentBehavior: "",
    residualRisk: "",
    evidenceIds: [],
    transcriptIds: [],
    checklistItems: (duplicate?.checklistItems ?? SYSTEM_RETEST_CHECKLIST).map(
      (item) => ({ ...item, id: generateReportId(), completed: false }),
    ),
    previousRetestId: duplicate?.id,
    regressionOfRetestId,
    createdAt: now,
    updatedAt: now,
  };
}
export function validateRetestForCompletion(retest: RetestRecord): string[] {
  const missing: string[] = [];
  if (retest.verificationOutcome === "Not Tested")
    missing.push("Select a verification outcome.");
  if (!retest.completedAt) missing.push("Enter a completion date.");
  if ((retest.currentBehavior ?? "").trim().length < 12)
    missing.push("Describe current behavior with meaningful detail.");
  for (const item of retest.checklistItems.filter(
    (item) => item.required && !item.completed,
  ))
    missing.push(`Complete required checklist item: ${item.label}`);
  return missing;
}
