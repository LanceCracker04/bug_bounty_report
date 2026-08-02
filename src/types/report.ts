export const SEVERITIES = ["Informational", "Low", "Medium", "High", "Critical"] as const;
export const REPORT_STATUSES = [
  "Draft",
  "Ready to Submit",
  "Submitted",
  "Triaged",
  "Accepted",
  "Duplicate",
  "Informative",
  "Resolved",
  "Rejected",
] as const;

export type Severity = (typeof SEVERITIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type CvssMode = "calculated" | "manual";
export type EvidenceType = "image" | "url" | "text";
export const SUBMISSION_PLATFORMS = ["HackerOne", "Bugcrowd", "Intigriti", "YesWeHack", "Private Program", "Direct Email", "Other"] as const;
export const SUBMISSION_OUTCOMES = ["Not Submitted", "Submitted", "Needs More Information", "Triaged", "Accepted", "Duplicate", "Informative", "Not Applicable", "Resolved", "Rejected"] as const;
export type SubmissionPlatform = (typeof SUBMISSION_PLATFORMS)[number];
export type SubmissionOutcome = (typeof SUBMISSION_OUTCOMES)[number];
export type QualityGrade = "Excellent" | "Good" | "Needs Work" | "Incomplete";
export type QualityCategory = "Required Field" | "Clarity" | "Reproduction" | "Impact" | "Evidence" | "Remediation" | "CVSS" | "Formatting" | "Submission";
export interface RedactionScanSummary { lastScannedAt?: string; unresolvedHighConfidenceCount: number; unresolvedMediumConfidenceCount: number; reviewedCount: number; }
export interface SimilarityScanSummary { lastScannedAt?: string; candidateCount: number; highestSimilarity?: number; }

export interface CvssMetrics {
  attackVector: "N" | "A" | "L" | "P";
  attackComplexity: "L" | "H";
  privilegesRequired: "N" | "L" | "H";
  userInteraction: "N" | "R";
  scope: "U" | "C";
  confidentiality: "N" | "L" | "H";
  integrity: "N" | "L" | "H";
  availability: "N" | "L" | "H";
}

export interface ReproductionStep {
  id: string;
  title: string;
  instruction: string;
  expectedResult?: string;
  actualResult?: string;
  evidenceIds: string[];
}

export interface EvidenceItem {
  id: string;
  reportId: string;
  type: EvidenceType;
  title: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  sourceUrl?: string;
  createdAt: string;
}

export interface ReferenceItem {
  id: string;
  label: string;
  url: string;
}

export interface TimelineItem {
  id: string;
  date: string;
  event: string;
}

export interface SubmissionDetails {
  platform: SubmissionPlatform;
  programName?: string;
  submissionId?: string;
  submissionUrl?: string;
  submittedAt?: string;
  lastResponseAt?: string;
  outcome: SubmissionOutcome;
  analystName?: string;
  bountyAmount?: number;
  bountyCurrency?: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
  source: "system" | "custom";
}

export interface QualityIssue {
  id: string;
  category: QualityCategory;
  severity: "error" | "warning" | "suggestion";
  message: string;
  section?: string;
  reviewed?: boolean;
}

export interface ReportQualityResult {
  score: number;
  grade: QualityGrade;
  checkedAt: string;
  issues: QualityIssue[];
}

export interface Report {
  id: string;
  title: string;
  programName: string;
  platform: string;
  target: string;
  vulnerableEndpoint: string;
  vulnerabilityType: string;
  severity: Severity;
  status: ReportStatus;
  cvssScore: string;
  summary: string;
  description: string;
  prerequisites: string;
  reproductionSteps: string;
  impact: string;
  evidence: string;
  remediation: string;
  researcherName: string;
  createdAt: string;
  updatedAt: string;
  reportReference: string;
  affectedAsset: string;
  testingEnvironment: string;
  discoveredAt: string;
  vulnerabilityClass: string;
  cvssVector: string;
  cvssMode: CvssMode;
  cvssMetrics: CvssMetrics;
  severityOverridden: boolean;
  structuredSteps: ReproductionStep[];
  evidenceItems: EvidenceItem[];
  references: ReferenceItem[];
  disclosureTimeline: TimelineItem[];
  templateId?: string;
  lastAutosavedAt?: string;
  submissionDetails: SubmissionDetails;
  submissionChecklist: ChecklistItem[];
  qualityResult?: ReportQualityResult;
  archivedAt?: string;
  lastReviewedAt?: string;
  relatedReportIds?: string[]; ignoredSimilarityReportIds?: string[]; redactionScanSummary?: RedactionScanSummary; similarityScanSummary?: SimilarityScanSummary; lastAssistantReviewAt?: string; programProfileId?: string; linkedAssetIds?: string[]; testingSessionIds?: string[]; httpTranscriptIds?: string[]; lastScopeValidation?: { status: string; matchedRuleId?: string; normalizedTarget?: string; reasons: string[]; checkedAt: string }; scopeReviewConfirmedAt?: string; scopeOverrideReason?: string; expectedResponseAt?: string; followUpAt?: string; disclosureDeadlineAt?: string; embargoEndAt?: string; nextAction?: string;
  lifecycleStatus?: import("./phase6").FindingLifecycleStatus;
  lifecycleEvents?: import("./phase6").FindingLifecycleEvent[];
  remediationOwnerLabel?: string;
  remediationStartedAt?: string;
  readyForRetestAt?: string;
  closedAt?: string;
  riskAcceptanceNote?: string;
  rootCauseId?: string;
  findingFamilyId?: string;
  regressionDetectedAt?: string;
  isExampleReport?: boolean;
  templateGuidance?: { sectionPrompts: import("./template").TemplateSectionPrompts; evidenceChecklist: string[]; questionsToAnswer: string[]; commonMistakes: string[] };
}

export type ReportDraft = Omit<Report, "id" | "createdAt" | "updatedAt" | "reportReference" | "lastAutosavedAt">;

export const DEFAULT_CVSS_METRICS: CvssMetrics = {
  attackVector: "N",
  attackComplexity: "L",
  privilegesRequired: "N",
  userInteraction: "N",
  scope: "U",
  confidentiality: "N",
  integrity: "N",
  availability: "N",
};

export const EMPTY_REPORT_DRAFT: ReportDraft = {
  title: "",
  programName: "",
  platform: "",
  target: "",
  vulnerableEndpoint: "",
  vulnerabilityType: "",
  severity: "Informational",
  status: "Draft",
  cvssScore: "0.0",
  summary: "",
  description: "",
  prerequisites: "",
  reproductionSteps: "",
  impact: "",
  evidence: "",
  remediation: "",
  researcherName: "",
  affectedAsset: "",
  testingEnvironment: "",
  discoveredAt: "",
  vulnerabilityClass: "",
  cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
  cvssMode: "calculated",
  cvssMetrics: { ...DEFAULT_CVSS_METRICS },
  severityOverridden: false,
  structuredSteps: [],
  evidenceItems: [],
  references: [],
  disclosureTimeline: [],
  submissionDetails: { platform: "Other", outcome: "Not Submitted" },
  submissionChecklist: [],
};
