import type { Report } from "./report";

export type SnapshotReason = "Manual Save" | "Before Submission" | "Before Retesting" | "Before Remediated" | "Before Closed" | "Before Reopen" | "Status Change" | "Imported" | "Restored" | "Regression";

export interface ReportSnapshot {
  id: string;
  reportId: string;
  createdAt: string;
  reason: SnapshotReason;
  label?: string;
  data: Report;
}
