import { DIAGNOSTICS_KEY, LOCK_SETTINGS_KEY } from "./phase6Storage";
import { REPORT_STORAGE_KEY } from "./reportStorage";

const optionalKeys = ["bug-bounty-report-retests", "bug-bounty-report-finding-families", "bug-bounty-report-root-causes", "bug-bounty-report-communications", "bug-bounty-report-information-requests", "bug-bounty-report-sanitization-profiles", LOCK_SETTINGS_KEY, "bug-bounty-report-layout-settings", DIAGNOSTICS_KEY];
export interface StorageKeyStatus { key: string; state: "Missing" | "Valid JSON" | "Malformed JSON" | "Unavailable"; }
export function storageKeyStatus(): StorageKeyStatus[] {
  return [REPORT_STORAGE_KEY, ...optionalKeys].map((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { key, state: "Missing" as const };
      try { JSON.parse(raw); return { key, state: "Valid JSON" as const }; } catch { return { key, state: "Malformed JSON" as const }; }
    } catch {
      return { key, state: "Unavailable" as const };
    }
  });
}
export function shouldStartSafeRecovery(): boolean { return storageKeyStatus().some((item) => item.state === "Malformed JSON"); }
export function exportRawMetadataBackup(): void {
  const data = Object.fromEntries(storageKeyStatus().map(({ key, state }) => {
    try { return [key, { state, value: localStorage.getItem(key) }]; } catch { return [key, { state, value: null }]; }
  }));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "bug-bounty-report-raw-metadata-recovery.json"; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}
