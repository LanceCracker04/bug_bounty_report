import { useEffect, useState } from "react";
import type { DiagnosticsMetadata, HealthCheckResult } from "../types/phase6";
import type { HealthData } from "../utils/dataHealthCheck";
import {
  createSafeRepairPlan,
  runDataHealthCheck,
} from "../utils/dataHealthCheck";
import {
  EVIDENCE_DATABASE_VERSION,
  evidenceDatabaseCounts,
} from "../utils/evidenceDatabase";
import { downloadBlob } from "../utils/backup";

export function DiagnosticsPage({
  data,
  metadata,
  onSaveMetadata,
  onRepair,
}: {
  data: HealthData;
  metadata: DiagnosticsMetadata;
  onSaveMetadata: (metadata: DiagnosticsMetadata) => void;
  onRepair: (result: HealthCheckResult) => void;
}) {
  const [result, setResult] = useState<HealthCheckResult | undefined>(
    metadata.lastHealthResult
      ? {
          checkedAt: metadata.lastHealthScanAt ?? "",
          findings: metadata.lastHealthResult,
          repairableCount: metadata.lastHealthResult.filter(
            (item) => item.repairable,
          ).length,
        }
      : undefined,
  );
  const [usage, setUsage] = useState<string>("Unavailable");
  const [dbCounts, setDbCounts] = useState<{
    files: number;
    revisions: number;
  }>({ files: 0, revisions: 0 });
  useEffect(() => {
    void (async () => {
      try {
        setDbCounts(await evidenceDatabaseCounts());
      } catch {
        /* diagnostics makes the limitation visible through zero/unavailable indicators */
      }
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        setUsage(
          estimate.usage ? `${Math.round(estimate.usage / 1024)} KB` : "0 KB",
        );
      }
    })();
  }, []);
  const run = async () => {
    const next = await runDataHealthCheck(data);
    setResult(next);
    onSaveMetadata({
      ...metadata,
      lastHealthScanAt: next.checkedAt,
      lastHealthResult: next.findings,
    });
  };
  const items = [
    ["Application version", "0.6.0"],
    ["Schema version", "2"],
    ["IndexedDB version", String(EVIDENCE_DATABASE_VERSION)],
    ["Browser", navigator.userAgent],
    [
      "PWA support",
      "serviceWorker" in navigator ? "Supported" : "Not supported",
    ],
    [
      "Service worker",
      navigator.serviceWorker?.controller
        ? "Active"
        : "Not controlling this page",
    ],
    [
      "localStorage",
      (() => {
        try {
          localStorage.getItem("bug-bounty-reports");
          return "Available";
        } catch {
          return "Unavailable";
        }
      })(),
    ],
    ["IndexedDB", "indexedDB" in window ? "Available" : "Unavailable"],
    ["Reports", String(data.reports.length)],
    ["Evidence records", String(dbCounts.files)],
    ["Evidence revisions", String(dbCounts.revisions)],
    ["Programs", String(data.programs.length)],
    ["Assets", String(data.assets.length)],
    ["Retests", String(data.retests.length)],
    ["Communications", String(data.communications.length)],
    ["Snapshots", String(data.snapshots.length)],
    ["Approximate storage", usage],
    [
      "Last backup",
      metadata.lastBackupAt
        ? new Date(metadata.lastBackupAt).toLocaleString()
        : "Not recorded",
    ],
    [
      "Last restore",
      metadata.lastRestoreAt
        ? new Date(metadata.lastRestoreAt).toLocaleString()
        : "Not recorded",
    ],
    [
      "Last integrity scan",
      metadata.lastIntegrityScanAt
        ? new Date(metadata.lastIntegrityScanAt).toLocaleString()
        : "Not recorded",
    ],
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-lg border border-slate-800 bg-[#101318] p-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Recovery and Diagnostics
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Local health information only; report contents are not displayed here.
          Keep regular backups because browser storage is not guaranteed
          permanent.
        </p>
      </section>
      <section className="editor-section">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([label, value]) => (
            <article
              className="rounded border border-slate-800 bg-[#0d1014] p-3"
              key={label}
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-1 break-all text-sm text-slate-200">{value}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="editor-section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Data Health Check
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Repairs are limited to unambiguous link cleanup. Ambiguous
              relationships are left for manual review.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="button-secondary"
              type="button"
              onClick={() => void run()}
            >
              Run health check
            </button>
            {result && (
              <button
                className="button-primary"
                type="button"
                disabled={!result.repairableCount}
                onClick={() => onRepair(result)}
              >
                Repair safe issues ({result.repairableCount})
              </button>
            )}
          </div>
        </div>
        {result && (
          <>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="badge border-red-900 bg-red-950/40 text-red-200">
                Critical{" "}
                {
                  result.findings.filter((item) => item.severity === "Critical")
                    .length
                }
              </span>
              <span className="badge border-amber-900 bg-amber-950/40 text-amber-200">
                Warnings{" "}
                {
                  result.findings.filter((item) => item.severity === "Warning")
                    .length
                }
              </span>
              <span className="badge border-slate-700 bg-slate-800 text-slate-300">
                Informational{" "}
                {
                  result.findings.filter(
                    (item) => item.severity === "Informational",
                  ).length
                }
              </span>
              <button
                className="table-action"
                type="button"
                onClick={() =>
                  downloadBlob(
                    new Blob([JSON.stringify(result, null, 2)], {
                      type: "application/json",
                    }),
                    "bug-bounty-report-diagnostics.json",
                  )
                }
              >
                Export diagnostic report
              </button>
            </div>
            <div className="mt-4 max-h-[35rem] space-y-2 overflow-y-auto">
              {result.findings.length ? (
                result.findings.map((item) => (
                  <article
                    className="rounded border border-slate-800 bg-[#0d1014] p-3"
                    key={item.id}
                  >
                    <p className="font-medium text-slate-200">
                      {item.severity} · {item.area}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {item.message}
                    </p>
                    {item.repairable && (
                      <p className="mt-1 text-xs text-cyan-300">
                        Safe repair available
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <p className="rounded border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">
                  No data-health issues were detected by local checks.
                </p>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Repair plan: {createSafeRepairPlan(result).length} unambiguous
              item(s). Export a backup before bulk repair.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
