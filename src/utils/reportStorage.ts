import type { Report } from "../types/report";
import { normalizeReports } from "./reportMigration";

export const REPORT_STORAGE_KEY = "bug-bounty-reports";

export function loadReports(): Report[] {
  try {
    const storedReports = window.localStorage.getItem(REPORT_STORAGE_KEY);
    if (!storedReports) return [];
    return normalizeReports(JSON.parse(storedReports));
  } catch {
    return [];
  }
}

export function saveReports(reports: Report[]): void {
  try {
    window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    throw new Error("Unable to save reports in local storage.");
  }
}
