import type { ProgramProfile, ScopeRule } from "../types/program";
export interface ScopeValidationResult {
  status:
    | "Matched In Scope"
    | "Matched Out of Scope"
    | "Conditional"
    | "No Matching Rule"
    | "Invalid Target";
  matchedRuleId?: string;
  normalizedTarget?: string;
  reasons: string[];
  checkedAt: string;
}
function normalize(value: string): URL | undefined {
  try {
    const raw = value.trim();
    return new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`,
    );
  } catch {
    return undefined;
  }
}
function matches(target: URL, rule: ScopeRule): boolean {
  const value = rule.value.trim().toLowerCase().replace(/\/$/, "");
  const host = target.hostname.toLowerCase();
  if (rule.type === "Exact Domain" || rule.type === "API Host")
    return host === value;
  if (rule.type === "Wildcard Domain")
    return (
      host === value.replace(/^\*\./, "") ||
      host.endsWith(`.${value.replace(/^\*\./, "")}`)
    );
  if (rule.type === "Exact URL")
    return (
      target.href.replace(/\/$/, "").toLowerCase() === value.replace(/\/$/, "")
    );
  if (rule.type === "URL Prefix")
    return target.href.toLowerCase().startsWith(value);
  return host === value || target.href.toLowerCase().includes(value);
}
export function validateScope(
  targetValue: string,
  program?: ProgramProfile,
): ScopeValidationResult {
  const target = normalize(targetValue);
  if (!target)
    return {
      status: "Invalid Target",
      reasons: ["Target could not be parsed as a URL or hostname."],
      checkedAt: new Date().toISOString(),
    };
  if (!program)
    return {
      status: "No Matching Rule",
      normalizedTarget: target.href,
      reasons: [
        "No program profile is linked; this result is not an authorization decision.",
      ],
      checkedAt: new Date().toISOString(),
    };
  const found = program.scopeRules.filter((rule) => matches(target, rule));
  const prioritized = found.sort(
    (a, b) =>
      (a.disposition === "Out of Scope"
        ? -2
        : a.type === "Exact URL"
          ? -1
          : 0) -
      (b.disposition === "Out of Scope" ? -2 : b.type === "Exact URL" ? -1 : 0),
  )[0];
  if (!prioritized)
    return {
      status: "No Matching Rule",
      normalizedTarget: target.href,
      reasons: ["No matching scope rule was found; review manually."],
      checkedAt: new Date().toISOString(),
    };
  return {
    status:
      prioritized.disposition === "Out of Scope"
        ? "Matched Out of Scope"
        : prioritized.disposition === "Conditional"
          ? "Conditional"
          : "Matched In Scope",
    matchedRuleId: prioritized.id,
    normalizedTarget: target.href,
    reasons: [
      prioritized.description ??
        `Matched ${prioritized.type}: ${prioritized.value}`,
      ...(prioritized.conditions
        ? [`Conditions: ${prioritized.conditions}`]
        : []),
    ],
    checkedAt: new Date().toISOString(),
  };
}
