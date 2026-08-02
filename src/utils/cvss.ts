import type { CvssMetrics, Severity } from "../types/report";

const attackVector = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 } as const;
const attackComplexity = { L: 0.77, H: 0.44 } as const;
const userInteraction = { N: 0.85, R: 0.62 } as const;
const impact = { N: 0, L: 0.22, H: 0.56 } as const;

function privilegesRequired(value: CvssMetrics["privilegesRequired"], scope: CvssMetrics["scope"]): number {
  if (scope === "U") return { N: 0.85, L: 0.62, H: 0.27 }[value];
  return { N: 0.85, L: 0.68, H: 0.5 }[value];
}

function roundUp(value: number): number {
  return Math.ceil((value - 0.000001) * 10) / 10;
}

export function calculateCvssBaseScore(metrics: CvssMetrics): number {
  const exploitability = 8.22 * attackVector[metrics.attackVector] * attackComplexity[metrics.attackComplexity]
    * privilegesRequired(metrics.privilegesRequired, metrics.scope) * userInteraction[metrics.userInteraction];
  const impactSubScore = 1 - ((1 - impact[metrics.confidentiality]) * (1 - impact[metrics.integrity]) * (1 - impact[metrics.availability]));
  const impactScore = metrics.scope === "U"
    ? 6.42 * impactSubScore
    : 7.52 * (impactSubScore - 0.029) - 3.25 * ((impactSubScore - 0.02) ** 15);
  if (impactScore <= 0) return 0;
  const score = metrics.scope === "U" ? Math.min(impactScore + exploitability, 10) : Math.min(1.08 * (impactScore + exploitability), 10);
  return roundUp(score);
}

export function createCvssVector(metrics: CvssMetrics): string {
  return `CVSS:3.1/AV:${metrics.attackVector}/AC:${metrics.attackComplexity}/PR:${metrics.privilegesRequired}/UI:${metrics.userInteraction}/S:${metrics.scope}/C:${metrics.confidentiality}/I:${metrics.integrity}/A:${metrics.availability}`;
}

export function severityFromCvss(score: number): Severity {
  if (score === 0) return "Informational";
  if (score < 4) return "Low";
  if (score < 7) return "Medium";
  if (score < 9) return "High";
  return "Critical";
}
