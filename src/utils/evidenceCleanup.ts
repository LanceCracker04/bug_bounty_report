import type { Report } from "../types/report";
import {
  getAllEvidenceFiles,
  type StoredEvidenceFile,
} from "./evidenceDatabase";

export interface EvidenceScanResult {
  orphanedFiles: StoredEvidenceFile[];
  missingMetadataFileIds: string[];
  danglingStepReferences: Array<{
    reportId: string;
    stepId: string;
    evidenceId: string;
  }>;
}

export async function scanEvidenceStorage(
  reports: Report[],
): Promise<EvidenceScanResult> {
  const files = await getAllEvidenceFiles();
  const reportIds = new Set(reports.map((report) => report.id));
  const metadata = new Map(
    reports.flatMap((report) =>
      report.evidenceItems.map((item) => [item.id, item]),
    ),
  );
  const fileIds = new Set(files.map((file) => file.evidenceId));
  const orphanedFiles = files.filter(
    (file) => !reportIds.has(file.reportId) || !metadata.has(file.evidenceId),
  );
  const missingMetadataFileIds = reports.flatMap((report) =>
    report.evidenceItems
      .filter((item) => item.type === "image" && !fileIds.has(item.id))
      .map((item) => item.id),
  );
  const danglingStepReferences = reports.flatMap((report) => {
    const evidenceIds = new Set(report.evidenceItems.map((item) => item.id));
    return report.structuredSteps.flatMap((step) =>
      step.evidenceIds
        .filter((id) => !evidenceIds.has(id))
        .map((evidenceId) => ({
          reportId: report.id,
          stepId: step.id,
          evidenceId,
        })),
    );
  });
  return { orphanedFiles, missingMetadataFileIds, danglingStepReferences };
}
