import { DEFAULT_AI_SETTINGS, type AiSettings } from "../types/settings";
export const AI_SETTINGS_KEY = "bug-bounty-report-ai-settings";
export const AI_CONVERSATIONS_KEY = "bug-bounty-report-ai-conversations";
export const REDACTION_SETTINGS_KEY = "bug-bounty-report-redaction-settings";
const text = (value: unknown, fallback: string): string => typeof value === "string" ? value : fallback;
const positive = (value: unknown, fallback: number): number => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
const oneOf = <T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] => typeof value === "string" && values.includes(value) ? value as T[number] : fallback;
export function loadAiSettings(): AiSettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) ?? "null");
    const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return {
      enabled: value.enabled === true, baseUrl: text(value.baseUrl, DEFAULT_AI_SETTINGS.baseUrl), selectedModel: text(value.selectedModel, DEFAULT_AI_SETTINGS.selectedModel), requestTimeoutMs: positive(value.requestTimeoutMs, DEFAULT_AI_SETTINGS.requestTimeoutMs), maxContextCharacters: positive(value.maxContextCharacters, DEFAULT_AI_SETTINGS.maxContextCharacters), streamResponses: value.streamResponses !== false, includeReportMetadata: value.includeReportMetadata !== false, includeEvidenceDescriptions: value.includeEvidenceDescriptions === true, includeKnowledgeContext: value.includeKnowledgeContext === true, persistConversations: value.persistConversations === true, tone: oneOf(value.tone, ["Professional", "Concise", "Technical", "Platform Submission", "Direct Email"] as const, DEFAULT_AI_SETTINGS.tone), detail: oneOf(value.detail, ["Brief", "Balanced", "Detailed"] as const, DEFAULT_AI_SETTINGS.detail), neutralLanguage: value.neutralLanguage !== false, preserveTechnicalTerms: value.preserveTechnicalTerms !== false, avoidExaggeration: value.avoidExaggeration !== false, englishVariant: oneOf(value.englishVariant, ["US", "UK"] as const, DEFAULT_AI_SETTINGS.englishVariant), customInstruction: text(value.customInstruction, DEFAULT_AI_SETTINGS.customInstruction), lastConnectionAt: typeof value.lastConnectionAt === "string" ? value.lastConnectionAt : undefined, lastGenerationAt: typeof value.lastGenerationAt === "string" ? value.lastGenerationAt : undefined,
    };
  } catch { return { ...DEFAULT_AI_SETTINGS }; }
}
export function saveAiSettings(value: AiSettings): void { localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(value)); }
