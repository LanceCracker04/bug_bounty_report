import { DEFAULT_CVSS_METRICS, EMPTY_REPORT_DRAFT, REPORT_STATUSES, SEVERITIES, SUBMISSION_OUTCOMES, SUBMISSION_PLATFORMS, type ChecklistItem, type CvssMetrics, type EvidenceItem, type ReferenceItem, type Report, type ReportStatus, type ReproductionStep, type Severity, type SubmissionDetails, type TimelineItem } from "../types/report";
import { generateReportId } from "./reportHelpers";
import { generateReportReference, isReportReference } from "./reportReference";
import { platformFromText, synchronizeChecklist } from "./reportQuality";
import { FINDING_LIFECYCLE_STATUSES, type FindingLifecycleEvent } from "../types/phase6";
import { lifecycleFromLegacy } from "./lifecycle";
import type { TemplateSectionPrompts } from "../types/template";

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
}

function normalizeTemplateGuidance(value: unknown): NonNullable<Report["templateGuidance"]> | undefined {
  const source = record(value);
  if (!source) return undefined;
  const rawPrompts = record(source.sectionPrompts);
  const sectionPrompts: TemplateSectionPrompts = rawPrompts ? { title: text(rawPrompts.title), summary: text(rawPrompts.summary), description: text(rawPrompts.description), prerequisites: text(rawPrompts.prerequisites), reproduction: text(rawPrompts.reproduction), impact: text(rawPrompts.impact), remediation: text(rawPrompts.remediation) } : {};
  return { sectionPrompts, evidenceChecklist: strings(source.evidenceChecklist), questionsToAnswer: strings(source.questionsToAnswer), commonMistakes: strings(source.commonMistakes) };
}

function oneOf<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === "string" && values.includes(value) ? value as T[number] : fallback;
}

function normalizeMetrics(value: unknown): CvssMetrics {
  const source = record(value);
  const pick = <T extends readonly string[]>(key: string, values: T, fallback: T[number]) => oneOf(source?.[key], values, fallback);
  return {
    attackVector: pick("attackVector", ["N", "A", "L", "P"] as const, DEFAULT_CVSS_METRICS.attackVector),
    attackComplexity: pick("attackComplexity", ["L", "H"] as const, DEFAULT_CVSS_METRICS.attackComplexity),
    privilegesRequired: pick("privilegesRequired", ["N", "L", "H"] as const, DEFAULT_CVSS_METRICS.privilegesRequired),
    userInteraction: pick("userInteraction", ["N", "R"] as const, DEFAULT_CVSS_METRICS.userInteraction),
    scope: pick("scope", ["U", "C"] as const, DEFAULT_CVSS_METRICS.scope),
    confidentiality: pick("confidentiality", ["N", "L", "H"] as const, DEFAULT_CVSS_METRICS.confidentiality),
    integrity: pick("integrity", ["N", "L", "H"] as const, DEFAULT_CVSS_METRICS.integrity),
    availability: pick("availability", ["N", "L", "H"] as const, DEFAULT_CVSS_METRICS.availability),
  };
}

function normalizeSteps(value: unknown): ReproductionStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    if (!source || !text(source.instruction).trim()) return [];
    return [{
      id: text(source.id, generateReportId()),
      title: text(source.title),
      instruction: text(source.instruction),
      expectedResult: text(source.expectedResult) || undefined,
      actualResult: text(source.actualResult) || undefined,
      evidenceIds: Array.isArray(source.evidenceIds) ? source.evidenceIds.filter((id): id is string => typeof id === "string") : [],
    }];
  });
}

function normalizeEvidence(value: unknown, reportId: string): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    if (!source || !text(source.title).trim()) return [];
    const type = oneOf(source.type, ["image", "url", "text"] as const, "text");
    return [{
      id: text(source.id, generateReportId()), reportId, type,
      title: text(source.title), description: text(source.description) || undefined,
      fileName: text(source.fileName) || undefined, mimeType: text(source.mimeType) || undefined,
      sourceUrl: text(source.sourceUrl) || undefined, createdAt: text(source.createdAt, new Date().toISOString()),
    }];
  });
}

function normalizeReferences(value: unknown): ReferenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    if (!source || !text(source.url).trim()) return [];
    return [{ id: text(source.id, generateReportId()), label: text(source.label, text(source.url)), url: text(source.url) }];
  });
}

function normalizeTimeline(value: unknown): TimelineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    if (!source || !text(source.event).trim()) return [];
    return [{ id: text(source.id, generateReportId()), date: text(source.date), event: text(source.event) }];
  });
}

function normalizeSubmission(value: unknown, reportPlatform: string, programName: string): SubmissionDetails {
  const source = record(value);
  return {
    platform: oneOf(source?.platform, SUBMISSION_PLATFORMS, platformFromText(reportPlatform)),
    programName: text(source?.programName, programName) || undefined,
    submissionId: text(source?.submissionId) || undefined,
    submissionUrl: text(source?.submissionUrl) || undefined,
    submittedAt: text(source?.submittedAt) || undefined,
    lastResponseAt: text(source?.lastResponseAt) || undefined,
    outcome: oneOf(source?.outcome, SUBMISSION_OUTCOMES, "Not Submitted"),
    analystName: text(source?.analystName) || undefined,
    bountyAmount: typeof source?.bountyAmount === "number" && Number.isFinite(source.bountyAmount) && source.bountyAmount > 0 ? source.bountyAmount : undefined,
    bountyCurrency: text(source?.bountyCurrency) || undefined,
    notes: text(source?.notes) || undefined,
  };
}

function normalizeChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    if (!source || !text(source.id).trim() || !text(source.label).trim()) return [];
    return [{ id: text(source.id), label: text(source.label), completed: source.completed === true, required: source.required !== false, source: source.source === "custom" ? "custom" as const : "system" as const }];
  });
}

function normalizeLifecycleEvents(value: unknown, reportId: string): FindingLifecycleEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    const sourceStatus = source ? text(source.nextStatus) : "";
    if (!source || !FINDING_LIFECYCLE_STATUSES.includes(sourceStatus as typeof FINDING_LIFECYCLE_STATUSES[number])) return [];
    const next = sourceStatus as FindingLifecycleEvent["nextStatus"];
    const previous = typeof source.previousStatus === "string" && FINDING_LIFECYCLE_STATUSES.includes(source.previousStatus as typeof FINDING_LIFECYCLE_STATUSES[number]) ? source.previousStatus as FindingLifecycleEvent["previousStatus"] : undefined;
    const eventSource = ["Researcher", "Program Response", "Retest", "Import", "System"].includes(text(source.source)) ? text(source.source) as FindingLifecycleEvent["source"] : "Import";
    return [{ id: text(source.id, generateReportId()), reportId, timestamp: text(source.timestamp, new Date().toISOString()), previousStatus: previous, nextStatus: next, reason: text(source.reason) || undefined, actorLabel: text(source.actorLabel) || undefined, source: eventSource }];
  });
}

export function normalizeReports(rawReports: unknown): Report[] {
  if (!Array.isArray(rawReports)) return [];
  const usedReferences: Report[] = [];

  return rawReports.flatMap((item) => {
    const source = record(item);
    if (!source) return [];
    const id = text(source.id, generateReportId());
    const now = new Date().toISOString();
    const suppliedReference = text(source.reportReference);
    const referenceTaken = usedReferences.some((report) => report.reportReference === suppliedReference);
    const reportReference = isReportReference(suppliedReference) && !referenceTaken ? suppliedReference : generateReportReference(usedReferences);
    const report: Report = {
      ...EMPTY_REPORT_DRAFT,
      id,
      title: text(source.title), programName: text(source.programName), platform: text(source.platform),
      target: text(source.target), vulnerableEndpoint: text(source.vulnerableEndpoint), vulnerabilityType: text(source.vulnerabilityType),
      severity: oneOf(source.severity, SEVERITIES, "Medium") as Severity,
      status: oneOf(source.status, REPORT_STATUSES, "Draft") as ReportStatus,
      cvssScore: text(source.cvssScore, EMPTY_REPORT_DRAFT.cvssScore), summary: text(source.summary), description: text(source.description),
      prerequisites: text(source.prerequisites), reproductionSteps: text(source.reproductionSteps), impact: text(source.impact),
      evidence: text(source.evidence), remediation: text(source.remediation), researcherName: text(source.researcherName),
      createdAt: text(source.createdAt, now), updatedAt: text(source.updatedAt, now),
      reportReference, affectedAsset: text(source.affectedAsset), testingEnvironment: text(source.testingEnvironment),
      discoveredAt: text(source.discoveredAt), vulnerabilityClass: text(source.vulnerabilityClass), cvssVector: text(source.cvssVector, EMPTY_REPORT_DRAFT.cvssVector),
      cvssMode: oneOf(source.cvssMode, ["calculated", "manual"] as const, text(source.cvssScore) ? "manual" : "calculated"),
      cvssMetrics: normalizeMetrics(source.cvssMetrics), severityOverridden: source.severityOverridden === true,
      structuredSteps: normalizeSteps(source.structuredSteps), evidenceItems: normalizeEvidence(source.evidenceItems, id),
      references: normalizeReferences(source.references), disclosureTimeline: normalizeTimeline(source.disclosureTimeline),
      templateId: text(source.templateId) || undefined, isExampleReport: source.isExampleReport === true,
      templateGuidance: normalizeTemplateGuidance(source.templateGuidance),
      lastAutosavedAt: text(source.lastAutosavedAt) || undefined,
      submissionDetails: normalizeSubmission(source.submissionDetails, text(source.platform), text(source.programName)),
      submissionChecklist: normalizeChecklist(source.submissionChecklist),
      qualityResult: record(source.qualityResult) ? source.qualityResult as Report["qualityResult"] : undefined,
      archivedAt: text(source.archivedAt) || undefined,
      lastReviewedAt: text(source.lastReviewedAt) || undefined,
      relatedReportIds: Array.isArray(source.relatedReportIds) ? source.relatedReportIds.filter((id): id is string => typeof id === "string") : [],
      ignoredSimilarityReportIds: Array.isArray(source.ignoredSimilarityReportIds) ? source.ignoredSimilarityReportIds.filter((id): id is string => typeof id === "string") : [],
      redactionScanSummary: record(source.redactionScanSummary) ? { lastScannedAt: text(record(source.redactionScanSummary)?.lastScannedAt) || undefined, unresolvedHighConfidenceCount: Number(record(source.redactionScanSummary)?.unresolvedHighConfidenceCount) || 0, unresolvedMediumConfidenceCount: Number(record(source.redactionScanSummary)?.unresolvedMediumConfidenceCount) || 0, reviewedCount: Number(record(source.redactionScanSummary)?.reviewedCount) || 0 } : undefined,
      similarityScanSummary: record(source.similarityScanSummary) ? { lastScannedAt: text(record(source.similarityScanSummary)?.lastScannedAt) || undefined, candidateCount: Number(record(source.similarityScanSummary)?.candidateCount) || 0, highestSimilarity: Number(record(source.similarityScanSummary)?.highestSimilarity) || undefined } : undefined,
      lastAssistantReviewAt: text(source.lastAssistantReviewAt) || undefined,
      programProfileId: text(source.programProfileId) || undefined, linkedAssetIds: Array.isArray(source.linkedAssetIds) ? source.linkedAssetIds.filter((id): id is string => typeof id === "string") : [], testingSessionIds: Array.isArray(source.testingSessionIds) ? source.testingSessionIds.filter((id): id is string => typeof id === "string") : [], httpTranscriptIds: Array.isArray(source.httpTranscriptIds) ? source.httpTranscriptIds.filter((id): id is string => typeof id === "string") : [], lastScopeValidation: record(source.lastScopeValidation) ? source.lastScopeValidation as Report["lastScopeValidation"] : undefined, scopeReviewConfirmedAt: text(source.scopeReviewConfirmedAt) || undefined, scopeOverrideReason: text(source.scopeOverrideReason) || undefined, expectedResponseAt: text(source.expectedResponseAt) || undefined, followUpAt: text(source.followUpAt) || undefined, disclosureDeadlineAt: text(source.disclosureDeadlineAt) || undefined, embargoEndAt: text(source.embargoEndAt) || undefined, nextAction: text(source.nextAction) || undefined,
      lifecycleStatus: oneOf(source.lifecycleStatus, FINDING_LIFECYCLE_STATUSES, lifecycleFromLegacy(oneOf(source.status, REPORT_STATUSES, "Draft") as ReportStatus, text(record(source.submissionDetails)?.outcome))) ,
      lifecycleEvents: normalizeLifecycleEvents(source.lifecycleEvents, id), remediationOwnerLabel: text(source.remediationOwnerLabel) || undefined, remediationStartedAt: text(source.remediationStartedAt) || undefined, readyForRetestAt: text(source.readyForRetestAt) || undefined, closedAt: text(source.closedAt) || undefined, riskAcceptanceNote: text(source.riskAcceptanceNote) || undefined, rootCauseId: text(source.rootCauseId) || undefined, findingFamilyId: text(source.findingFamilyId) || undefined, regressionDetectedAt: text(source.regressionDetectedAt) || undefined,
    };
    report.submissionChecklist = synchronizeChecklist(report);
    usedReferences.push(report);
    return [report];
  });
}
