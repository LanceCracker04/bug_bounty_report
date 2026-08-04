import type { Report } from "../types/report";

const REFERENCE_PATTERN = /^BBR-(\d{4})-(\d{4,})$/;

export function generateReportReference(
  reports: Pick<Report, "reportReference">[],
  date = new Date(),
): string {
  const year = date.getFullYear();
  const highestSequence = reports.reduce((highest, report) => {
    const match = report.reportReference.match(REFERENCE_PATTERN);
    if (!match || Number(match[1]) !== year) return highest;
    return Math.max(highest, Number(match[2]));
  }, 0);
  return `BBR-${year}-${String(highestSequence + 1).padStart(4, "0")}`;
}

export function isReportReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}
