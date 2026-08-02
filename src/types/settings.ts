import type { CvssMode, ReportStatus } from "./report";

export interface ResearcherSettings {
  researcherName: string;
  publicHandle: string;
  email: string;
  defaultPlatform: string;
  defaultReportStatus: ReportStatus;
  defaultCvssMode: CvssMode;
}

export interface ExportPreferences {
  includeDisclosureTimeline: boolean;
  includeReferences: boolean;
  includeEvidenceDescriptions: boolean;
  includeReportReferenceInHeader: boolean;
  includeResearcherNameInFooter: boolean;
}

export interface AppSettings {
  profile: ResearcherSettings;
  exportPreferences: ExportPreferences;
}

export type InstalledModelName = string;

export interface AiSettings {
  enabled: boolean; baseUrl: string; selectedModel: InstalledModelName; requestTimeoutMs: number; maxContextCharacters: number;
  streamResponses: boolean; includeReportMetadata: boolean; includeEvidenceDescriptions: boolean; includeKnowledgeContext: boolean;
  persistConversations: boolean; tone: "Professional" | "Concise" | "Technical" | "Platform Submission" | "Direct Email";
  detail: "Brief" | "Balanced" | "Detailed"; neutralLanguage: boolean; preserveTechnicalTerms: boolean; avoidExaggeration: boolean; englishVariant: "US" | "UK"; customInstruction: string; lastConnectionAt?: string; lastGenerationAt?: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = { enabled: false, baseUrl: "http://localhost:11434", selectedModel: "", requestTimeoutMs: 60000, maxContextCharacters: 24000, streamResponses: true, includeReportMetadata: true, includeEvidenceDescriptions: false, includeKnowledgeContext: false, persistConversations: false, tone: "Professional", detail: "Balanced", neutralLanguage: true, preserveTechnicalTerms: true, avoidExaggeration: true, englishVariant: "US", customInstruction: "" };

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    researcherName: "",
    publicHandle: "",
    email: "",
    defaultPlatform: "",
    defaultReportStatus: "Draft",
    defaultCvssMode: "calculated",
  },
  exportPreferences: {
    includeDisclosureTimeline: true,
    includeReferences: true,
    includeEvidenceDescriptions: true,
    includeReportReferenceInHeader: true,
    includeResearcherNameInFooter: true,
  },
};
