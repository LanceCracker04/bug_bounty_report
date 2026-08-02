export interface SanitizedPdfStep {
  title: string;
  instruction: string;
  expectedResult?: string;
  observedResult?: string;
}

export interface SanitizedPdfEvidence {
  title: string;
  type: "Text" | "URL" | "Image" | "Transcript";
  description?: string;
  url?: string;
  imageDataUrl?: string;
  imageLabel?: "Redacted Evidence" | "Annotated Evidence" | "Sanitized Evidence";
}

export interface SanitizedPdfReference {
  label: string;
  url: string;
}

export interface SanitizedPdfTimelineItem {
  date?: string;
  event: string;
}

export interface SanitizedPdfData {
  reportReference: string;
  title: string;
  status: string;
  preparedBy: string;
  program: string;
  platform?: string;
  target: string;
  affectedAsset?: string;
  vulnerableEndpoint?: string;
  vulnerabilityType: string;
  vulnerabilityClass?: string;
  severity: string;
  cvssScore?: number;
  cvssVector?: string;
  createdAt?: string;
  updatedAt?: string;
  discoveredAt?: string;
  executiveSummary?: string;
  technicalDescription?: string;
  prerequisites?: string;
  structuredSteps: SanitizedPdfStep[];
  securityImpact?: string;
  evidenceItems: SanitizedPdfEvidence[];
  remediation?: string;
  references: SanitizedPdfReference[];
  disclosureTimeline: SanitizedPdfTimelineItem[];
  sanitizationLabel: string;
}

export interface SanitizedPdfImageInput {
  dataUrl: string;
  label: "Redacted Evidence" | "Annotated Evidence" | "Sanitized Evidence";
}
