import type { ReportDraft } from "../types/report";
import { EMPTY_REPORT_DRAFT } from "../types/report";

export type ImportFormat =
  | "Application JSON"
  | "Markdown"
  | "Plain Text"
  | "Generic JSON"
  | "HackerOne-style text"
  | "Bugcrowd-style text"
  | "Intigriti-style text";
export interface ImportMapping {
  format: ImportFormat;
  draft: ReportDraft;
  detected: string[];
  warnings: string[];
}
function section(text: string, heading: string): string {
  const match = new RegExp(
    `(?:^|\\n)#{0,3}\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s|$)`,
    "i",
  ).exec(text);
  return match?.[1]?.trim() ?? "";
}
function first(text: string, expression: RegExp): string {
  return expression.exec(text)?.[1]?.trim() ?? "";
}
export function parseInteroperabilityText(
  text: string,
  hint?: string,
): ImportMapping {
  const draft = structuredClone(EMPTY_REPORT_DRAFT);
  const json = (() => {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  })();
  const detected: string[] = [];
  const warnings: string[] = [];
  if (json && typeof json === "object") {
    const pick = (...keys: string[]) =>
      keys
        .map((key) => json[key])
        .find((value) => typeof value === "string") as string | undefined;
    draft.title = pick("title", "name") ?? "";
    draft.programName = pick("program", "programName") ?? "";
    draft.target = pick("target", "asset", "affected_asset") ?? "";
    draft.vulnerabilityType =
      pick("vulnerabilityType", "vulnerability_type", "weakness") ?? "";
    draft.summary = pick("summary", "description") ?? "";
    draft.description = pick("description", "details") ?? "";
    draft.reproductionSteps =
      pick("steps", "steps_to_reproduce", "proof_of_concept") ?? "";
    draft.impact = pick("impact", "business_impact") ?? "";
    draft.remediation = pick("remediation", "recommendation") ?? "";
    detected.push("Structured JSON");
  } else {
    draft.title =
      first(
        text,
        /(?:^|\n)(?:#\s*)?(?:title|vulnerability title)\s*:?\s*([^\n]+)/i,
      ) || first(text, /^#\s+([^\n]+)/m);
    draft.summary =
      section(text, "Summary") || section(text, "Executive Summary");
    draft.description =
      section(text, "Description") || section(text, "Vulnerability Details");
    draft.reproductionSteps =
      section(text, "Steps(?: To)? Reproduce") ||
      section(text, "Proof of Concept") ||
      section(text, "Reproduction");
    draft.impact = section(text, "Impact") || section(text, "Business Impact");
    draft.remediation =
      section(text, "Remediation") || section(text, "Recommendation");
    draft.target = first(text, /(?:target|affected asset)\s*:\s*([^\n]+)/i);
    draft.vulnerabilityType = first(
      text,
      /(?:vulnerability type|weakness)\s*:\s*([^\n]+)/i,
    );
    draft.cvssScore =
      first(text, /cvss(?: score)?\s*:\s*([0-9.]+)/i) || draft.cvssScore;
    detected.push(
      hint?.includes("HackerOne")
        ? "HackerOne-style headings"
        : hint?.includes("Bugcrowd")
          ? "Bugcrowd-style headings"
          : hint?.includes("Intigriti")
            ? "Intigriti-style headings"
            : "Text headings",
    );
  }
  if (!draft.title || !draft.reproductionSteps)
    warnings.push(
      "Some core fields were not detected; review the mapping before import.",
    );
  return {
    format: json
      ? "Generic JSON"
      : hint?.includes("HackerOne")
        ? "HackerOne-style text"
        : hint?.includes("Bugcrowd")
          ? "Bugcrowd-style text"
          : hint?.includes("Intigriti")
            ? "Intigriti-style text"
            : hint?.endsWith(".md")
              ? "Markdown"
              : "Plain Text",
    draft,
    detected,
    warnings,
  };
}
