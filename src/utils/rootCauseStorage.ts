import type { RootCauseEntry } from "../types/phase6";
import { generateReportId } from "./reportHelpers";
import { loadRootCauses, saveRootCauses } from "./phase6Storage";
export { loadRootCauses, saveRootCauses };
const starter: Array<[string, RootCauseEntry["category"], string]> = [
  [
    "Missing server-side authorization check",
    "Authorization",
    "Enforce authorization checks on the server for every sensitive action.",
  ],
  [
    "Inconsistent role validation",
    "Authorization",
    "Centralize role validation and test each protected action.",
  ],
  [
    "Insufficient output encoding",
    "Output Encoding",
    "Apply context-aware output encoding at each rendering boundary.",
  ],
  [
    "Excessive data returned by API",
    "Data Exposure",
    "Minimize returned fields and enforce object-level data access.",
  ],
  [
    "Missing rate-limit enforcement",
    "Configuration",
    "Apply proportionate server-side rate limits and monitoring.",
  ],
  [
    "Insecure default configuration",
    "Configuration",
    "Use secure defaults and document any approved exceptions.",
  ],
  [
    "Weak session invalidation",
    "Session Management",
    "Invalidate and rotate sessions when account state changes.",
  ],
  [
    "Missing ownership validation",
    "Authorization",
    "Check object ownership before reading or modifying resources.",
  ],
  [
    "Unsafe file validation",
    "Input Handling",
    "Validate file type, content, size, and storage handling on the server.",
  ],
  [
    "Business-rule enforcement gap",
    "Business Logic",
    "Enforce critical workflow rules server-side and cover exception paths.",
  ],
];
export function builtInRootCauses(): RootCauseEntry[] {
  return starter.map(([name, category, defensiveGuidance], index) => ({
    id: `builtin-root-cause-${index + 1}`,
    name,
    category,
    defensiveGuidance,
    reportIds: [],
    custom: false,
    createdAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
  }));
}
export function duplicateRootCause(entry: RootCauseEntry): RootCauseEntry {
  const now = new Date().toISOString();
  return {
    ...entry,
    id: generateReportId(),
    name: `${entry.name} (custom)`,
    custom: true,
    reportIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
