import type { ReportStatus, Severity } from "../../types/report";

const severityStyles: Record<Severity, string> = {
  Informational: "border-slate-700 bg-slate-800 text-slate-300",
  Low: "border-blue-900 bg-blue-950/60 text-blue-300",
  Medium: "border-yellow-900 bg-yellow-950/60 text-yellow-300",
  High: "border-orange-900 bg-orange-950/60 text-orange-300",
  Critical: "border-red-900 bg-red-950/60 text-red-300",
};

const statusStyles: Record<ReportStatus, string> = {
  Draft: "border-slate-700 bg-slate-800 text-slate-300",
  "Ready to Submit": "border-cyan-900 bg-cyan-950/60 text-cyan-300",
  Submitted: "border-blue-900 bg-blue-950/60 text-blue-300",
  Triaged: "border-violet-900 bg-violet-950/60 text-violet-300",
  Accepted: "border-emerald-900 bg-emerald-950/60 text-emerald-300",
  Duplicate: "border-slate-700 bg-slate-800 text-slate-400",
  Informative: "border-slate-700 bg-slate-800 text-slate-400",
  Resolved: "border-green-900 bg-green-950/60 text-green-300",
  Rejected: "border-red-900 bg-red-950/60 text-red-300",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge ${severityStyles[severity]}`}>{severity}</span>
  );
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`badge ${statusStyles[status]}`}>{status}</span>;
}
