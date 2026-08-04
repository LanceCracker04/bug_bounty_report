import type { Report } from "./report";

export const FINDING_LIFECYCLE_STATUSES = [
  "Draft",
  "Ready to Submit",
  "Submitted",
  "Needs More Information",
  "Triaged",
  "Accepted",
  "Remediation in Progress",
  "Ready for Retest",
  "Retesting",
  "Remediated",
  "Partially Remediated",
  "Not Remediated",
  "Risk Accepted",
  "Duplicate",
  "Informative",
  "Rejected",
  "Closed",
] as const;
export type FindingLifecycleStatus =
  (typeof FINDING_LIFECYCLE_STATUSES)[number];

export const VERIFICATION_OUTCOMES = [
  "Not Tested",
  "Unable to Verify",
  "Still Reproducible",
  "Partially Fixed",
  "No Longer Reproducible",
  "Different Behavior Observed",
  "Regression Detected",
] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

export interface FindingLifecycleEvent {
  id: string;
  reportId: string;
  timestamp: string;
  previousStatus?: FindingLifecycleStatus;
  nextStatus: FindingLifecycleStatus;
  reason?: string;
  actorLabel?: string;
  source: "Researcher" | "Program Response" | "Retest" | "Import" | "System";
}

export interface RetestChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
  source: "system" | "custom";
}

export interface RetestRecord {
  id: string;
  reportId: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  environment?: string;
  targetSnapshot?: string;
  linkedAssetIds: string[];
  linkedSessionId?: string;
  testerName?: string;
  buildOrVersion?: string;
  verificationOutcome: VerificationOutcome;
  notes?: string;
  originalBehavior?: string;
  currentBehavior?: string;
  residualRisk?: string;
  evidenceIds: string[];
  transcriptIds: string[];
  checklistItems: RetestChecklistItem[];
  previousRetestId?: string;
  regressionOfRetestId?: string;
  comparisonSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FindingFamily {
  id: string;
  name: string;
  programId?: string;
  description?: string;
  vulnerabilityClass?: string;
  reportIds: string[];
  rootCauseId?: string;
  tags: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const ROOT_CAUSE_CATEGORIES = [
  "Authorization",
  "Authentication",
  "Input Handling",
  "Output Encoding",
  "Session Management",
  "Configuration",
  "Business Logic",
  "Data Exposure",
  "Infrastructure",
  "Process",
  "Other",
] as const;
export type RootCauseCategory = (typeof ROOT_CAUSE_CATEGORIES)[number];

export interface RootCauseEntry {
  id: string;
  name: string;
  category: RootCauseCategory;
  description?: string;
  defensiveGuidance?: string;
  reportIds: string[];
  custom: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationDirection = "Incoming" | "Outgoing" | "Internal Note";
export type CommunicationChannel =
  | "Platform Comment"
  | "Email"
  | "Video Call"
  | "Voice Call"
  | "Meeting"
  | "Other";
export interface CommunicationEntry {
  id: string;
  reportId?: string;
  programId?: string;
  direction: CommunicationDirection;
  channel: CommunicationChannel;
  timestamp: string;
  subject?: string;
  participantLabels: string[];
  summary: string;
  actionRequired?: string;
  dueAt?: string;
  completedAt?: string;
  attachmentEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const INFORMATION_REQUEST_STATUSES = [
  "Open",
  "Drafting Response",
  "Ready to Respond",
  "Responded",
  "Closed",
] as const;
export type InformationRequestStatus =
  (typeof INFORMATION_REQUEST_STATUSES)[number];
export interface InformationRequest {
  id: string;
  reportId: string;
  communicationEntryId?: string;
  requestType: string;
  requestText: string;
  requestedAt: string;
  dueAt?: string;
  status: InformationRequestStatus;
  responseDraft?: string;
  linkedEvidenceIds: string[];
  linkedTranscriptIds: string[];
  respondedAt?: string;
  notes?: string;
}

export type SanitizationMode = "Minimal" | "Standard" | "Strict" | "Custom";
export interface SanitizationReplacement {
  id: string;
  source: string;
  replacement: string;
  enabled: boolean;
  category: string;
}
export interface SanitizationProfile {
  id: string;
  name: string;
  mode: SanitizationMode;
  replacements: SanitizationReplacement[];
  createdAt: string;
  updatedAt: string;
}

export interface LayoutSettings {
  sectionOrder: string[];
  hiddenSections: string[];
  updatedAt: string;
}

export interface LockSettings {
  enabled: boolean;
  salt?: string;
  verifier?: string;
  iterations?: number;
  lockAfterMinutes: number;
  lockOnHiddenMinutes: number;
  requireOnStart: boolean;
  sessionOnlyUnlock: boolean;
  updatedAt?: string;
}

export interface DiagnosticsMetadata {
  lastBackupAt?: string;
  lastRestoreAt?: string;
  lastIntegrityScanAt?: string;
  lastHealthScanAt?: string;
  lastHealthResult?: DiagnosticFinding[];
  ignoredWarningIds?: string[];
}

export type DiagnosticSeverity = "Critical" | "Warning" | "Informational";
export interface DiagnosticFinding {
  id: string;
  severity: DiagnosticSeverity;
  area: string;
  message: string;
  reportId?: string;
  repairable?: boolean;
  details?: string;
}
export interface HealthCheckResult {
  checkedAt: string;
  findings: DiagnosticFinding[];
  repairableCount: number;
}

export interface SanitizedReportCopy {
  report: Report;
  profile: SanitizationProfile;
  warnings: string[];
  scanCount: number;
}
