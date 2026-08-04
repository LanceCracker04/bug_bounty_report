import { ReportTable } from "../components/reports/ReportTable";
import { EmptyState } from "../components/ui/EmptyState";
import type { ActivityEntry } from "../types/activity";
import { SEVERITIES, type Report, type Severity } from "../types/report";
import type {
  CommunicationEntry,
  DiagnosticsMetadata,
  InformationRequest,
  RetestRecord,
} from "../types/phase6";

interface DashboardPageProps {
  reports: Report[];
  allReports: Report[];
  activities: ActivityEntry[];
  hasSearch: boolean;
  onOpen: (report: Report) => void;
  onPrepareSubmission: (report: Report) => void;
  onPreview: (report: Report) => void;
  onExport: (report: Report) => void;
  onDuplicate: (report: Report) => void;
  onDelete: (report: Report) => void;
  onViewReports: () => void;
  retests?: RetestRecord[];
  communications?: CommunicationEntry[];
  informationRequests?: InformationRequest[];
  diagnostics?: DiagnosticsMetadata;
}

function AnalyticsList({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, number]>;
}) {
  const maximum = Math.max(...entries.map(([, value]) => value), 1);
  return (
    <section className="rounded-lg border border-slate-800 bg-[#101318] p-4">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      <div className="mt-4 space-y-3">
        {entries.length ? (
          entries.map(([label, value]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-slate-400">{label}</span>
                <span className="font-mono text-slate-300">{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-700"
                  style={{ width: `${Math.max(5, (value / maximum) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No local data yet.</p>
        )}
      </div>
    </section>
  );
}

export function DashboardPage({
  reports,
  allReports,
  activities,
  hasSearch,
  onOpen,
  onPrepareSubmission,
  onPreview,
  onExport,
  onDuplicate,
  onDelete,
  onViewReports,
  retests = [],
  communications = [],
  informationRequests = [],
  diagnostics,
}: DashboardPageProps) {
  const activeReports = allReports.filter((report) => !report.archivedAt);
  const finalOutcomes = activeReports.filter((report) =>
    [
      "Accepted",
      "Duplicate",
      "Informative",
      "Not Applicable",
      "Resolved",
      "Rejected",
    ].includes(report.submissionDetails.outcome),
  );
  const accepted = activeReports.filter(
    (report) => report.submissionDetails.outcome === "Accepted",
  ).length;
  const totalBounty = activeReports.reduce(
    (total, report) => total + (report.submissionDetails.bountyAmount ?? 0),
    0,
  );
  const qualityReports = activeReports.filter((report) => report.qualityResult);
  const qualityAverage = qualityReports.length
    ? Math.round(
        qualityReports.reduce(
          (total, report) => total + (report.qualityResult?.score ?? 0),
          0,
        ) / qualityReports.length,
      )
    : 0;
  const severityEntries: Array<[string, number]> = SEVERITIES.map(
    (severity: Severity) => [
      severity,
      activeReports.filter((report) => report.severity === severity).length,
    ],
  );
  const statusEntries = Array.from(
    new Set(activeReports.map((report) => report.status)),
  ).map(
    (status) =>
      [
        status,
        activeReports.filter((report) => report.status === status).length,
      ] as [string, number],
  );
  const vulnerabilityEntries = Object.entries(
    activeReports.reduce<Record<string, number>>((counts, report) => {
      const key = report.vulnerabilityType || "Unspecified";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort(([, left], [, right]) => right - left)
    .slice(0, 6);
  const outcomeEntries = Object.entries(
    activeReports.reduce<Record<string, number>>((counts, report) => {
      const key = report.submissionDetails.outcome;
      if (key !== "Not Submitted") counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  ).sort(([, left], [, right]) => right - left);
  const cards = [
    {
      label: "Total Reports",
      value: activeReports.length,
      accent: "border-slate-700",
    },
    {
      label: "Draft Reports",
      value: activeReports.filter((report) => report.status === "Draft").length,
      accent: "border-slate-700",
    },
    {
      label: "Ready to Submit",
      value: activeReports.filter(
        (report) => report.status === "Ready to Submit",
      ).length,
      accent: "border-cyan-900/70",
    },
    {
      label: "Submitted Reports",
      value: activeReports.filter((report) => report.status === "Submitted")
        .length,
      accent: "border-blue-900/70",
    },
    {
      label: "Accepted Reports",
      value: accepted,
      accent: "border-emerald-900/70",
    },
    {
      label: "Recorded Bounty",
      value: totalBounty
        ? totalBounty.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : "—",
      accent: "border-amber-900/70",
    },
    {
      label: "Awaiting Retest",
      value: activeReports.filter(
        (report) => report.lifecycleStatus === "Ready for Retest",
      ).length,
      accent: "border-violet-900/70",
    },
    {
      label: "Retests In Progress",
      value: retests.filter((retest) => !retest.completedAt).length,
      accent: "border-cyan-900/70",
    },
    {
      label: "Remediated",
      value: activeReports.filter(
        (report) => report.lifecycleStatus === "Remediated",
      ).length,
      accent: "border-emerald-900/70",
    },
    {
      label: "Regressions",
      value: activeReports.filter((report) =>
        Boolean(report.regressionDetectedAt),
      ).length,
      accent: "border-red-900/70",
    },
  ];

  return (
    <div className="space-y-7">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cards.map((card) => (
          <article
            className={`rounded-lg border bg-[#101318] p-4 ${card.accent}`}
            key={card.label}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">
              {card.value}
            </p>
          </article>
        ))}
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-800 bg-[#101318] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Open information requests
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {
              informationRequests.filter(
                (item) => !["Responded", "Closed"].includes(item.status),
              ).length
            }
          </p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-[#101318] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Communication actions due
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {
              communications.filter(
                (item) => item.actionRequired && !item.completedAt,
              ).length
            }
          </p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-[#101318] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Data-health warnings
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {diagnostics?.lastHealthResult?.filter(
              (item) => item.severity !== "Informational",
            ).length ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Locally recorded data</p>
        </article>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <AnalyticsList title="Reports by Severity" entries={severityEntries} />
        <AnalyticsList title="Reports by Status" entries={statusEntries} />
        <AnalyticsList
          title="Reports by Vulnerability Type"
          entries={vulnerabilityEntries}
        />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AnalyticsList title="Submission Outcomes" entries={outcomeEntries} />
        <article className="rounded-lg border border-slate-800 bg-[#101318] p-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Quality & submission overview
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded border border-slate-800 bg-[#0d1014] p-3">
              <dt className="text-xs text-slate-500">Average quality</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-100">
                {qualityAverage || "—"}
                {qualityReports.length ? "/100" : ""}
              </dd>
            </div>
            <div className="rounded border border-slate-800 bg-[#0d1014] p-3">
              <dt className="text-xs text-slate-500">Not yet checked</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-100">
                {activeReports.length - qualityReports.length}
              </dd>
            </div>
            <div className="rounded border border-slate-800 bg-[#0d1014] p-3">
              <dt className="text-xs text-slate-500">Blocking errors</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-100">
                {
                  qualityReports.filter((report) =>
                    report.qualityResult?.issues.some(
                      (issue) => issue.severity === "error",
                    ),
                  ).length
                }
              </dd>
            </div>
            <div className="rounded border border-slate-800 bg-[#0d1014] p-3">
              <dt className="text-xs text-slate-500">Excellent reports</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-100">
                {
                  qualityReports.filter(
                    (report) => report.qualityResult?.grade === "Excellent",
                  ).length
                }
              </dd>
            </div>
            <div className="col-span-2 rounded border border-slate-800 bg-[#0d1014] p-3">
              <dt className="text-xs text-slate-500">
                Acceptance rate{" "}
                <span className="normal-case">(local tracker data)</span>
              </dt>
              <dd className="mt-1 text-lg font-semibold text-slate-100">
                {finalOutcomes.length
                  ? `${Math.round((accepted / finalOutcomes.length) * 100)}%`
                  : "—"}
              </dd>
              <p className="mt-1 text-xs text-slate-500">
                {accepted} accepted of {finalOutcomes.length} reports with a
                final outcome.
              </p>
            </div>
          </dl>
        </article>
      </section>
      <section className="rounded-lg border border-slate-800 bg-[#101318] p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Recent Activity
        </h2>
        {activities.length ? (
          <ol className="mt-3 divide-y divide-slate-800">
            {activities.slice(0, 5).map((entry) => (
              <li
                className="flex items-center justify-between gap-4 py-2 text-sm"
                key={entry.id}
              >
                <span className="text-slate-300">{entry.description}</span>
                <time className="whitespace-nowrap text-xs text-slate-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Meaningful report activity will appear here.
          </p>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Recent Reports
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your most recently updated findings.
            </p>
          </div>
          {allReports.length > 0 && (
            <button
              className="button-link"
              type="button"
              onClick={onViewReports}
            >
              View all reports →
            </button>
          )}
        </div>
        {reports.length > 0 ? (
          <ReportTable
            reports={reports.filter((report) => !report.archivedAt).slice(0, 6)}
            onOpen={onOpen}
            onPrepareSubmission={onPrepareSubmission}
            onPreview={onPreview}
            onExport={onExport}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ) : (
          <EmptyState
            title={hasSearch ? "No matching reports" : "No reports yet"}
            description={
              hasSearch
                ? "Try a different title, program, target, or vulnerability type."
                : "Create your first report to begin tracking vulnerability research."
            }
            action={
              !hasSearch ? (
                <button
                  className="button-primary"
                  type="button"
                  onClick={onViewReports}
                >
                  Open reports
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
