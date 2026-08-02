import { DEFAULT_SETTINGS, type AppSettings } from "../types/settings";
import { REPORT_STATUSES, type ReportStatus } from "../types/report";

export const SETTINGS_STORAGE_KEY = "bug-bounty-report-settings";

export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const source: unknown = JSON.parse(raw);
    if (!source || typeof source !== "object") return structuredClone(DEFAULT_SETTINGS);
    const data = source as Record<string, unknown>;
    const profile = data.profile && typeof data.profile === "object" ? data.profile as Record<string, unknown> : {};
    const preferences = data.exportPreferences && typeof data.exportPreferences === "object" ? data.exportPreferences as Record<string, unknown> : {};
    const defaultStatus: ReportStatus = typeof profile.defaultReportStatus === "string" && REPORT_STATUSES.includes(profile.defaultReportStatus as ReportStatus) ? profile.defaultReportStatus as ReportStatus : "Draft";
    return {
      profile: {
        researcherName: typeof profile.researcherName === "string" ? profile.researcherName : "",
        publicHandle: typeof profile.publicHandle === "string" ? profile.publicHandle : "",
        email: typeof profile.email === "string" ? profile.email : "",
        defaultPlatform: typeof profile.defaultPlatform === "string" ? profile.defaultPlatform : "",
        defaultReportStatus: defaultStatus,
        defaultCvssMode: profile.defaultCvssMode === "manual" ? "manual" : "calculated",
      },
      exportPreferences: {
        includeDisclosureTimeline: preferences.includeDisclosureTimeline !== false,
        includeReferences: preferences.includeReferences !== false,
        includeEvidenceDescriptions: preferences.includeEvidenceDescriptions !== false,
        includeReportReferenceInHeader: preferences.includeReportReferenceInHeader !== false,
        includeResearcherNameInFooter: preferences.includeResearcherNameInFooter !== false,
      },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: AppSettings): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
