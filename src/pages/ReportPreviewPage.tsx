import { ReportPreviewDocument } from "../components/reports/ReportPreviewDocument";
import type { Report } from "../types/report";
import type { AppSettings } from "../types/settings";

export function ReportPreviewPage({
  report,
  settings,
  onBack,
  onNotify,
  onPrepareSubmission,
}: {
  report: Report;
  settings: AppSettings;
  onBack: () => void;
  onNotify: (type: "success" | "error" | "warning", message: string) => void;
  onPrepareSubmission?: (report: Report) => void;
}) {
  return (
    <ReportPreviewDocument
      report={report}
      settings={settings}
      onBack={onBack}
      onNotify={onNotify}
      onPrepareSubmission={onPrepareSubmission}
    />
  );
}
