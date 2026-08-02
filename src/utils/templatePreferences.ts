export const TEMPLATE_PREFERENCES_KEY = "bug-bounty-report-template-preferences";
export interface TemplatePreference { templateId: string; favorite: boolean; usageCount: number; lastUsedAt?: string; }

export function loadTemplatePreferences(): TemplatePreference[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(TEMPLATE_PREFERENCES_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const source = item as Partial<TemplatePreference>;
      if (typeof source.templateId !== "string") return [];
      return [{ templateId: source.templateId, favorite: source.favorite === true, usageCount: typeof source.usageCount === "number" && source.usageCount >= 0 ? source.usageCount : 0, lastUsedAt: typeof source.lastUsedAt === "string" ? source.lastUsedAt : undefined }];
    }) : [];
  } catch { return []; }
}
export function saveTemplatePreferences(value: TemplatePreference[]): void { localStorage.setItem(TEMPLATE_PREFERENCES_KEY, JSON.stringify(value)); }
export function preferenceFor(values: TemplatePreference[], templateId: string): TemplatePreference { return values.find((item) => item.templateId === templateId) ?? { templateId, favorite: false, usageCount: 0 }; }
