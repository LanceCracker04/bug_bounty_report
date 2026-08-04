import { useMemo, useState } from "react";
import { ReportTable } from "../components/reports/ReportTable";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import {
  REPORT_STATUSES,
  SEVERITIES,
  SUBMISSION_OUTCOMES,
  SUBMISSION_PLATFORMS,
  type QualityGrade,
  type Report,
  type ReportStatus,
  type Severity,
  type SubmissionOutcome,
  type SubmissionPlatform,
} from "../types/report";
import {
  sortReports,
  type ReportSortField,
  type SortDirection,
} from "../utils/reportHelpers";

type BulkAction =
  | "draft"
  | "ready"
  | "archive"
  | "restore"
  | "quality"
  | "exportMetadata"
  | "delete";

interface ReportsPageProps {
  reports: Report[];
  hasSearch: boolean;
  severityFilter: Severity | "all";
  statusFilter: ReportStatus | "all";
  onSeverityChange: (value: Severity | "all") => void;
  onStatusChange: (value: ReportStatus | "all") => void;
  onClearFilters: () => void;
  onNewReport: () => void;
  onOpen: (report: Report) => void;
  onPrepareSubmission: (report: Report) => void;
  onPreview: (report: Report) => void;
  onExport: (report: Report) => void;
  onDuplicate: (report: Report) => void;
  onDelete: (report: Report) => void;
  onBulkAction: (reports: Report[], action: BulkAction) => Promise<void>;
}

export function ReportsPage({
  reports,
  hasSearch,
  severityFilter,
  statusFilter,
  onSeverityChange,
  onStatusChange,
  onClearFilters,
  onNewReport,
  onOpen,
  onPrepareSubmission,
  onPreview,
  onExport,
  onDuplicate,
  onDelete,
  onBulkAction,
}: ReportsPageProps) {
  const [sortField, setSortField] = useState<ReportSortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [quality, setQuality] = useState<QualityGrade | "all">("all");
  const [blocking, setBlocking] = useState<"all" | "yes">("all");
  const [platform, setPlatform] = useState<SubmissionPlatform | "all">("all");
  const [outcome, setOutcome] = useState<SubmissionOutcome | "all">("all");
  const [archive, setArchive] = useState<"active" | "archived" | "all">(
    "active",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingBulk, setPendingBulk] = useState<BulkAction>();
  const [working, setWorking] = useState(false);
  const filtered = useMemo(
    () =>
      reports.filter(
        (report) =>
          (quality === "all" || report.qualityResult?.grade === quality) &&
          (blocking !== "yes" ||
            Boolean(
              report.qualityResult?.issues.some(
                (issue) => issue.severity === "error",
              ),
            )) &&
          (platform === "all" ||
            report.submissionDetails.platform === platform) &&
          (outcome === "all" || report.submissionDetails.outcome === outcome) &&
          (archive === "all"
            ? true
            : archive === "archived"
              ? Boolean(report.archivedAt)
              : !report.archivedAt),
      ),
    [archive, blocking, outcome, platform, quality, reports],
  );
  const sortedReports = sortReports(filtered, sortField, sortDirection);
  const selectedReports = sortedReports.filter((report) =>
    selectedIds.has(report.id),
  );
  const filtersActive =
    hasSearch ||
    severityFilter !== "all" ||
    statusFilter !== "all" ||
    quality !== "all" ||
    blocking !== "all" ||
    platform !== "all" ||
    outcome !== "all" ||
    archive !== "active";
  const clearAll = () => {
    onClearFilters();
    setQuality("all");
    setBlocking("all");
    setPlatform("all");
    setOutcome("all");
    setArchive("active");
    setSelectedIds(new Set());
  };
  const runBulk = async (action: BulkAction) => {
    setPendingBulk(undefined);
    setWorking(true);
    try {
      await onBulkAction(selectedReports, action);
      setSelectedIds(new Set());
    } finally {
      setWorking(false);
    }
  };
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-[#101318] p-4">
        <label className="field-group min-w-40 flex-1 sm:max-w-56">
          <span>Severity</span>
          <select
            className="input-field"
            value={severityFilter}
            onChange={(event) =>
              onSeverityChange(event.target.value as Severity | "all")
            }
          >
            <option value="all">All severities</option>
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </label>
        <label className="field-group min-w-44 flex-1 sm:max-w-56">
          <span>Status</span>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(event) =>
              onStatusChange(event.target.value as ReportStatus | "all")
            }
          >
            <option value="all">All statuses</option>
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="field-group min-w-40 flex-1 sm:max-w-48">
          <span>Quality</span>
          <select
            className="input-field"
            value={quality}
            onChange={(event) =>
              setQuality(event.target.value as QualityGrade | "all")
            }
          >
            <option value="all">All grades</option>
            {(
              [
                "Excellent",
                "Good",
                "Needs Work",
                "Incomplete",
              ] as QualityGrade[]
            ).map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </select>
        </label>
        <label className="field-group min-w-40 flex-1 sm:max-w-48">
          <span>Blocking issues</span>
          <select
            className="input-field"
            value={blocking}
            onChange={(event) =>
              setBlocking(event.target.value as "all" | "yes")
            }
          >
            <option value="all">Any</option>
            <option value="yes">Has errors</option>
          </select>
        </label>
        <label className="field-group min-w-40 flex-1 sm:max-w-48">
          <span>Platform</span>
          <select
            className="input-field"
            value={platform}
            onChange={(event) =>
              setPlatform(event.target.value as SubmissionPlatform | "all")
            }
          >
            <option value="all">All platforms</option>
            {SUBMISSION_PLATFORMS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field-group min-w-40 flex-1 sm:max-w-48">
          <span>Outcome</span>
          <select
            className="input-field"
            value={outcome}
            onChange={(event) =>
              setOutcome(event.target.value as SubmissionOutcome | "all")
            }
          >
            <option value="all">All outcomes</option>
            {SUBMISSION_OUTCOMES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field-group min-w-40 flex-1 sm:max-w-48">
          <span>Visibility</span>
          <select
            className="input-field"
            value={archive}
            onChange={(event) =>
              setArchive(event.target.value as "active" | "archived" | "all")
            }
          >
            <option value="active">Active reports</option>
            <option value="archived">Archived reports</option>
            <option value="all">All reports</option>
          </select>
        </label>
        <label className="field-group min-w-40 flex-1 sm:max-w-52">
          <span>Sort by</span>
          <select
            className="input-field"
            value={sortField}
            onChange={(event) =>
              setSortField(event.target.value as ReportSortField)
            }
          >
            <option value="updatedAt">Updated Date</option>
            <option value="createdAt">Created Date</option>
            <option value="severity">Severity</option>
            <option value="status">Status</option>
          </select>
        </label>
        <button
          className="button-secondary"
          type="button"
          onClick={() =>
            setSortDirection((direction) =>
              direction === "asc" ? "desc" : "asc",
            )
          }
        >
          {sortDirection === "asc" ? "↑ Ascending" : "↓ Descending"}
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={clearAll}
          disabled={!filtersActive}
        >
          Clear Filters
        </button>
      </section>
      {selectedReports.length > 0 && (
        <section className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan-900/60 bg-cyan-950/20 p-3">
          <span className="mr-2 text-sm text-cyan-100">
            {selectedReports.length} selected
          </span>
          <button
            className="table-action"
            type="button"
            disabled={working}
            onClick={() => void runBulk("draft")}
          >
            Mark Draft
          </button>
          <button
            className="table-action"
            type="button"
            disabled={working}
            onClick={() => void runBulk("ready")}
          >
            Mark Ready
          </button>
          <button
            className="table-action"
            type="button"
            disabled={working}
            onClick={() =>
              void runBulk(archive === "archived" ? "restore" : "archive")
            }
          >
            {archive === "archived" ? "Restore" : "Archive"}
          </button>
          <button
            className="table-action"
            type="button"
            disabled={working}
            onClick={() => void runBulk("quality")}
          >
            Run Quality Check
          </button>
          <button
            className="table-action"
            type="button"
            disabled={working}
            onClick={() => void runBulk("exportMetadata")}
          >
            Export Metadata
          </button>
          <button
            className="table-action-danger"
            type="button"
            disabled={working}
            onClick={() => setPendingBulk("delete")}
          >
            Delete
          </button>
        </section>
      )}
      {sortedReports.length > 0 ? (
        <ReportTable
          reports={sortedReports}
          selectedIds={selectedIds}
          onSelect={(id, selected) =>
            setSelectedIds((current) => {
              const next = new Set(current);
              if (selected) next.add(id);
              else next.delete(id);
              return next;
            })
          }
          onSelectAll={(selected) =>
            setSelectedIds((current) => {
              const next = new Set(current);
              sortedReports.forEach((report) => {
                if (selected) next.add(report.id);
                else next.delete(report.id);
              });
              return next;
            })
          }
          onOpen={onOpen}
          onPrepareSubmission={onPrepareSubmission}
          onPreview={onPreview}
          onExport={onExport}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ) : (
        <EmptyState
          title={
            filtersActive
              ? "No reports match these filters"
              : "No reports created"
          }
          description={
            filtersActive
              ? "Clear filters or adjust your search to find a report."
              : "Capture your next finding in a structured, submission-ready report."
          }
          action={
            filtersActive ? (
              <button
                className="button-secondary"
                type="button"
                onClick={clearAll}
              >
                Clear Filters
              </button>
            ) : (
              <button
                className="button-primary"
                type="button"
                onClick={onNewReport}
              >
                + New Report
              </button>
            )
          }
        />
      )}
      <ConfirmDialog
        isOpen={pendingBulk === "delete"}
        title="Delete selected reports?"
        description={`This permanently deletes ${selectedReports.length} report(s) and their uploaded evidence.`}
        confirmLabel="Delete selected"
        confirmTone="danger"
        isProcessing={working}
        onConfirm={() => void runBulk("delete")}
        onCancel={() => setPendingBulk(undefined)}
      />
    </div>
  );
}
