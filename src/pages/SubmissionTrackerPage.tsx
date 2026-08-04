import { useMemo, useState } from "react";
import { StatusBadge } from "../components/ui/Badges";
import { LifecycleBadge } from "../components/lifecycle/LifecyclePanel";
import type { FindingLifecycleStatus } from "../types/phase6";
import {
  SUBMISSION_OUTCOMES,
  SUBMISSION_PLATFORMS,
  type Report,
  type SubmissionOutcome,
} from "../types/report";

interface SubmissionTrackerPageProps {
  reports: Report[];
  onOpen: (report: Report) => void;
  onUpdateOutcome: (
    report: Report,
    outcome: SubmissionOutcome,
    note: string,
    bounty: string,
    currency: string,
  ) => void;
  onArchive: (report: Report) => void;
  onActivity: (report: Report) => void;
  onLifecycleTransition: (
    report: Report,
    next: FindingLifecycleStatus,
    reason: string,
    actor: string,
    source: "Researcher" | "Program Response",
  ) => Report | undefined;
}

export function SubmissionTrackerPage({
  reports,
  onOpen,
  onUpdateOutcome,
  onArchive,
  onActivity,
  onLifecycleTransition,
}: SubmissionTrackerPageProps) {
  const [platform, setPlatform] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState("newest");
  const [updating, setUpdating] = useState<Report>();
  const [note, setNote] = useState("");
  const [bounty, setBounty] = useState("");
  const [currency, setCurrency] = useState("");
  const [nextOutcome, setNextOutcome] =
    useState<SubmissionOutcome>("Submitted");
  const [lifecycle, setLifecycle] = useState<Report>();
  const [lifecycleNext, setLifecycleNext] =
    useState<FindingLifecycleStatus>("Triaged");
  const [lifecycleReason, setLifecycleReason] = useState("");
  const submitted = useMemo(
    () =>
      reports
        .filter(
          (report) =>
            report.submissionDetails.outcome !== "Not Submitted" ||
            report.status === "Submitted",
        )
        .filter(
          (report) =>
            (platform === "all" ||
              report.submissionDetails.platform === platform) &&
            (outcome === "all" ||
              report.submissionDetails.outcome === outcome) &&
            (!program ||
              `${report.programName} ${report.submissionDetails.programName ?? ""}`
                .toLocaleLowerCase()
                .includes(program.toLocaleLowerCase())) &&
            (year === "all" ||
              report.submissionDetails.submittedAt?.startsWith(year)),
        )
        .sort((a, b) => {
          if (sort === "oldest")
            return (
              new Date(a.submissionDetails.submittedAt ?? 0).getTime() -
              new Date(b.submissionDetails.submittedAt ?? 0).getTime()
            );
          if (sort === "response")
            return (
              new Date(b.submissionDetails.lastResponseAt ?? 0).getTime() -
              new Date(a.submissionDetails.lastResponseAt ?? 0).getTime()
            );
          if (sort === "bounty")
            return (
              (b.submissionDetails.bountyAmount ?? 0) -
              (a.submissionDetails.bountyAmount ?? 0)
            );
          if (sort === "outcome")
            return a.submissionDetails.outcome.localeCompare(
              b.submissionDetails.outcome,
            );
          return (
            new Date(b.submissionDetails.submittedAt ?? 0).getTime() -
            new Date(a.submissionDetails.submittedAt ?? 0).getTime()
          );
        }),
    [outcome, platform, program, reports, sort, year],
  );
  const years = [
    ...new Set(
      reports
        .map((report) => report.submissionDetails.submittedAt?.slice(0, 4))
        .filter(Boolean),
    ),
  ] as string[];
  const openUpdate = (report: Report) => {
    setUpdating(report);
    setNote(report.submissionDetails.notes ?? "");
    setBounty(report.submissionDetails.bountyAmount?.toString() ?? "");
    setCurrency(report.submissionDetails.bountyCurrency ?? "");
    setNextOutcome(
      report.submissionDetails.outcome === "Not Submitted"
        ? "Submitted"
        : report.submissionDetails.outcome,
    );
  };
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-[#101318] p-4">
        <label className="field-group min-w-40">
          <span>Platform</span>
          <select
            className="input-field"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          >
            <option value="all">All platforms</option>
            {SUBMISSION_PLATFORMS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field-group min-w-44">
          <span>Outcome</span>
          <select
            className="input-field"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
          >
            <option value="all">All outcomes</option>
            {SUBMISSION_OUTCOMES.filter((item) => item !== "Not Submitted").map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        </label>
        <label className="field-group min-w-44">
          <span>Program</span>
          <input
            className="input-field"
            value={program}
            onChange={(event) => setProgram(event.target.value)}
            placeholder="Filter program"
          />
        </label>
        <label className="field-group min-w-32">
          <span>Year</span>
          <select
            className="input-field"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="all">All years</option>
            {years.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field-group min-w-44">
          <span>Sort</span>
          <select
            className="input-field"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest submitted</option>
            <option value="oldest">Oldest submitted</option>
            <option value="response">Last response</option>
            <option value="bounty">Bounty amount</option>
            <option value="outcome">Outcome</option>
          </select>
        </label>
      </section>
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#101318]">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <caption className="sr-only">
            Submission and lifecycle tracker
          </caption>
          <thead className="border-b border-slate-800 bg-[#14181e] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Report Title</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Submission ID</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Outcome</th>
              <th className="px-4 py-3">Lifecycle</th>
              <th className="px-4 py-3">Last Response</th>
              <th className="px-4 py-3">Bounty</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {submitted.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-4 font-mono text-xs text-cyan-400">
                  {report.reportReference}
                </td>
                <td className="px-4 py-4">
                  <button
                    className="text-left font-medium text-slate-200 hover:text-cyan-300"
                    type="button"
                    onClick={() => onOpen(report)}
                  >
                    {report.title}
                  </button>
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {report.submissionDetails.programName || report.programName}
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {report.submissionDetails.platform}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-slate-400">
                  {report.submissionDetails.submissionId || "—"}
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {report.submissionDetails.submittedAt || "—"}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={report.status} />
                  <span className="ml-2 text-xs text-slate-400">
                    {report.submissionDetails.outcome}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <LifecycleBadge status={report.lifecycleStatus} />
                  <button
                    className="mt-1 block text-xs text-cyan-300 hover:underline"
                    type="button"
                    onClick={() => {
                      setLifecycle(report);
                      setLifecycleNext(report.lifecycleStatus ?? "Triaged");
                      setLifecycleReason("");
                    }}
                  >
                    Change
                  </button>
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {report.submissionDetails.lastResponseAt?.slice(0, 10) || "—"}
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {report.submissionDetails.bountyAmount
                    ? `${report.submissionDetails.bountyAmount} ${report.submissionDetails.bountyCurrency ?? ""}`
                    : "—"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      className="table-action"
                      type="button"
                      onClick={() => onOpen(report)}
                    >
                      Open
                    </button>
                    {report.submissionDetails.submissionUrl && (
                      <a
                        className="table-action"
                        href={report.submissionDetails.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        URL
                      </a>
                    )}
                    <button
                      className="table-action"
                      type="button"
                      onClick={() => openUpdate(report)}
                    >
                      Update
                    </button>
                    <button
                      className="table-action"
                      type="button"
                      onClick={() => onActivity(report)}
                    >
                      Activity
                    </button>
                    <button
                      className="table-action"
                      type="button"
                      onClick={() => onArchive(report)}
                    >
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!submitted.length && (
          <p className="p-8 text-center text-sm text-slate-500">
            No locally tracked submissions match these filters.
          </p>
        )}
      </div>
      {updating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={() => setUpdating(undefined)}
        >
          <section
            className="w-full max-w-xl rounded-lg border border-slate-700 bg-[#161a20] p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-submission-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2
              id="update-submission-title"
              className="text-lg font-semibold text-slate-100"
            >
              Update Submission Outcome
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="field-group">
                <span>Outcome</span>
                <select
                  className="input-field"
                  value={nextOutcome}
                  onChange={(event) =>
                    setNextOutcome(event.target.value as SubmissionOutcome)
                  }
                >
                  {SUBMISSION_OUTCOMES.filter(
                    (item) => item !== "Not Submitted",
                  ).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field-group">
                <span>Bounty Amount (optional)</span>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={bounty}
                  onChange={(event) => setBounty(event.target.value)}
                />
              </label>
              <label className="field-group">
                <span>Currency</span>
                <input
                  className="input-field"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  placeholder="USD"
                />
              </label>
              <label className="field-group md:col-span-2">
                <span>Response note</span>
                <textarea
                  className="input-field min-h-24 resize-y"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setUpdating(undefined)}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={() => {
                  if (
                    bounty &&
                    (!Number.isFinite(Number(bounty)) || Number(bounty) <= 0)
                  )
                    return;
                  onUpdateOutcome(
                    updating,
                    nextOutcome,
                    note,
                    bounty,
                    currency,
                  );
                  setUpdating(undefined);
                }}
              >
                Save Outcome
              </button>
            </div>
          </section>
        </div>
      )}
      {lifecycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section
            className="w-full max-w-md rounded-lg border border-slate-700 bg-[#161a20] p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lifecycle-tracker-title"
          >
            <h2
              id="lifecycle-tracker-title"
              className="text-lg font-semibold text-slate-100"
            >
              Update lifecycle
            </h2>
            <select
              className="input-field mt-4 w-full"
              value={lifecycleNext}
              onChange={(event) =>
                setLifecycleNext(event.target.value as FindingLifecycleStatus)
              }
            >
              {(
                [
                  "Submitted",
                  "Needs More Information",
                  "Triaged",
                  "Accepted",
                  "Remediation in Progress",
                  "Ready for Retest",
                  "Retesting",
                  "Remediated",
                  "Partially Remediated",
                  "Not Remediated",
                  "Risk Accepted",
                  "Closed",
                  "Rejected",
                ] as FindingLifecycleStatus[]
              ).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <textarea
              className="input-field mt-3 min-h-24 w-full resize-y"
              value={lifecycleReason}
              onChange={(event) => setLifecycleReason(event.target.value)}
              placeholder="Reason (required for exceptional transitions)"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setLifecycle(undefined)}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={() => {
                  onLifecycleTransition(
                    lifecycle,
                    lifecycleNext,
                    lifecycleReason,
                    "",
                    "Program Response",
                  );
                  setLifecycle(undefined);
                }}
              >
                Record change
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
