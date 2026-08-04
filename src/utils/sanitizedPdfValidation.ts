import type { Report } from "../types/report";
import type { SanitizedPdfData } from "../types/pdf";
import { scanReportText } from "./redactionScanner";

export interface SanitizedPdfValidationResult {
  errors: string[];
  warnings: string[];
}

const validUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

function includesSensitiveValue(value: string, sensitive: string): boolean {
  return (
    sensitive.trim().length > 2 &&
    value.toLocaleLowerCase().includes(sensitive.trim().toLocaleLowerCase())
  );
}

function allPdfText(data: SanitizedPdfData): string[] {
  return [
    data.reportReference,
    data.title,
    data.status,
    data.preparedBy,
    data.program,
    data.platform,
    data.target,
    data.affectedAsset,
    data.vulnerableEndpoint,
    data.vulnerabilityType,
    data.vulnerabilityClass,
    data.cvssVector,
    data.executiveSummary,
    data.technicalDescription,
    data.prerequisites,
    data.securityImpact,
    data.remediation,
    ...data.structuredSteps.flatMap((step) => [
      step.title,
      step.instruction,
      step.expectedResult,
      step.observedResult,
    ]),
    ...data.evidenceItems.flatMap((item) => [
      item.title,
      item.description,
      item.url,
    ]),
    ...data.references.flatMap((item) => [item.label, item.url]),
    ...data.disclosureTimeline.flatMap((item) => [item.date, item.event]),
  ].filter((value): value is string => Boolean(value));
}

export function validateSanitizedPdfData(
  data: SanitizedPdfData,
  original: Report,
): SanitizedPdfValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.title.trim())
    errors.push(
      "A sanitized report title is required before generating a professional PDF.",
    );

  const text = allPdfText(data);
  const protectedValues = [
    ["original target", original.target],
    ["original endpoint", original.vulnerableEndpoint],
    ["original program", original.programName],
    ["original researcher name", original.researcherName],
    ["submission ID", original.submissionDetails.submissionId ?? ""],
    ["analyst name", original.submissionDetails.analystName ?? ""],
  ] as const;
  for (const [label, value] of protectedValues) {
    if (text.some((candidate) => includesSensitiveValue(candidate, value)))
      errors.push(
        `The sanitized PDF model still contains the ${label}. Review and enable the relevant sanitization replacement first.`,
      );
  }

  const findings = scanReportText({ export: text.join("\n") });
  if (findings.some((finding) => finding.confidence === "High"))
    warnings.push(
      "High-confidence sensitive-data patterns remain in the sanitized PDF content. Review them before continuing.",
    );
  if (original.redactionScanSummary?.unresolvedHighConfidenceCount)
    warnings.push(
      "The source report has unresolved high-confidence sensitive-data findings. Confirm that they have been reviewed before sharing.",
    );

  if (/\bin this unauthorized activity\b/i.test(data.executiveSummary ?? ""))
    warnings.push(
      "The executive summary contains wording inconsistent with an authorized bug bounty report. Review it in the editor before export if it is not intentional.",
    );

  if (
    data.structuredSteps.some(
      (step) =>
        step.expectedResult?.trim() &&
        step.expectedResult.trim() === step.observedResult?.trim(),
    )
  )
    warnings.push(
      "At least one structured step has identical Expected and Observed results. Review it before export.",
    );

  for (const url of [
    ...data.references.map((item) => item.url),
    ...data.evidenceItems.flatMap((item) => (item.url ? [item.url] : [])),
  ]) {
    if (!validUrl(url)) {
      errors.push(
        "A URL included in the sanitized PDF is invalid. Correct or remove it before export.",
      );
      continue;
    }
    const parsed = new URL(url);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname === "::1" ||
      /^127\./.test(parsed.hostname)
    )
      errors.push(
        "The sanitized PDF cannot include localhost or loopback URLs.",
      );
  }

  if (
    text.some((value) =>
      /file:\/\/|\b(?:localhost|0\.0\.0\.0)\b|\b127(?:\.\d{1,3}){3}\b/i.test(
        value,
      ),
    )
  )
    errors.push(
      "The sanitized PDF cannot include local file paths or localhost values.",
    );

  for (const evidence of data.evidenceItems.filter(
    (item) => item.imageDataUrl,
  )) {
    if (!/^data:image\/(png|jpeg);base64,/i.test(evidence.imageDataUrl ?? ""))
      errors.push(
        `Image evidence “${evidence.title}” is not a supported sanitized PNG or JPEG image.`,
      );
  }
  if (
    original.evidenceItems.some((item) => item.type === "image") &&
    !data.evidenceItems.some((item) => item.imageDataUrl)
  )
    warnings.push(
      "Original image evidence is excluded. Only explicitly selected sanitized PNG or JPEG replacements can be included in this PDF.",
    );

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}
