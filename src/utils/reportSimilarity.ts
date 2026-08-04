import type { Report } from "../types/report";
function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9/.-]+/g, " ")
      .split(/\s+/)
      .filter((item) => item.length > 2),
  );
}
function overlap(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size && !right.size) return 1;
  return (
    [...left].filter((item) => right.has(item)).length /
    new Set([...left, ...right]).size
  );
}
export interface SimilarityResult {
  reportId: string;
  score: number;
  level: "High overlap" | "Moderate overlap" | "Some overlap" | "Low overlap";
  matchingFields: string[];
  reasons: string[];
}
export function compareReports(a: Report, b: Report): SimilarityResult {
  const matching: string[] = [];
  let score = 0;
  if (
    a.programName &&
    a.programName.toLowerCase() === b.programName.toLowerCase()
  ) {
    score += 20;
    matching.push("Program");
  }
  if (a.target && a.target.toLowerCase() === b.target.toLowerCase()) {
    score += 20;
    matching.push("Target");
  }
  if (
    a.vulnerableEndpoint &&
    a.vulnerableEndpoint.toLowerCase() === b.vulnerableEndpoint.toLowerCase()
  ) {
    score += 25;
    matching.push("Vulnerable endpoint");
  }
  if (
    a.vulnerabilityType &&
    a.vulnerabilityType.toLowerCase() === b.vulnerabilityType.toLowerCase()
  ) {
    score += 10;
    matching.push("Vulnerability type");
  }
  const textScore = Math.round(
    overlap(
      `${a.title} ${a.summary} ${a.description} ${a.impact}`,
      `${b.title} ${b.summary} ${b.description} ${b.impact}`,
    ) * 25,
  );
  score += textScore;
  if (textScore >= 10) matching.push("Narrative text");
  const rounded = Math.min(100, score);
  return {
    reportId: b.id,
    score: rounded,
    level:
      rounded >= 85
        ? "High overlap"
        : rounded >= 65
          ? "Moderate overlap"
          : rounded >= 40
            ? "Some overlap"
            : "Low overlap",
    matchingFields: matching,
    reasons: matching.map((field) => `${field} matches or overlaps.`),
  };
}
