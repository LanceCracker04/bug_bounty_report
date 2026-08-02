import { useState } from "react";
import type { ReportSnapshot } from "../../types/history";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface VersionHistoryProps {
  snapshots: ReportSnapshot[];
  onCreate: (label?: string) => void;
  onPreview: (snapshot: ReportSnapshot) => void;
  onRestore: (snapshot: ReportSnapshot) => void;
  onDelete: (snapshot: ReportSnapshot) => void;
  onLabel: (snapshot: ReportSnapshot, label: string) => void;
}

export function VersionHistory({ snapshots, onCreate, onPreview, onRestore, onDelete, onLabel }: VersionHistoryProps) {
  const [label, setLabel] = useState(""); const [restoring, setRestoring] = useState<ReportSnapshot>(); const [deleting, setDeleting] = useState<ReportSnapshot>();
  return <section className="editor-section" id="versions"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-3"><span className="section-index">08</span><h2 className="text-base font-semibold text-slate-200">Version History</h2></div><p className="mt-2 text-sm text-slate-500">Manual versions and important status changes are preserved locally.</p></div><div className="flex gap-2"><input className="input-field w-44" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Optional label" aria-label="Snapshot label" /><button className="button-secondary" type="button" onClick={() => { onCreate(label.trim() || undefined); setLabel(""); }}>Create Version</button></div></div><div className="mt-5 space-y-2">{snapshots.length ? snapshots.map((snapshot) => <article className="flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-[#0d1014] p-3" key={snapshot.id}><div className="min-w-48 flex-1"><p className="text-sm font-medium text-slate-200">{snapshot.label || snapshot.reason}</p><p className="mt-1 text-xs text-slate-500">{new Date(snapshot.createdAt).toLocaleString()} · {snapshot.data.status} · Quality {snapshot.data.qualityResult?.score ?? "—"}</p></div><input className="input-field w-36 text-xs" value={snapshot.label ?? ""} onChange={(event) => onLabel(snapshot, event.target.value)} placeholder="Add label" aria-label="Snapshot label" /><button className="table-action" type="button" onClick={() => onPreview(snapshot)}>Preview</button><button className="table-action" type="button" onClick={() => setRestoring(snapshot)}>Restore</button><button className="table-action-danger" type="button" onClick={() => setDeleting(snapshot)}>Delete</button></article>) : <p className="rounded border border-dashed border-slate-700 p-4 text-sm text-slate-500">No snapshots have been created yet.</p>}</div><ConfirmDialog isOpen={Boolean(restoring)} title="Restore this version?" description="The current report will be snapshotted first, then this version will replace the report content while preserving its ID and reference." confirmLabel="Restore Version" confirmTone="primary" onConfirm={() => { if (restoring) onRestore(restoring); setRestoring(undefined); }} onCancel={() => setRestoring(undefined)} /><ConfirmDialog isOpen={Boolean(deleting)} title="Delete snapshot?" description="This removes only the selected historical snapshot." confirmLabel="Delete Snapshot" onConfirm={() => { if (deleting) onDelete(deleting); setDeleting(undefined); }} onCancel={() => setDeleting(undefined)} /></section>;
}
