import type { ActivityEntry, ActivityAction } from "../types/activity";
import { generateReportId } from "./reportHelpers";

export const ACTIVITY_STORAGE_KEY = "bug-bounty-report-activity";

export function loadActivities(): ActivityEntry[] {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Partial<ActivityEntry>;
      if (typeof entry.reportId !== "string" || typeof entry.action !== "string" || typeof entry.description !== "string") return [];
      return [{ id: typeof entry.id === "string" ? entry.id : generateReportId(), reportId: entry.reportId, timestamp: typeof entry.timestamp === "string" ? entry.timestamp : new Date().toISOString(), action: entry.action as ActivityAction, description: entry.description }];
    });
  } catch { return []; }
}

export function saveActivities(entries: ActivityEntry[]): void { window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(entries)); }

export function createActivity(reportId: string, action: ActivityAction, description: string): ActivityEntry {
  return { id: generateReportId(), reportId, action, description, timestamp: new Date().toISOString() };
}
