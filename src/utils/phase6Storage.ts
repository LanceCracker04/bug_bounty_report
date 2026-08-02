import { INFORMATION_REQUEST_STATUSES, ROOT_CAUSE_CATEGORIES, VERIFICATION_OUTCOMES, type CommunicationEntry, type DiagnosticsMetadata, type FindingFamily, type InformationRequest, type LayoutSettings, type LockSettings, type RetestRecord, type RootCauseEntry, type SanitizationMode, type SanitizationProfile } from "../types/phase6";

export const RETESTS_KEY = "bug-bounty-report-retests";
export const FINDING_FAMILIES_KEY = "bug-bounty-report-finding-families";
export const ROOT_CAUSES_KEY = "bug-bounty-report-root-causes";
export const COMMUNICATIONS_KEY = "bug-bounty-report-communications";
export const INFORMATION_REQUESTS_KEY = "bug-bounty-report-information-requests";
export const SANITIZATION_PROFILES_KEY = "bug-bounty-report-sanitization-profiles";
export const LOCK_SETTINGS_KEY = "bug-bounty-report-lock-settings";
export const LAYOUT_SETTINGS_KEY = "bug-bounty-report-layout-settings";
export const DIAGNOSTICS_KEY = "bug-bounty-report-diagnostics";

const SANITIZATION_MODES: SanitizationMode[] = ["Minimal", "Standard", "Strict", "Custom"];
const now = (): string => new Date().toISOString();
const object = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const text = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;
const optionalText = (value: unknown): string | undefined => text(value).trim() || undefined;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const oneOf = <T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] => typeof value === "string" && values.includes(value) ? value as T[number] : fallback;

function array<T>(key: string, normalize: (item: unknown) => T | undefined): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.flatMap((item) => {
      const normalized = normalize(item);
      return normalized ? [normalized] : [];
    }) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeRetest(value: unknown): RetestRecord | undefined {
  const source = object(value); const id = text(source?.id); const reportId = text(source?.reportId);
  if (!source || !id || !reportId) return undefined;
  const checklistItems = Array.isArray(source.checklistItems) ? source.checklistItems.flatMap((item) => {
    const checklist = object(item); const checklistId = text(checklist?.id); const label = text(checklist?.label);
    return checklistId && label ? [{ id: checklistId, label, completed: checklist?.completed === true, required: checklist?.required !== false, source: checklist?.source === "custom" ? "custom" as const : "system" as const }] : [];
  }) : [];
  return {
    id, reportId, title: text(source.title, "Untitled retest"), startedAt: text(source.startedAt, now()), completedAt: optionalText(source.completedAt), environment: optionalText(source.environment), targetSnapshot: optionalText(source.targetSnapshot), linkedAssetIds: strings(source.linkedAssetIds), linkedSessionId: optionalText(source.linkedSessionId), testerName: optionalText(source.testerName), buildOrVersion: optionalText(source.buildOrVersion), verificationOutcome: oneOf(source.verificationOutcome, VERIFICATION_OUTCOMES, "Not Tested"), notes: optionalText(source.notes), originalBehavior: optionalText(source.originalBehavior), currentBehavior: optionalText(source.currentBehavior), residualRisk: optionalText(source.residualRisk), evidenceIds: strings(source.evidenceIds), transcriptIds: strings(source.transcriptIds), checklistItems, previousRetestId: optionalText(source.previousRetestId), regressionOfRetestId: optionalText(source.regressionOfRetestId), comparisonSummary: optionalText(source.comparisonSummary), createdAt: text(source.createdAt, now()), updatedAt: text(source.updatedAt, now()),
  };
}

function normalizeFamily(value: unknown): FindingFamily | undefined {
  const source = object(value); const id = text(source?.id);
  if (!source || !id) return undefined;
  return { id, name: text(source.name, "Untitled finding family"), programId: optionalText(source.programId), description: optionalText(source.description), vulnerabilityClass: optionalText(source.vulnerabilityClass), reportIds: strings(source.reportIds), rootCauseId: optionalText(source.rootCauseId), tags: strings(source.tags), archivedAt: optionalText(source.archivedAt), createdAt: text(source.createdAt, now()), updatedAt: text(source.updatedAt, now()) };
}

function normalizeRootCause(value: unknown): RootCauseEntry | undefined {
  const source = object(value); const id = text(source?.id);
  if (!source || !id) return undefined;
  return { id, name: text(source.name, "Untitled root cause"), category: oneOf(source.category, ROOT_CAUSE_CATEGORIES, "Other"), description: optionalText(source.description), defensiveGuidance: optionalText(source.defensiveGuidance), reportIds: strings(source.reportIds), custom: source.custom === true, createdAt: text(source.createdAt, now()), updatedAt: text(source.updatedAt, now()) };
}

function normalizeCommunication(value: unknown): CommunicationEntry | undefined {
  const source = object(value); const id = text(source?.id);
  if (!source || !id) return undefined;
  return { id, reportId: optionalText(source.reportId), programId: optionalText(source.programId), direction: oneOf(source.direction, ["Incoming", "Outgoing", "Internal Note"] as const, "Internal Note"), channel: oneOf(source.channel, ["Platform Comment", "Email", "Video Call", "Voice Call", "Meeting", "Other"] as const, "Other"), timestamp: text(source.timestamp, now()), subject: optionalText(source.subject), participantLabels: strings(source.participantLabels), summary: text(source.summary), actionRequired: optionalText(source.actionRequired), dueAt: optionalText(source.dueAt), completedAt: optionalText(source.completedAt), attachmentEvidenceIds: strings(source.attachmentEvidenceIds), createdAt: text(source.createdAt, now()), updatedAt: text(source.updatedAt, now()) };
}

function normalizeInformationRequest(value: unknown): InformationRequest | undefined {
  const source = object(value); const id = text(source?.id); const reportId = text(source?.reportId);
  if (!source || !id || !reportId) return undefined;
  return { id, reportId, communicationEntryId: optionalText(source.communicationEntryId), requestType: text(source.requestType, "Information request"), requestText: text(source.requestText), requestedAt: text(source.requestedAt, now()), dueAt: optionalText(source.dueAt), status: oneOf(source.status, INFORMATION_REQUEST_STATUSES, "Open"), responseDraft: optionalText(source.responseDraft), linkedEvidenceIds: strings(source.linkedEvidenceIds), linkedTranscriptIds: strings(source.linkedTranscriptIds), respondedAt: optionalText(source.respondedAt), notes: optionalText(source.notes) };
}

function normalizeSanitizationProfile(value: unknown): SanitizationProfile | undefined {
  const source = object(value); const id = text(source?.id);
  if (!source || !id) return undefined;
  const replacements = Array.isArray(source.replacements) ? source.replacements.flatMap((item) => {
    const replacement = object(item); const replacementId = text(replacement?.id);
    return replacement && replacementId ? [{ id: replacementId, source: text(replacement.source), replacement: text(replacement.replacement), enabled: replacement.enabled === true, category: text(replacement.category, "Custom") }] : [];
  }) : [];
  return { id, name: text(source.name, "Sanitization profile"), mode: oneOf(source.mode, SANITIZATION_MODES, "Standard"), replacements, createdAt: text(source.createdAt, now()), updatedAt: text(source.updatedAt, now()) };
}

export const loadRetests = (): RetestRecord[] => array(RETESTS_KEY, normalizeRetest);
export const saveRetests = (value: RetestRecord[]): void => save(RETESTS_KEY, value);
export const loadFindingFamilies = (): FindingFamily[] => array(FINDING_FAMILIES_KEY, normalizeFamily);
export const saveFindingFamilies = (value: FindingFamily[]): void => save(FINDING_FAMILIES_KEY, value);
export const loadRootCauses = (): RootCauseEntry[] => array(ROOT_CAUSES_KEY, normalizeRootCause);
export const saveRootCauses = (value: RootCauseEntry[]): void => save(ROOT_CAUSES_KEY, value);
export const loadCommunications = (): CommunicationEntry[] => array(COMMUNICATIONS_KEY, normalizeCommunication);
export const saveCommunications = (value: CommunicationEntry[]): void => save(COMMUNICATIONS_KEY, value);
export const loadInformationRequests = (): InformationRequest[] => array(INFORMATION_REQUESTS_KEY, normalizeInformationRequest);
export const saveInformationRequests = (value: InformationRequest[]): void => save(INFORMATION_REQUESTS_KEY, value);
export const loadSanitizationProfiles = (): SanitizationProfile[] => array(SANITIZATION_PROFILES_KEY, normalizeSanitizationProfile);
export const saveSanitizationProfiles = (value: SanitizationProfile[]): void => save(SANITIZATION_PROFILES_KEY, value);

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = { sectionOrder: ["summary", "description", "prerequisites", "steps", "impact", "evidence", "remediation", "references", "timeline"], hiddenSections: [], updatedAt: "" };
export function loadLayoutSettings(): LayoutSettings {
  try {
    const source = object(JSON.parse(localStorage.getItem(LAYOUT_SETTINGS_KEY) ?? "null"));
    return source ? { ...DEFAULT_LAYOUT_SETTINGS, sectionOrder: strings(source.sectionOrder), hiddenSections: strings(source.hiddenSections), updatedAt: text(source.updatedAt) } : { ...DEFAULT_LAYOUT_SETTINGS };
  } catch {
    return { ...DEFAULT_LAYOUT_SETTINGS };
  }
}
export const saveLayoutSettings = (value: LayoutSettings): void => save(LAYOUT_SETTINGS_KEY, value);

export const DEFAULT_LOCK_SETTINGS: LockSettings = { enabled: false, lockAfterMinutes: 15, lockOnHiddenMinutes: 5, requireOnStart: false, sessionOnlyUnlock: true };
const positiveMinutes = (value: unknown, fallback: number): number => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
export function loadLockSettings(): LockSettings {
  try {
    const source = object(JSON.parse(localStorage.getItem(LOCK_SETTINGS_KEY) ?? "null"));
    return source ? { enabled: source.enabled === true, salt: optionalText(source.salt), verifier: optionalText(source.verifier), iterations: typeof source.iterations === "number" && Number.isFinite(source.iterations) && source.iterations > 0 ? source.iterations : undefined, lockAfterMinutes: positiveMinutes(source.lockAfterMinutes, DEFAULT_LOCK_SETTINGS.lockAfterMinutes), lockOnHiddenMinutes: positiveMinutes(source.lockOnHiddenMinutes, DEFAULT_LOCK_SETTINGS.lockOnHiddenMinutes), requireOnStart: source.requireOnStart === true, sessionOnlyUnlock: source.sessionOnlyUnlock !== false, updatedAt: optionalText(source.updatedAt) } : { ...DEFAULT_LOCK_SETTINGS };
  } catch {
    return { ...DEFAULT_LOCK_SETTINGS };
  }
}
export const saveLockSettings = (value: LockSettings): void => save(LOCK_SETTINGS_KEY, value);

function normalizeDiagnosticFinding(value: unknown): NonNullable<DiagnosticsMetadata["lastHealthResult"]>[number] | undefined {
  const source = object(value); const id = text(source?.id);
  if (!source || !id) return undefined;
  return { id, severity: oneOf(source.severity, ["Critical", "Warning", "Informational"] as const, "Warning"), area: text(source.area, "Storage"), message: text(source.message, "A local diagnostic finding requires review."), reportId: optionalText(source.reportId), repairable: source.repairable === true, details: optionalText(source.details) };
}
export function loadDiagnostics(): DiagnosticsMetadata {
  try {
    const source = object(JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) ?? "null"));
    if (!source) return {};
    const lastHealthResult = Array.isArray(source.lastHealthResult) ? source.lastHealthResult.flatMap((item) => {
      const finding = normalizeDiagnosticFinding(item);
      return finding ? [finding] : [];
    }) : undefined;
    return { lastBackupAt: optionalText(source.lastBackupAt), lastRestoreAt: optionalText(source.lastRestoreAt), lastIntegrityScanAt: optionalText(source.lastIntegrityScanAt), lastHealthScanAt: optionalText(source.lastHealthScanAt), lastHealthResult, ignoredWarningIds: strings(source.ignoredWarningIds) };
  } catch {
    return {};
  }
}
export const saveDiagnostics = (value: DiagnosticsMetadata): void => save(DIAGNOSTICS_KEY, value);
