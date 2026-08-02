import JSZip from "jszip";
import type { ActivityEntry } from "../types/activity";
import type { ReportSnapshot } from "../types/history";
import type { KnowledgeEntry } from "../types/knowledge";
import type { Report } from "../types/report";
import type { AppSettings } from "../types/settings";
import type { ReportTemplate } from "../types/template";
import type { AssetRecord, ProgramProfile } from "../types/program";
import type { CommunicationEntry, DiagnosticsMetadata, FindingFamily, InformationRequest, LayoutSettings, RetestRecord, RootCauseEntry, SanitizationProfile } from "../types/phase6";
import { getAllEvidenceFiles, type StoredEvidenceFile } from "./evidenceDatabase";

export const BACKUP_SCHEMA_VERSION = 2;
export interface BackupManifest { application: "Bug Bounty Report"; schemaVersion: number; exportedAt: string; mode: "metadata" | "full"; evidence?: Array<Omit<StoredEvidenceFile, "blob"> & { path: string }>; }
export interface BackupData {
  reports: Report[]; templates: ReportTemplate[]; settings: AppSettings; knowledge: KnowledgeEntry[]; activity: ActivityEntry[]; history: ReportSnapshot[];
  programs?: ProgramProfile[]; assets?: AssetRecord[]; retests?: RetestRecord[]; findingFamilies?: FindingFamily[]; rootCauses?: RootCauseEntry[]; communications?: CommunicationEntry[]; informationRequests?: InformationRequest[]; sanitizationProfiles?: SanitizationProfile[]; layoutSettings?: LayoutSettings; diagnostics?: DiagnosticsMetadata;
}
export interface BackupPayload { manifest: BackupManifest; data: BackupData; }
export interface ParsedBackup { payload: BackupPayload; evidence: StoredEvidenceFile[]; warnings: string[]; }

export function downloadBlob(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0); }
export function backupFilename(extension: "json" | "zip" | "bbrvault"): string { return `bug-bounty-report-backup-${new Date().toISOString().slice(0, 10)}.${extension}`; }
export function createBackupPayload(data: BackupData, mode: "metadata" | "full", evidence?: BackupManifest["evidence"]): BackupPayload { return { manifest: { application: "Bug Bounty Report", schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: new Date().toISOString(), mode, evidence }, data }; }
export function exportMetadataBackup(data: BackupData): void { downloadBlob(new Blob([JSON.stringify(createBackupPayload(data, "metadata"), null, 2)], { type: "application/json" }), backupFilename("json")); }
function safeFileName(value: string): string { return value.replace(/[^a-zA-Z0-9._-]+/g, "-") || "evidence.bin"; }
function safeZipPath(value: string): boolean { return Boolean(value) && !value.includes("..") && !value.startsWith("/") && !value.includes("\\") && /^[a-zA-Z0-9._/-]+$/.test(value); }
const dataFiles: Array<[keyof BackupData, string]> = [["reports", "data/reports.json"], ["templates", "data/templates.json"], ["settings", "data/settings.json"], ["knowledge", "data/knowledge.json"], ["activity", "data/activity.json"], ["history", "data/history.json"], ["programs", "data/programs.json"], ["assets", "data/assets.json"], ["retests", "data/retests.json"], ["findingFamilies", "data/finding-families.json"], ["rootCauses", "data/root-causes.json"], ["communications", "data/communications.json"], ["informationRequests", "data/information-requests.json"], ["sanitizationProfiles", "data/sanitization-profiles.json"], ["layoutSettings", "data/layout-settings.json"], ["diagnostics", "data/diagnostics.json"]];

export async function createFullBackupBlob(data: BackupData, onProgress?: (percent: number) => void): Promise<Blob> {
  const evidenceFiles = await getAllEvidenceFiles();
  const evidence = evidenceFiles.map((file) => ({ evidenceId: file.evidenceId, reportId: file.reportId, fileName: file.fileName, mimeType: file.mimeType, createdAt: file.createdAt, path: `evidence/${safeFileName(file.reportId)}/${safeFileName(file.evidenceId)}-${safeFileName(file.fileName)}` }));
  const payload = createBackupPayload(data, "full", evidence); const zip = new JSZip(); zip.file("manifest.json", JSON.stringify(payload.manifest, null, 2));
  dataFiles.forEach(([key, path]) => zip.file(path, JSON.stringify(data[key] ?? (key === "settings" ? {} : []))));
  evidenceFiles.forEach((file, index) => zip.file(evidence[index].path, file.blob));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (metadata) => onProgress?.(Math.round(metadata.percent)));
}
export async function exportFullBackup(data: BackupData, onProgress?: (percent: number) => void): Promise<void> { downloadBlob(await createFullBackupBlob(data, onProgress), backupFilename("zip")); }

function validManifest(value: unknown): value is BackupManifest { return Boolean(value) && typeof value === "object" && (value as BackupManifest).application === "Bug Bounty Report" && [1, BACKUP_SCHEMA_VERSION].includes((value as BackupManifest).schemaVersion) && typeof (value as BackupManifest).exportedAt === "string" && (["metadata", "full"] as string[]).includes((value as BackupManifest).mode); }
function array<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function object<T>(value: unknown, fallback: T): T { return value && typeof value === "object" ? value as T : fallback; }
function validatePayload(value: unknown): BackupPayload {
  if (!value || typeof value !== "object") throw new Error("Backup is not a valid JSON object."); const source = value as Partial<BackupPayload>;
  if (!validManifest(source.manifest)) throw new Error("Backup manifest is missing or uses an unsupported schema version."); const data = object(source.data, {} as BackupData);
  if (!Array.isArray(data.reports)) throw new Error("Backup does not contain a reports array.");
  return { manifest: source.manifest, data: { reports: array<Report>(data.reports), templates: array<ReportTemplate>(data.templates), settings: object(data.settings, {} as AppSettings), knowledge: array<KnowledgeEntry>(data.knowledge), activity: array<ActivityEntry>(data.activity), history: array<ReportSnapshot>(data.history), programs: array<ProgramProfile>(data.programs), assets: array<AssetRecord>(data.assets), retests: array<RetestRecord>(data.retests), findingFamilies: array<FindingFamily>(data.findingFamilies), rootCauses: array<RootCauseEntry>(data.rootCauses), communications: array<CommunicationEntry>(data.communications), informationRequests: array<InformationRequest>(data.informationRequests), sanitizationProfiles: array<SanitizationProfile>(data.sanitizationProfiles), layoutSettings: object<LayoutSettings | undefined>(data.layoutSettings, undefined), diagnostics: object<DiagnosticsMetadata | undefined>(data.diagnostics, undefined) } };
}
function payloadWarnings(payload: BackupPayload): string[] { const warnings: string[] = []; const ids = new Set<string>(); const references = new Set<string>(); for (const report of payload.data.reports) { if (!report || typeof report !== "object") { warnings.push("One malformed report record will be skipped during import."); continue; } if (!report.id || ids.has(report.id)) warnings.push(`Duplicate or missing report ID detected${report.reportReference ? ` (${report.reportReference})` : ""}.`); else ids.add(report.id); if (!report.reportReference || references.has(report.reportReference)) warnings.push(`Duplicate or missing report reference detected${report.reportReference ? ` (${report.reportReference})` : ""}.`); else references.add(report.reportReference); for (const value of [report.createdAt, report.updatedAt, report.discoveredAt, report.submissionDetails?.submittedAt]) if (value && Number.isNaN(Date.parse(value))) warnings.push(`Invalid date detected in ${report.reportReference || report.id || "an imported report"}.`); } return [...new Set(warnings)]; }
async function parsePayloadJson(blob: Blob): Promise<ParsedBackup> { const payload = validatePayload(JSON.parse(await blob.text())); return { payload, evidence: [], warnings: payloadWarnings(payload) }; }
export async function parseBackupBlob(blob: Blob, fileName = "backup.zip"): Promise<ParsedBackup> {
  const warnings: string[] = []; if (blob.size > 150 * 1024 * 1024) warnings.push("The archive is large and may take time to process locally.");
  if (fileName.toLowerCase().endsWith(".json") || blob.type === "application/json") { const parsed = await parsePayloadJson(blob); return { ...parsed, warnings: [...warnings, ...parsed.warnings] }; }
  const zip = await JSZip.loadAsync(blob); const unsafe = Object.values(zip.files).some((entry) => !safeZipPath(entry.name)); if (unsafe) throw new Error("Backup ZIP contains an unsafe file path.");
  const manifestEntry = zip.file("manifest.json"); if (!manifestEntry) throw new Error("ZIP backup is missing manifest.json."); const manifest = JSON.parse(await manifestEntry.async("text"));
  const readJson = async <T>(path: string, fallback: T): Promise<T> => { const entry = zip.file(path); return entry ? JSON.parse(await entry.async("text")) as T : fallback; };
  const raw: Record<string, unknown> = { reports: await readJson<Report[]>("data/reports.json", []) };
  for (const [key, path] of dataFiles.filter(([key]) => key !== "reports")) raw[key] = await readJson(path, key === "settings" ? {} : []);
  const payload = validatePayload({ manifest, data: raw }); const evidence: StoredEvidenceFile[] = [];
  for (const metadata of payload.manifest.evidence ?? []) { if (!safeZipPath(metadata.path)) { warnings.push(`Ignored unsafe evidence path for ${metadata.fileName}.`); continue; } const entry = zip.file(metadata.path); if (!entry) { warnings.push(`Evidence file missing from ZIP: ${metadata.fileName}`); continue; } evidence.push({ evidenceId: metadata.evidenceId, reportId: metadata.reportId, fileName: metadata.fileName, mimeType: metadata.mimeType, createdAt: metadata.createdAt, blob: await entry.async("blob") }); }
  return { payload, evidence, warnings: [...warnings, ...payloadWarnings(payload)] };
}
export async function parseBackupFile(file: File): Promise<ParsedBackup> { if (file.name.toLowerCase().endsWith(".bbrvault")) throw new Error("Use the encrypted backup import flow for .bbrvault files."); return parseBackupBlob(file, file.name); }
