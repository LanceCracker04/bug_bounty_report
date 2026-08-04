import type { ReportSnapshot, SnapshotReason } from "../types/history";
import type { Report } from "../types/report";
import { generateReportId } from "./reportHelpers";
import { normalizeReports } from "./reportMigration";

export const HISTORY_STORAGE_KEY = "bug-bounty-report-history";
const MAX_AUTOMATIC_SNAPSHOTS = 20;

export function loadSnapshots(): ReportSnapshot[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const snapshot = item as Partial<ReportSnapshot>;
      if (
        typeof snapshot.reportId !== "string" ||
        !snapshot.data ||
        typeof snapshot.data !== "object"
      )
        return [];
      const normalized = normalizeReports([snapshot.data])[0];
      if (!normalized) return [];
      return [
        {
          id:
            typeof snapshot.id === "string" ? snapshot.id : generateReportId(),
          reportId: snapshot.reportId,
          createdAt:
            typeof snapshot.createdAt === "string"
              ? snapshot.createdAt
              : new Date().toISOString(),
          reason:
            typeof snapshot.reason === "string"
              ? (snapshot.reason as SnapshotReason)
              : "Manual Save",
          label:
            typeof snapshot.label === "string" ? snapshot.label : undefined,
          data: normalized,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: ReportSnapshot[]): void {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(snapshots));
}

export function createSnapshot(
  report: Report,
  reason: SnapshotReason,
  label?: string,
): ReportSnapshot {
  return {
    id: generateReportId(),
    reportId: report.id,
    createdAt: new Date().toISOString(),
    reason,
    label,
    data: structuredClone(report),
  };
}

export function addSnapshot(
  snapshots: ReportSnapshot[],
  snapshot: ReportSnapshot,
): ReportSnapshot[] {
  const sameReport = snapshots.filter(
    (item) => item.reportId === snapshot.reportId,
  );
  const automatic = sameReport.filter((item) => !item.label);
  const removeIds =
    automatic.length >= MAX_AUTOMATIC_SNAPSHOTS
      ? automatic
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          .slice(0, automatic.length - MAX_AUTOMATIC_SNAPSHOTS + 1)
          .map((item) => item.id)
      : [];
  return [
    snapshot,
    ...snapshots.filter((item) => !removeIds.includes(item.id)),
  ];
}
