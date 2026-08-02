import type { SanitizedReportCopy } from "../types/phase6";
import type { SanitizedPdfData, SanitizedPdfImageInput } from "../types/pdf";

interface BuildSanitizedPdfDataOptions {
  sanitizedImageInputs?: Record<string, SanitizedPdfImageInput | undefined>;
  sanitizedUrlOverrides?: Record<string, string | undefined>;
}

function plainText(value: string | undefined): string | undefined {
  const normalized = value
    ?.replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm, "")
    .trim();
  return normalized || undefined;
}

function score(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function evidenceType(type: string): "Text" | "URL" | "Image" | "Transcript" {
  if (type === "url") return "URL";
  if (type === "image") return "Image";
  return "Text";
}

export function buildSanitizedPdfData(copy: SanitizedReportCopy, options: BuildSanitizedPdfDataOptions = {}): SanitizedPdfData {
  const report = copy.report;
  const structuredSteps = report.structuredSteps.length
    ? report.structuredSteps.map((step) => ({
      title: plainText(step.title) ?? "Reproduction step",
      instruction: plainText(step.instruction) ?? "",
      expectedResult: plainText(step.expectedResult),
      observedResult: plainText(step.actualResult),
    }))
    : report.reproductionSteps.trim()
      ? [{ title: "Reproduction notes", instruction: plainText(report.reproductionSteps) ?? "" }]
      : [];

  const evidenceItems = report.evidenceItems.map((item, index) => {
    const image = options.sanitizedImageInputs?.[item.id];
    const url = options.sanitizedUrlOverrides?.[item.id]?.trim();
    return {
      title: plainText(item.title) ?? `Evidence ${index + 1}`,
      type: evidenceType(item.type),
      description: plainText(item.description),
      ...(item.type === "url" && url ? { url } : {}),
      ...(item.type === "image" && image ? { imageDataUrl: image.dataUrl, imageLabel: image.label } : {}),
    };
  });

  if (report.evidence.trim()) {
    evidenceItems.unshift({ title: "Sanitized evidence notes", type: "Text", description: plainText(report.evidence) });
  }

  return {
    reportReference: report.reportReference,
    title: plainText(report.title) ?? "",
    status: report.status,
    preparedBy: plainText(report.researcherName) ?? "Researcher",
    program: plainText(report.programName) ?? "[PROGRAM]",
    platform: plainText(report.platform),
    target: plainText(report.target) ?? "Not specified",
    affectedAsset: plainText(report.affectedAsset),
    vulnerableEndpoint: plainText(report.vulnerableEndpoint),
    vulnerabilityType: plainText(report.vulnerabilityType) ?? "Not specified",
    vulnerabilityClass: plainText(report.vulnerabilityClass),
    severity: report.severity,
    cvssScore: score(report.cvssScore),
    cvssVector: plainText(report.cvssVector),
    createdAt: plainText(report.createdAt),
    updatedAt: plainText(report.updatedAt),
    discoveredAt: plainText(report.discoveredAt),
    executiveSummary: plainText(report.summary),
    technicalDescription: plainText(report.description),
    prerequisites: plainText(report.prerequisites),
    structuredSteps,
    securityImpact: plainText(report.impact),
    evidenceItems,
    remediation: plainText(report.remediation),
    references: report.references.map((reference) => ({ label: plainText(reference.label) ?? "Reference", url: reference.url.trim() })).filter((reference) => Boolean(reference.url)),
    disclosureTimeline: report.disclosureTimeline.map((item) => ({ date: plainText(item.date), event: plainText(item.event) ?? "" })).filter((item) => Boolean(item.event)),
    sanitizationLabel: `${copy.profile.mode} sanitization profile`,
  };
}
