import { useMemo, useState } from "react";
import type { NavigableAppPage } from "../../App";
import type {
  CommunicationEntry,
  FindingFamily,
  InformationRequest,
  RetestRecord,
  RootCauseEntry,
  SanitizationProfile,
} from "../../types/phase6";
import type { Report } from "../../types/report";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: NavigableAppPage) => void;
  onOpenReport: (report: Report) => void;
  onLock: () => void;
  onPrivacy: () => void;
  reports: Report[];
  retests: RetestRecord[];
  communications: CommunicationEntry[];
  requests: InformationRequest[];
  families: FindingFamily[];
  rootCauses: RootCauseEntry[];
  profiles: SanitizationProfile[];
}
export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenReport,
  onLock,
  onPrivacy,
  reports,
  retests,
  communications,
  requests,
  families,
  rootCauses,
  profiles,
}: Props) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) return [];
    const match = (value: string) => value.toLowerCase().includes(normalized);
    return [
      {
        kind: "Report",
        label: reports
          .filter((item) =>
            match(`${item.reportReference} ${item.title} ${item.target}`),
          )
          .slice(0, 6)
          .map((item) => ({
            id: item.id,
            text: `${item.reportReference} · ${item.title || "Untitled"}`,
            action: () => onOpenReport(item),
          })),
      },
      {
        kind: "Retest",
        label: retests
          .filter((item) =>
            match(`${item.title} ${item.currentBehavior ?? ""}`),
          )
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            text: item.title,
            action: () => onNavigate("retests"),
          })),
      },
      {
        kind: "Communication",
        label: communications
          .filter((item) => match(`${item.subject ?? ""} ${item.summary}`))
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            text: item.subject || item.summary.slice(0, 90),
            action: () => onNavigate("communications"),
          })),
      },
      {
        kind: "Information request",
        label: requests
          .filter((item) => match(`${item.requestType} ${item.requestText}`))
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            text: item.requestType,
            action: () => onNavigate("communications"),
          })),
      },
      {
        kind: "Finding family",
        label: families
          .filter((item) => match(`${item.name} ${item.description ?? ""}`))
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            text: item.name,
            action: () => onNavigate("families"),
          })),
      },
      {
        kind: "Root cause",
        label: rootCauses
          .filter((item) => match(`${item.name} ${item.description ?? ""}`))
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            text: item.name,
            action: () => onNavigate("families"),
          })),
      },
      {
        kind: "Sanitization profile",
        label: profiles
          .filter((item) => match(item.name))
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            text: item.name,
            action: () => onNavigate("sanitized"),
          })),
      },
    ].filter((group) => group.label.length);
  }, [
    communications,
    families,
    normalized,
    onNavigate,
    onOpenReport,
    profiles,
    reports,
    requests,
    retests,
    rootCauses,
  ]);
  if (!open) return null;
  const commands: Array<[string, () => void]> = [
    ["Start Retest", () => onNavigate("retests")],
    ["Open Retest Workspace", () => onNavigate("retests")],
    ["Record Communication", () => onNavigate("communications")],
    ["Create Information Request", () => onNavigate("communications")],
    ["Open Sanitized Sharing", () => onNavigate("sanitized")],
    ["Lock Workspace", onLock],
    ["Activate Privacy Screen", onPrivacy],
    ["Run Data Health Check", () => onNavigate("diagnostics")],
    ["Open Diagnostics", () => onNavigate("diagnostics")],
    ["Export Encrypted Backup", () => onNavigate("settings")],
  ];
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 p-4 pt-[12vh]"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-2xl rounded-lg border border-slate-700 bg-[#161a20] p-3 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          className="input-field w-full"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace or run a command…"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
        />
        {normalized ? (
          <div className="mt-3 max-h-[60vh] space-y-3 overflow-y-auto">
            {results.length ? (
              results.map((group) => (
                <div key={group.kind}>
                  <p className="px-2 text-xs uppercase tracking-wide text-slate-500">
                    {group.kind}
                  </p>
                  {group.label.map((item) => (
                    <button
                      className="mt-1 block w-full rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                      type="button"
                      key={item.id}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">
                No safe searchable local metadata matched. Full transcript
                bodies and secrets are not indexed.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 grid gap-1 sm:grid-cols-2">
            {commands.map(([label, action]) => (
              <button
                className="rounded px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
                type="button"
                key={label}
                onClick={() => {
                  action();
                  onClose();
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
