export const ACTIVITY_ACTIONS = [
  "Created",
  "Edited",
  "Autosaved",
  "Quality Checked",
  "Marked Ready",
  "Submitted",
  "Status Changed",
  "Evidence Added",
  "Evidence Removed",
  "Exported",
  "Duplicated",
  "Imported",
  "Restored",
  "Lifecycle Changed",
  "Retest Started",
  "Retest Completed",
  "Remediation Verified",
  "Regression Recorded",
  "Finding Family Linked",
  "Root Cause Linked",
  "Communication Recorded",
  "Information Request Created",
  "Information Request Responded",
  "Sanitized Export Generated",
  "Encrypted Backup Generated",
  "Workspace Locked",
  "Data Health Checked",
  "Safe Repair Applied",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface ActivityEntry {
  id: string;
  reportId: string;
  timestamp: string;
  action: ActivityAction;
  description: string;
}
