import type { Report, ReportStatus, Severity } from "../types/report";
import { generateReportReference } from "./reportReference";

export function generateReportId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function filterReports(
  reports: Report[],
  searchQuery: string,
  severity: Severity | "all",
  status: ReportStatus | "all",
): Report[] {
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  return reports
    .filter((report) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          report.title,
          report.programName,
          report.target,
          report.vulnerabilityType,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      const matchesSeverity =
        severity === "all" || report.severity === severity;
      const matchesStatus = status === "all" || report.status === status;
      return matchesSearch && matchesSeverity && matchesStatus;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export type ReportSortField = "updatedAt" | "createdAt" | "severity" | "status";
export type SortDirection = "asc" | "desc";

const severityOrder: Record<Severity, number> = {
  Informational: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

export function sortReports(
  reports: Report[],
  field: ReportSortField,
  direction: SortDirection,
): Report[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...reports].sort((first, second) => {
    if (field === "severity")
      return (
        (severityOrder[first.severity] - severityOrder[second.severity]) *
        multiplier
      );
    if (field === "status")
      return first.status.localeCompare(second.status) * multiplier;
    return (
      (new Date(first[field]).getTime() - new Date(second[field]).getTime()) *
      multiplier
    );
  });
}

export function createDuplicate(
  report: Report,
  existingReports: Report[],
): Report {
  const timestamp = new Date().toISOString();
  const duplicateId = generateReportId();
  const evidenceIds = new Map(
    report.evidenceItems.map((item) => [item.id, generateReportId()]),
  );
  const duplicatedEvidence = report.evidenceItems.map((item) => ({
    ...item,
    id: evidenceIds.get(item.id) ?? generateReportId(),
    reportId: duplicateId,
    type: item.type === "image" ? ("text" as const) : item.type,
    title:
      item.type === "image"
        ? `${item.title} (attachment not copied)`
        : item.title,
    description:
      item.type === "image"
        ? [
            item.description,
            "Image attachment was not copied to this duplicate.",
          ]
            .filter(Boolean)
            .join(" ")
        : item.description,
    fileName: item.type === "image" ? undefined : item.fileName,
    mimeType: item.type === "image" ? undefined : item.mimeType,
  }));
  return {
    ...report,
    id: duplicateId,
    reportReference: generateReportReference(existingReports),
    title: `Copy of ${report.title}`,
    status: "Draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastAutosavedAt: undefined,
    evidenceItems: duplicatedEvidence,
    structuredSteps: report.structuredSteps.map((step) => ({
      ...step,
      id: generateReportId(),
      evidenceIds: step.evidenceIds.flatMap((id) =>
        evidenceIds.has(id) ? [evidenceIds.get(id) as string] : [],
      ),
    })),
  };
}

export function formatUpdatedAt(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
