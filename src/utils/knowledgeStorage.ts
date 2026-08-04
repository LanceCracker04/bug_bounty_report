import type { KnowledgeEntry } from "../types/knowledge";

export const KNOWLEDGE_STORAGE_KEY = "bug-bounty-report-knowledge";

export function loadCustomKnowledge(): KnowledgeEntry[] {
  try {
    const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    const strings = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    return data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const source = item as Record<string, unknown>;
      if (typeof source.id !== "string" || typeof source.name !== "string")
        return [];
      const references = Array.isArray(source.references)
        ? source.references.flatMap((reference) => {
            if (!reference || typeof reference !== "object") return [];
            const entry = reference as Record<string, unknown>;
            return typeof entry.url === "string" && entry.url.trim()
              ? [
                  {
                    label:
                      typeof entry.label === "string" ? entry.label : entry.url,
                    url: entry.url,
                  },
                ]
              : [];
          })
        : [];
      return [
        {
          id: source.id,
          name: source.name,
          category:
            typeof source.category === "string" ? source.category : "General",
          definition:
            typeof source.definition === "string" ? source.definition : "",
          indicators: strings(source.indicators),
          evidenceChecklist: strings(source.evidenceChecklist),
          reportQuestions: strings(source.reportQuestions),
          impactGuidance:
            typeof source.impactGuidance === "string"
              ? source.impactGuidance
              : "",
          remediationGuidance:
            typeof source.remediationGuidance === "string"
              ? source.remediationGuidance
              : "",
          suggestedSections: strings(source.suggestedSections),
          references,
          tags: strings(source.tags),
          isBuiltIn: false,
          createdAt:
            typeof source.createdAt === "string" ? source.createdAt : undefined,
          updatedAt:
            typeof source.updatedAt === "string" ? source.updatedAt : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function saveCustomKnowledge(entries: KnowledgeEntry[]): void {
  window.localStorage.setItem(
    KNOWLEDGE_STORAGE_KEY,
    JSON.stringify(entries.map((entry) => ({ ...entry, isBuiltIn: false }))),
  );
}
