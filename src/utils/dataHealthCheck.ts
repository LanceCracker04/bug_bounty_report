import type { AssetRecord, ProgramProfile } from "../types/program";
import type {
  CommunicationEntry,
  DiagnosticFinding,
  FindingFamily,
  HealthCheckResult,
  InformationRequest,
  RetestRecord,
  RootCauseEntry,
} from "../types/phase6";
import type { ReportSnapshot } from "../types/history";
import type { Report } from "../types/report";
import { getAllEvidenceFiles } from "./evidenceDatabase";
import {
  FINDING_LIFECYCLE_STATUSES,
  VERIFICATION_OUTCOMES,
} from "../types/phase6";

export interface HealthData {
  reports: Report[];
  programs: ProgramProfile[];
  assets: AssetRecord[];
  retests: RetestRecord[];
  communications: CommunicationEntry[];
  informationRequests: InformationRequest[];
  findingFamilies: FindingFamily[];
  rootCauses: RootCauseEntry[];
  snapshots: ReportSnapshot[];
}
function dateValid(value?: string): boolean {
  return !value || !Number.isNaN(Date.parse(value));
}
export async function runDataHealthCheck(
  data: HealthData,
): Promise<HealthCheckResult> {
  const findings: DiagnosticFinding[] = [];
  const reportIds = new Set<string>();
  const refs = new Set<string>();
  const programs = new Set(data.programs.map((program) => program.id));
  const assets = new Set(data.assets.map((asset) => asset.id));
  const evidenceIds = new Set(
    data.reports.flatMap((report) =>
      report.evidenceItems.map((item) => item.id),
    ),
  );
  for (const report of data.reports) {
    if (!report.id || reportIds.has(report.id))
      findings.push({
        id: `report-id-${report.id}`,
        severity: "Critical",
        area: "Reports",
        message: "Duplicate or missing report ID.",
        reportId: report.id,
      });
    else reportIds.add(report.id);
    if (!report.reportReference || refs.has(report.reportReference))
      findings.push({
        id: `report-reference-${report.id}`,
        severity: "Critical",
        area: "Reports",
        message: "Duplicate or missing report reference.",
        reportId: report.id,
      });
    else refs.add(report.reportReference);
    if (report.programProfileId && !programs.has(report.programProfileId))
      findings.push({
        id: `program-${report.id}`,
        severity: "Warning",
        area: "Relationships",
        message: "Linked program is missing.",
        reportId: report.id,
        repairable: true,
      });
    (report.linkedAssetIds ?? [])
      .filter((id) => !assets.has(id))
      .forEach((id) =>
        findings.push({
          id: `asset-${report.id}-${id}`,
          severity: "Warning",
          area: "Relationships",
          message: "Linked asset is missing.",
          reportId: report.id,
          repairable: true,
        }),
      );
    if (!FINDING_LIFECYCLE_STATUSES.includes(report.lifecycleStatus ?? "Draft"))
      findings.push({
        id: `lifecycle-${report.id}`,
        severity: "Warning",
        area: "Lifecycle",
        message: "Lifecycle status is invalid.",
        reportId: report.id,
        repairable: true,
      });
    for (const event of report.lifecycleEvents ?? [])
      if (
        !FINDING_LIFECYCLE_STATUSES.includes(event.nextStatus) ||
        !dateValid(event.timestamp)
      )
        findings.push({
          id: `lifecycle-event-${event.id}`,
          severity: "Warning",
          area: "Lifecycle",
          message: "A lifecycle event is invalid.",
          reportId: report.id,
        });
    if (
      report.rootCauseId &&
      !data.rootCauses.some((item) => item.id === report.rootCauseId)
    )
      findings.push({
        id: `root-${report.id}`,
        severity: "Warning",
        area: "Relationships",
        message: "Root-cause reference is missing.",
        reportId: report.id,
        repairable: true,
      });
    if (
      report.findingFamilyId &&
      !data.findingFamilies.some((item) => item.id === report.findingFamilyId)
    )
      findings.push({
        id: `family-${report.id}`,
        severity: "Warning",
        area: "Relationships",
        message: "Finding-family reference is missing.",
        reportId: report.id,
        repairable: true,
      });
    if (
      ![report.createdAt, report.updatedAt, report.discoveredAt].every(
        dateValid,
      )
    )
      findings.push({
        id: `date-${report.id}`,
        severity: "Warning",
        area: "Dates",
        message: "Report contains an invalid date.",
        reportId: report.id,
      });
    if ((report.lifecycleEvents?.length ?? 0) > 500)
      findings.push({
        id: `events-${report.id}`,
        severity: "Informational",
        area: "Lifecycle",
        message: "Lifecycle history is unusually large.",
        reportId: report.id,
      });
  }
  for (const retest of data.retests) {
    if (!reportIds.has(retest.reportId))
      findings.push({
        id: `retest-${retest.id}`,
        severity: "Warning",
        area: "Retests",
        message: "Retest refers to a missing report.",
        repairable: false,
      });
    if (!VERIFICATION_OUTCOMES.includes(retest.verificationOutcome))
      findings.push({
        id: `retest-outcome-${retest.id}`,
        severity: "Warning",
        area: "Retests",
        message: "Retest has an invalid verification outcome.",
      });
    for (const id of retest.evidenceIds)
      if (!evidenceIds.has(id))
        findings.push({
          id: `retest-evidence-${retest.id}-${id}`,
          severity: "Warning",
          area: "Retests",
          message: "Retest links missing evidence.",
          repairable: true,
        });
  }
  data.communications
    .filter((item) => item.reportId && !reportIds.has(item.reportId))
    .forEach((item) =>
      findings.push({
        id: `communication-${item.id}`,
        severity: "Warning",
        area: "Communications",
        message: "Communication links a missing report.",
        repairable: true,
      }),
    );
  data.informationRequests
    .filter((item) => !reportIds.has(item.reportId))
    .forEach((item) =>
      findings.push({
        id: `request-${item.id}`,
        severity: "Warning",
        area: "Information requests",
        message: "Information request links a missing report.",
      }),
    );
  data.findingFamilies.forEach((family) =>
    family.reportIds
      .filter((id) => !reportIds.has(id))
      .forEach((id) =>
        findings.push({
          id: `family-member-${family.id}-${id}`,
          severity: "Warning",
          area: "Finding families",
          message: "Finding family contains a missing report.",
          repairable: true,
        }),
      ),
  );
  try {
    const files = await getAllEvidenceFiles();
    const filesById = new Set(files.map((file) => file.evidenceId));
    data.reports
      .flatMap((report) =>
        report.evidenceItems.filter(
          (item) => item.type === "image" && !filesById.has(item.id),
        ),
      )
      .forEach((item) =>
        findings.push({
          id: `evidence-file-${item.id}`,
          severity: "Warning",
          area: "Evidence",
          message: "Image evidence metadata has no IndexedDB file.",
        }),
      );
    files
      .filter((file) => !evidenceIds.has(file.evidenceId))
      .forEach((file) =>
        findings.push({
          id: `orphan-${file.evidenceId}`,
          severity: "Informational",
          area: "Evidence",
          message: "IndexedDB evidence file has no report metadata.",
          repairable: true,
        }),
      );
  } catch {
    findings.push({
      id: "indexeddb-unavailable",
      severity: "Critical",
      area: "Storage",
      message: "IndexedDB evidence storage is unavailable.",
    });
  }
  if (data.snapshots.length > 1500)
    findings.push({
      id: "snapshot-count",
      severity: "Informational",
      area: "History",
      message:
        "Snapshot history is large; consider exporting a backup before pruning.",
    });
  return {
    checkedAt: new Date().toISOString(),
    findings,
    repairableCount: findings.filter((item) => item.repairable).length,
  };
}
export function createSafeRepairPlan(
  result: HealthCheckResult,
): DiagnosticFinding[] {
  return result.findings.filter((item) => item.repairable);
}
