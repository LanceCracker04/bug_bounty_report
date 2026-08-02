import type { AssetRecord, AssetType, ProgramPlatform, ProgramProfile, ScopeDisposition, ScopeRule, ScopeRuleType } from "../types/program";

export const PROGRAMS_KEY = "bug-bounty-report-programs";
export const ASSETS_KEY = "bug-bounty-report-assets";

const programPlatforms: ProgramPlatform[] = ["HackerOne", "Bugcrowd", "Intigriti", "YesWeHack", "Private Program", "Direct Disclosure", "Other"];
const scopeTypes: ScopeRuleType[] = ["Exact Domain", "Wildcard Domain", "Exact URL", "URL Prefix", "API Host", "Mobile Application", "Repository", "Other"];
const scopeDispositions: ScopeDisposition[] = ["In Scope", "Out of Scope", "Conditional", "Unknown"];
const assetTypes: AssetType[] = ["Domain", "Subdomain", "URL", "API", "Web Application", "Mobile Application", "Repository", "IP Address", "Other"];
const environments = ["Production", "Staging", "Development", "Unknown"] as const;
const now = (): string => new Date().toISOString();
const object = (value: unknown): Record<string, unknown> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const text = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;
const optionalText = (value: unknown): string | undefined => text(value).trim() || undefined;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const oneOf = <T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] => typeof value === "string" && values.includes(value) ? value as T[number] : fallback;

function parse(key: string): unknown[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeScopeRules(value: unknown, programId: string): ScopeRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const source = object(item); if (!source) return [];
    return [{ id: text(source.id, `${programId}-scope-${index + 1}`), type: oneOf(source.type, scopeTypes, "Other"), value: text(source.value), disposition: oneOf(source.disposition, scopeDispositions, "Unknown"), description: optionalText(source.description), conditions: optionalText(source.conditions), sourceUrl: optionalText(source.sourceUrl), lastVerifiedAt: optionalText(source.lastVerifiedAt) }];
  });
}

function normalizeProgram(value: unknown): ProgramProfile | undefined {
  const source = object(value); const id = text(source?.id);
  if (!source || !id) return undefined;
  return { id, name: text(source.name), platform: oneOf(source.platform, programPlatforms, "Other"), programUrl: optionalText(source.programUrl), policyUrl: optionalText(source.policyUrl), contactEmail: optionalText(source.contactEmail), safeHarborSummary: optionalText(source.safeHarborSummary), disclosurePolicySummary: optionalText(source.disclosurePolicySummary), testingRestrictions: optionalText(source.testingRestrictions), rewardSummary: optionalText(source.rewardSummary), responseExpectation: optionalText(source.responseExpectation), notes: optionalText(source.notes), scopeRules: normalizeScopeRules(source.scopeRules, id), createdAt: text(source.createdAt, now()), updatedAt: text(source.updatedAt, now()), archivedAt: optionalText(source.archivedAt) };
}

function normalizeAsset(value: unknown): AssetRecord | undefined {
  const source = object(value); const id = text(source?.id);
  if (!source || !id) return undefined;
  return { id, programId: optionalText(source.programId), name: text(source.name), value: text(source.value), type: oneOf(source.type, assetTypes, "Other"), environment: oneOf(source.environment, environments, "Unknown"), scopeDisposition: oneOf(source.scopeDisposition, scopeDispositions, "Unknown"), scopeRuleId: optionalText(source.scopeRuleId), tags: strings(source.tags), notes: optionalText(source.notes), firstObservedAt: optionalText(source.firstObservedAt), lastReviewedAt: optionalText(source.lastReviewedAt), archivedAt: optionalText(source.archivedAt), createdAt: text(source.createdAt, now()), updatedAt: text(source.updatedAt, now()) };
}

export function loadPrograms(): ProgramProfile[] { return parse(PROGRAMS_KEY).flatMap((item) => { const program = normalizeProgram(item); return program ? [program] : []; }); }
export function savePrograms(value: ProgramProfile[]): void { localStorage.setItem(PROGRAMS_KEY, JSON.stringify(value)); }
export function loadAssets(): AssetRecord[] { return parse(ASSETS_KEY).flatMap((item) => { const asset = normalizeAsset(item); return asset ? [asset] : []; }); }
export function saveAssets(value: AssetRecord[]): void { localStorage.setItem(ASSETS_KEY, JSON.stringify(value)); }
