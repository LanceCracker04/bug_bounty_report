import type { ReferenceItem, ReproductionStep, Severity, TimelineItem } from "./report";

export type TemplateDifficulty = "Beginner" | "Intermediate" | "Advanced";
export interface TemplateExample {
  title: string;
  programName?: string;
  platform?: string;
  target?: string;
  vulnerableEndpoint?: string;
  affectedAsset?: string;
  vulnerabilityType: string;
  vulnerabilityClass?: string;
  severity?: Severity;
  cvssScore?: number;
  cvssVector?: string;
  summary: string;
  description: string;
  prerequisites?: string;
  structuredSteps: ReproductionStep[];
  impact: string;
  remediation: string;
  evidenceSuggestions: string[];
  references?: ReferenceItem[];
  disclosureTimeline?: TimelineItem[];
}

export interface TemplateSectionPrompts {
  title?: string;
  summary?: string;
  description?: string;
  prerequisites?: string;
  reproduction?: string;
  impact?: string;
  remediation?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  /** Legacy boolean retained for saved template compatibility. */
  isBuiltIn: boolean;
  /** Preferred rich-template field; mirrors isBuiltIn when present. */
  builtIn?: boolean;
  category?: string;
  shortDescription?: string;
  difficulty?: TemplateDifficulty;
  tags?: string[];
  vulnerabilityType: string;
  vulnerabilityClass: string;
  sectionPrompts?: TemplateSectionPrompts;
  evidenceChecklist?: string[];
  questionsToAnswer?: string[];
  commonMistakes?: string[];
  example?: TemplateExample;
  relatedKnowledgeIds?: string[];
  usageCount?: number;
  lastUsedAt?: string;
  favorite?: boolean;
  // Legacy fields remain supported and are synchronized by storage helpers.
  summaryPrompt: string;
  descriptionPrompt: string;
  impactPrompt: string;
  remediationPrompt: string;
  reproductionSteps: ReproductionStep[];
  createdAt?: string;
  updatedAt?: string;
}
