export interface KnowledgeEntry {
  id: string;
  name: string;
  category: string;
  definition: string;
  indicators: string[];
  evidenceChecklist: string[];
  reportQuestions: string[];
  impactGuidance: string;
  remediationGuidance: string;
  suggestedSections: string[];
  references: Array<{ label: string; url: string }>;
  tags: string[];
  isBuiltIn: boolean;
  createdAt?: string;
  updatedAt?: string;
}
