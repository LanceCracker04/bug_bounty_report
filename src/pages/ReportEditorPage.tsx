import { useCallback, useEffect, useState } from "react";
import { ActivityTimeline } from "../components/activity/ActivityTimeline";
import { AssistantPanel } from "../components/assistant/AssistantPanel";
import { RedactionPanel } from "../components/redaction/RedactionPanel";
import { SimilarityPanel } from "../components/comparison/SimilarityPanel";
import { CvssCalculator } from "../components/cvss/CvssCalculator";
import { EvidenceManager } from "../components/evidence/EvidenceManager";
import { QualityPanel } from "../components/quality/QualityPanel";
import { ReportPreviewDocument } from "../components/reports/ReportPreviewDocument";
import { StructuredSteps } from "../components/reports/StructuredSteps";
import { SeverityBadge } from "../components/ui/Badges";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { VersionHistory } from "../components/versions/VersionHistory";
import { LifecyclePanel } from "../components/lifecycle/LifecyclePanel";
import { EMPTY_REPORT_DRAFT, REPORT_STATUSES, SEVERITIES, type Report, type ReportDraft, type ReportStatus, type Severity } from "../types/report";
import type { ActivityEntry } from "../types/activity";
import type { ReportSnapshot } from "../types/history";
import type { AiSettings, AppSettings } from "../types/settings";
import type { FindingLifecycleStatus } from "../types/phase6";
import { calculateCvssBaseScore } from "../utils/cvss";
import { deleteEvidenceFile } from "../utils/evidenceDatabase";
import { generateReportId } from "../utils/reportHelpers";

interface LeaveHandlers {
  save: () => Promise<boolean>;
  discard: () => Promise<void>;
}

interface ReportEditorPageProps {
  report?: Report;
  initialDraft?: ReportDraft;
  reportReference: string;
  settings: AppSettings;
  onSave: (report: Report, navigateAfterSave: boolean) => void;
  onAutosave: (report: Report) => void;
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
  registerLeaveHandlers: (handlers: LeaveHandlers) => void;
  onNotify: (type: "success" | "error" | "warning", message: string) => void;
  activities: ActivityEntry[];
  snapshots: ReportSnapshot[];
  onQualityCheck: (report: Report) => Promise<NonNullable<Report["qualityResult"]>>;
  onCreateSnapshot: (report: Report, label?: string) => void;
  onPreviewSnapshot: (snapshot: ReportSnapshot) => void;
  onRestoreSnapshot: (snapshot: ReportSnapshot) => void;
  onDeleteSnapshot: (snapshot: ReportSnapshot) => void;
  onLabelSnapshot: (snapshot: ReportSnapshot, label: string) => void;
  onPrepareSubmission: (report: Report) => void;
  aiSettings: AiSettings;
  allReports: Report[];
  onLifecycleTransition: (report: Report, next: FindingLifecycleStatus, reason: string, actor: string, source: "Researcher" | "Program Response") => Report | undefined;
}

type StringDraftField = "title" | "programName" | "platform" | "target" | "vulnerableEndpoint" | "vulnerabilityType" | "cvssScore" | "summary" | "description" | "prerequisites" | "reproductionSteps" | "impact" | "evidence" | "remediation" | "researcherName" | "affectedAsset" | "testingEnvironment" | "discoveredAt" | "vulnerabilityClass" | "cvssVector";

const requiredFields: Array<{ field: StringDraftField; label: string }> = [
  { field: "title", label: "Report Title" }, { field: "programName", label: "Program Name" },
  { field: "target", label: "Target URL or Domain" }, { field: "vulnerabilityType", label: "Vulnerability Type" },
];

function toDraft(report?: Report, initialDraft?: ReportDraft): ReportDraft {
  if (initialDraft) return structuredClone(initialDraft);
  if (!report) return structuredClone(EMPTY_REPORT_DRAFT);
  return structuredClone({
    title: report.title, programName: report.programName, platform: report.platform, target: report.target,
    vulnerableEndpoint: report.vulnerableEndpoint, vulnerabilityType: report.vulnerabilityType, severity: report.severity,
    status: report.status, cvssScore: report.cvssScore, summary: report.summary, description: report.description,
    prerequisites: report.prerequisites, reproductionSteps: report.reproductionSteps, impact: report.impact,
    evidence: report.evidence, remediation: report.remediation, researcherName: report.researcherName,
    affectedAsset: report.affectedAsset, testingEnvironment: report.testingEnvironment, discoveredAt: report.discoveredAt,
    vulnerabilityClass: report.vulnerabilityClass, cvssVector: report.cvssVector, cvssMode: report.cvssMode,
    cvssMetrics: report.cvssMetrics, severityOverridden: report.severityOverridden, structuredSteps: report.structuredSteps,
    evidenceItems: report.evidenceItems, references: report.references, disclosureTimeline: report.disclosureTimeline,
    templateId: report.templateId,
    submissionDetails: report.submissionDetails, submissionChecklist: report.submissionChecklist, qualityResult: report.qualityResult,
    archivedAt: report.archivedAt, lastReviewedAt: report.lastReviewedAt,
    relatedReportIds: report.relatedReportIds, ignoredSimilarityReportIds: report.ignoredSimilarityReportIds, redactionScanSummary: report.redactionScanSummary, similarityScanSummary: report.similarityScanSummary, lastAssistantReviewAt: report.lastAssistantReviewAt, programProfileId: report.programProfileId, linkedAssetIds: report.linkedAssetIds, testingSessionIds: report.testingSessionIds, httpTranscriptIds: report.httpTranscriptIds, lastScopeValidation: report.lastScopeValidation, scopeReviewConfirmedAt: report.scopeReviewConfirmedAt, scopeOverrideReason: report.scopeOverrideReason, expectedResponseAt: report.expectedResponseAt, followUpAt: report.followUpAt, disclosureDeadlineAt: report.disclosureDeadlineAt, embargoEndAt: report.embargoEndAt, nextAction: report.nextAction, lifecycleStatus: report.lifecycleStatus, lifecycleEvents: report.lifecycleEvents, remediationOwnerLabel: report.remediationOwnerLabel, remediationStartedAt: report.remediationStartedAt, readyForRetestAt: report.readyForRetestAt, closedAt: report.closedAt, riskAcceptanceNote: report.riskAcceptanceNote, rootCauseId: report.rootCauseId, findingFamilyId: report.findingFamilyId, regressionDetectedAt: report.regressionDetectedAt, isExampleReport: report.isExampleReport, templateGuidance: report.templateGuidance,
  });
}

interface TextFieldProps {
  label: string;
  field: StringDraftField;
  value: string;
  onChange: (field: StringDraftField, value: string) => void;
  required?: boolean;
  error?: string;
  type?: "text" | "number" | "date";
  placeholder?: string;
}

function TextField({ label, field, value, onChange, required, error, type = "text", placeholder }: TextFieldProps) {
  return <label className="field-group"><span>{label}{required && <em className="ml-1 text-red-400 not-italic">*</em>}</span><input className={`input-field ${error ? "input-error" : ""}`} type={type} value={value} onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} min={type === "number" ? "0" : undefined} max={type === "number" ? "10" : undefined} step={type === "number" ? "0.1" : undefined} />{error && <small className="text-xs text-red-400">{error}</small>}</label>;
}

function TextArea({ label, field, value, onChange, placeholder }: Omit<TextFieldProps, "required" | "error" | "type">) {
  return <label className="field-group"><span>{label}</span><textarea className="input-field min-h-30 resize-y" value={value} onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} /></label>;
}

function ReferenceManager({ draft, onChange }: { draft: ReportDraft; onChange: (draft: Partial<ReportDraft>) => void }) {
  const addReference = () => onChange({ references: [...draft.references, { id: generateReportId(), label: "", url: "" }] });
  const update = (id: string, change: { label?: string; url?: string }) => onChange({ references: draft.references.map((reference) => reference.id === id ? { ...reference, ...change } : reference) });
  return <section className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-medium text-slate-200">References</h3><p className="mt-1 text-xs text-slate-500">Supporting advisory, documentation, or standards links.</p></div><button className="button-secondary px-3 py-1.5 text-xs" type="button" onClick={addReference}>+ Add Reference</button></div>{draft.references.map((reference) => <div className="grid gap-2 rounded-md border border-slate-800 bg-[#0d1014] p-3 md:grid-cols-[1fr_1.5fr_auto]" key={reference.id}><input className="input-field" value={reference.label} onChange={(event) => update(reference.id, { label: event.target.value })} placeholder="Reference label" aria-label="Reference label" /><input className="input-field" type="url" value={reference.url} onChange={(event) => update(reference.id, { url: event.target.value })} placeholder="https://…" aria-label="Reference URL" /><button className="table-action-danger" type="button" onClick={() => onChange({ references: draft.references.filter((item) => item.id !== reference.id) })}>Delete</button></div>)}</section>;
}

function TimelineManager({ draft, onChange }: { draft: ReportDraft; onChange: (draft: Partial<ReportDraft>) => void }) {
  const addTimeline = () => onChange({ disclosureTimeline: [...draft.disclosureTimeline, { id: generateReportId(), date: "", event: "" }] });
  const update = (id: string, change: { date?: string; event?: string }) => onChange({ disclosureTimeline: draft.disclosureTimeline.map((item) => item.id === id ? { ...item, ...change } : item) });
  return <section className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-medium text-slate-200">Disclosure Timeline</h3><p className="mt-1 text-xs text-slate-500">Record material disclosure or triage milestones.</p></div><button className="button-secondary px-3 py-1.5 text-xs" type="button" onClick={addTimeline}>+ Add Event</button></div>{draft.disclosureTimeline.map((item) => <div className="grid gap-2 rounded-md border border-slate-800 bg-[#0d1014] p-3 md:grid-cols-[10rem_1fr_auto]" key={item.id}><input className="input-field" type="date" value={item.date} onChange={(event) => update(item.id, { date: event.target.value })} aria-label="Timeline date" /><input className="input-field" value={item.event} onChange={(event) => update(item.id, { event: event.target.value })} placeholder="Disclosure event" aria-label="Timeline event" /><button className="table-action-danger" type="button" onClick={() => onChange({ disclosureTimeline: draft.disclosureTimeline.filter((entry) => entry.id !== item.id) })}>Delete</button></div>)}</section>;
}

export function ReportEditorPage({ report, initialDraft, reportReference, settings, aiSettings, allReports, onSave, onAutosave, onBack, onDirtyChange, registerLeaveHandlers, onNotify, activities, snapshots, onQualityCheck, onCreateSnapshot, onPreviewSnapshot, onRestoreSnapshot, onDeleteSnapshot, onLabelSnapshot, onPrepareSubmission, onLifecycleTransition }: ReportEditorPageProps) {
  const [draft, setDraft] = useState<ReportDraft>(() => toDraft(report, initialDraft));
  const [errors, setErrors] = useState<Partial<Record<StringDraftField, string>>>({});
  const [autosaveState, setAutosaveState] = useState<"saved" | "saving" | "unsaved" | "failed">("saved");
  const [showPreview, setShowPreview] = useState(false);
  const [showConvertExample, setShowConvertExample] = useState(false);
  const [draftId] = useState(() => report?.id ?? generateReportId());
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => JSON.stringify(toDraft(report, initialDraft)));
  const isEditing = Boolean(report);
  const draftIsDirty = JSON.stringify(draft) !== baselineSnapshot;

  const composeReport = useCallback((status?: ReportStatus, autosaved = false): Report => {
    const now = new Date().toISOString();
    return { ...draft, id: report?.id ?? draftId, reportReference: report?.reportReference ?? reportReference, status: draft.isExampleReport ? "Draft" : status ?? draft.status, createdAt: report?.createdAt ?? now, updatedAt: now, lastAutosavedAt: autosaved ? now : report?.lastAutosavedAt };
  }, [draft, draftId, report, reportReference]);

  const applyDraft = useCallback((producer: (current: ReportDraft) => ReportDraft) => {
    setDraft((current) => {
      const next = producer(current);
      const dirty = JSON.stringify(next) !== baselineSnapshot;
      onDirtyChange(dirty);
      if (dirty) setAutosaveState("unsaved");
      return next;
    });
  }, [baselineSnapshot, onDirtyChange]);

  useEffect(() => {
    if (!isEditing || !draftIsDirty) return undefined;
    const timer = window.setTimeout(() => {
      try {
        setAutosaveState("saving");
        const savedReport = composeReport(undefined, true);
        onAutosave(savedReport);
        setBaselineSnapshot(JSON.stringify(draft));
        onDirtyChange(false);
        setAutosaveState("saved");
      } catch (error) {
        setAutosaveState("failed");
        onNotify("error", error instanceof Error ? `Autosave failed: ${error.message}` : "Autosave failed.");
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [composeReport, draft, draftIsDirty, isEditing, onAutosave, onDirtyChange, onNotify]);

  const updateField = (field: StringDraftField, value: string) => {
    applyDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const updateDraft = (change: Partial<ReportDraft>) => applyDraft((current) => ({ ...current, ...change }));
  const validate = useCallback((): boolean => {
    const nextErrors: Partial<Record<StringDraftField, string>> = {};
    requiredFields.forEach(({ field, label }) => { if (!draft[field].trim()) nextErrors[field] = `${label} is required.`; });
    const score = Number(draft.cvssScore);
    if (draft.cvssMode === "manual" && !draft.cvssScore.trim()) nextErrors.cvssScore = "Enter a manual CVSS score between 0 and 10.";
    if (draft.cvssScore && (Number.isNaN(score) || score < 0 || score > 10)) nextErrors.cvssScore = "CVSS score must be between 0 and 10.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [draft]);
  const save = useCallback((status?: ReportStatus, navigateAfterSave = true): boolean => {
    if (!validate()) { onNotify("warning", "Complete the required report details before saving."); return false; }
    try {
      const savedReport = composeReport(status);
      onSave(savedReport, navigateAfterSave);
      setBaselineSnapshot(JSON.stringify({ ...draft, status: status ?? draft.status }));
      onDirtyChange(false);
      setAutosaveState("saved");
      return true;
    } catch (error) { onNotify("error", error instanceof Error ? `Save failed: ${error.message}` : "Save failed."); return false; }
  }, [composeReport, draft, onDirtyChange, onNotify, onSave, validate]);
  const discardUnsavedEvidence = useCallback(async () => {
    const originalImageIds = new Set(report?.evidenceItems.filter((item) => item.type === "image").map((item) => item.id) ?? []);
    await Promise.all(draft.evidenceItems.filter((item) => item.type === "image" && !originalImageIds.has(item.id)).map(async (item) => { try { await deleteEvidenceFile(item.id); } catch { /* A missing file is already unavailable. */ } }));
  }, [draft.evidenceItems, report]);

  useEffect(() => { registerLeaveHandlers({ save: async () => save(undefined, false), discard: discardUnsavedEvidence }); }, [discardUnsavedEvidence, draft, registerLeaveHandlers, save]);

  const previewReport = composeReport();
  const calculatedScore = calculateCvssBaseScore(draft.cvssMetrics).toFixed(1);
  const runQuality = async () => {
    const result = await onQualityCheck(previewReport);
    if (result) updateDraft({ qualityResult: result, lastReviewedAt: result.checkedAt });
  };
  const reviewIssue = (issueId: string) => {
    if (!draft.qualityResult) return;
    updateDraft({ qualityResult: { ...draft.qualityResult, issues: draft.qualityResult.issues.map((item) => item.id === issueId ? { ...item, reviewed: true } : item) } });
  };
  const goToSection = (section?: string) => {
    const sectionLabels: Record<string, string> = {
      "report-details": "Report Details",
      "report-content": "Report Content",
      "structured-steps": "Reproduction Workflow",
      "reproduction-workflow": "Reproduction Workflow",
      evidence: "Evidence",
      cvss: "Risk Assessment",
      "risk-assessment": "Risk Assessment",
      "supporting-information": "Supporting Information",
      quality: "Report Quality",
      submission: "Submission",
    };
    const target = document.getElementById(section ?? "quality")
      ?? [...document.querySelectorAll("h2")].find((heading) => heading.textContent?.trim() === sectionLabels[section ?? "quality"])?.closest("section");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const convertExample = () => {
    updateDraft({ title: draft.title.replace(/^\[EXAMPLE\]\s*/i, ""), programName: "", platform: "", target: "[TARGET TO CONFIRM]", vulnerableEndpoint: "[ENDPOINT TO CONFIRM]", affectedAsset: "", status: "Draft", isExampleReport: false, submissionDetails: { platform: "Other", outcome: "Not Submitted" } });
    setShowConvertExample(false); onNotify("success", "Example converted. Confirm each placeholder before using this report for an authorized finding.");
  };
  const snapshotActions = {
    onCreate: (label?: string) => { if (!report) { onNotify("warning", "Save the report before creating a version."); return; } onCreateSnapshot(previewReport, label); },
    onPreview: onPreviewSnapshot, onRestore: onRestoreSnapshot, onDelete: onDeleteSnapshot, onLabel: onLabelSnapshot,
  };
  return <><form className="mx-auto max-w-6xl space-y-6" onSubmit={(event) => { event.preventDefault(); save(); }}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-400">{isEditing ? "Update the finding and its submission details." : "Document the finding before it leaves your research workspace."}</p><p className="mt-1 text-xs text-slate-600">Fields marked with * are required to save. {isEditing ? `Autosave: ${autosaveState === "saving" ? "Saving…" : autosaveState === "saved" ? "Saved" : autosaveState === "failed" ? "Save failed" : "Unsaved changes"}.` : "New reports are saved only when you choose a save action."}</p></div><div className="flex flex-wrap gap-2"><button className="button-secondary" type="button" onClick={() => setShowPreview(true)}>Preview Report</button>{draft.isExampleReport ? <button className="button-primary" type="button" onClick={() => setShowConvertExample(true)}>Convert Example to Working Report</button> : <button className="button-primary" type="button" onClick={() => report ? onPrepareSubmission(previewReport) : onNotify("warning", "Save the report before preparing a submission.")}>Prepare Submission</button>}{isEditing && <button className="button-secondary" type="button" onClick={onBack}>← Back to Reports</button>}</div></div>
    {draft.isExampleReport && <section className="rounded-lg border border-amber-600/70 bg-amber-950/30 p-4" role="status"><h2 className="font-semibold text-amber-200">Fictional educational example</h2><p className="mt-1 text-sm text-amber-100/80">This report uses placeholder-only training details. It remains a Draft and cannot be prepared for submission until you convert it and verify every field.</p></section>}
    {draft.templateGuidance && <section className="rounded-lg border border-cyan-900/70 bg-cyan-950/20 p-4"><h2 className="font-semibold text-cyan-100">Template Writing Guidance</h2><p className="mt-1 text-sm text-slate-400">Guidance is separate from report facts. Keep or replace it only after confirming your own authorized evidence.</p><div className="mt-3 grid gap-4 lg:grid-cols-3"><div><h3 className="text-sm font-medium text-slate-200">Evidence checklist</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">{draft.templateGuidance.evidenceChecklist.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3 className="text-sm font-medium text-slate-200">Questions to answer</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">{draft.templateGuidance.questionsToAnswer.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3 className="text-sm font-medium text-slate-200">Avoid</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">{draft.templateGuidance.commonMistakes.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>}
    {isEditing && <LifecyclePanel report={previewReport} onTransition={(next, reason, actor, source) => { const updated = onLifecycleTransition(previewReport, next, reason, actor, source); if (updated) { setDraft(toDraft(updated)); setBaselineSnapshot(JSON.stringify(toDraft(updated))); onDirtyChange(false); } }} />}
    <section className="editor-section"><div className="section-heading"><span>01</span><div><h2>Report Details</h2><p>Core tracking, submission metadata, and technical scope.</p></div></div><div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-[#0d1014] px-4 py-3"><span className="text-xs uppercase tracking-wide text-slate-500">Report reference</span><code className="font-semibold text-cyan-300">{report?.reportReference ?? reportReference}</code><button className="table-action" type="button" onClick={() => void navigator.clipboard.writeText(report?.reportReference ?? reportReference).then(() => onNotify("success", "Report reference copied.")).catch(() => onNotify("error", "Could not copy the report reference."))}>Copy</button><span className="ml-auto"><SeverityBadge severity={draft.severity} /></span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><TextField label="Report Title" field="title" value={draft.title} onChange={updateField} required error={errors.title} placeholder="Stored XSS via profile bio" /><TextField label="Program Name" field="programName" value={draft.programName} onChange={updateField} required error={errors.programName} placeholder="Example Security Program" /><TextField label="Platform" field="platform" value={draft.platform} onChange={updateField} placeholder="HackerOne, Bugcrowd, private" /><TextField label="Target URL or Domain" field="target" value={draft.target} onChange={updateField} required error={errors.target} placeholder="https://app.example.com" /><TextField label="Affected Asset" field="affectedAsset" value={draft.affectedAsset} onChange={updateField} placeholder="Web application / API / hostname" /><TextField label="Vulnerable Endpoint" field="vulnerableEndpoint" value={draft.vulnerableEndpoint} onChange={updateField} placeholder="/profile/update" /><TextField label="Vulnerability Type" field="vulnerabilityType" value={draft.vulnerabilityType} onChange={updateField} required error={errors.vulnerabilityType} placeholder="Cross-site scripting (XSS)" /><TextField label="Vulnerability Class" field="vulnerabilityClass" value={draft.vulnerabilityClass} onChange={updateField} placeholder="Injection, Authorization, etc." /><TextField label="Testing Environment" field="testingEnvironment" value={draft.testingEnvironment} onChange={updateField} placeholder="Production, staging, mobile app" /><TextField label="Discovery Date" field="discoveredAt" value={draft.discoveredAt} onChange={updateField} type="date" /><TextField label="Researcher Name" field="researcherName" value={draft.researcherName} onChange={updateField} placeholder="Your name or handle" /><label className="field-group"><span>Status</span>{draft.isExampleReport ? <input className="input-field" value="Draft (educational example)" readOnly aria-describedby="example-status-note" /> : <select className="input-field" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as ReportStatus })}>{REPORT_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}</select>}{draft.isExampleReport && <small id="example-status-note" className="text-xs text-amber-300">Convert the example before changing its status.</small>}</label><label className="field-group"><span>Severity</span><select className="input-field" value={draft.severity} onChange={(event) => updateDraft({ severity: event.target.value as Severity, severityOverridden: true })}>{SEVERITIES.map((severity) => <option value={severity} key={severity}>{severity}</option>)}</select><small className="text-xs text-slate-600">Changing this marks severity as manually overridden.</small></label></div></section>
    <section className="editor-section"><div className="section-heading"><span>02</span><div><h2>Risk Assessment</h2><p>Calculate a CVSS 3.1 base score or record a verified manual score.</p></div></div><CvssCalculator mode={draft.cvssMode} metrics={draft.cvssMetrics} score={draft.cvssScore} vector={draft.cvssVector} severity={draft.severity} severityOverridden={draft.severityOverridden} error={errors.cvssScore} onChange={(change) => updateDraft({ cvssMode: change.mode ?? draft.cvssMode, cvssMetrics: change.metrics ?? draft.cvssMetrics, cvssScore: change.score ?? draft.cvssScore, cvssVector: change.vector ?? draft.cvssVector, severity: change.severity ?? draft.severity, severityOverridden: change.severityOverridden ?? draft.severityOverridden })} /><p className="mt-3 text-xs text-slate-600">Calculated base score: {calculatedScore}</p></section>
    <section className="editor-section"><div className="section-heading"><span>03</span><div><h2>Report Content</h2><p>Write a clear narrative that helps the triage team verify the finding.</p></div></div><div className="grid gap-5 lg:grid-cols-2"><TextArea label="Executive Summary" field="summary" value={draft.summary} onChange={updateField} placeholder="A concise overview of the issue and why it matters." /><TextArea label="Technical Description" field="description" value={draft.description} onChange={updateField} placeholder="Explain the vulnerable behavior and its root cause." /><TextArea label="Prerequisites" field="prerequisites" value={draft.prerequisites} onChange={updateField} placeholder="Accounts, roles, configuration, or setup needed." /><TextArea label="Legacy Plain Steps to Reproduce" field="reproductionSteps" value={draft.reproductionSteps} onChange={updateField} placeholder="Retained for older reports. Convert it to structured steps below when ready." /><TextArea label="Security Impact" field="impact" value={draft.impact} onChange={updateField} placeholder="Describe a realistic attacker outcome and affected users or data." /><TextArea label="Legacy Evidence Notes" field="evidence" value={draft.evidence} onChange={updateField} placeholder="Existing freeform evidence notes remain compatible." /><div className="lg:col-span-2"><TextArea label="Recommended Remediation" field="remediation" value={draft.remediation} onChange={updateField} placeholder="Suggest a practical fix and any defensive controls." /></div></div></section>
    <section className="editor-section"><div className="section-heading"><span>04</span><div><h2>Reproduction Workflow</h2><p>Use structured steps for a consistent, evidence-linked proof of concept.</p></div></div><StructuredSteps steps={draft.structuredSteps} evidenceItems={draft.evidenceItems} plainText={draft.reproductionSteps} onChange={(structuredSteps) => updateDraft({ structuredSteps })} /></section>
    <section className="editor-section"><div className="section-heading"><span>05</span><div><h2>Evidence</h2><p>Capture supporting screenshots, URLs, and technical notes.</p></div></div><EvidenceManager reportId={report?.id ?? draftId} evidenceItems={draft.evidenceItems} onChange={(evidenceItems) => updateDraft({ evidenceItems })} onNotify={onNotify} /></section>
    <section className="editor-section"><div className="section-heading"><span>06</span><div><h2>Supporting Information</h2><p>Keep useful sources and disclosure history with the report.</p></div></div><div className="grid gap-7 lg:grid-cols-2"><ReferenceManager draft={draft} onChange={updateDraft} /><TimelineManager draft={draft} onChange={updateDraft} /></div></section>
    <QualityPanel report={previewReport} onRun={runQuality} onReviewIssue={reviewIssue} onGoTo={goToSection} />
    <AssistantPanel report={previewReport} settings={aiSettings} onNotify={onNotify} onApply={(value, mode) => { const field = draft.summary === previewReport.summary ? "summary" : draft.description === previewReport.description ? "description" : draft.impact === previewReport.impact ? "impact" : "remediation"; updateDraft({ [field]: mode === "append" ? `${draft[field]}

${value}` : value }); onNotify("success", "Assistant suggestion applied to the editable draft."); }} />
    <RedactionPanel report={previewReport} onNotify={onNotify} onApply={(section, value) => updateDraft({ [section]: value })} />
    <SimilarityPanel report={previewReport} reports={allReports} onOpen={(candidate) => onNotify("warning", `Open ${candidate.reportReference} from the Reports page to compare it side by side.`)} onNotify={onNotify} />
    {report && <VersionHistory snapshots={snapshots} {...snapshotActions} />}
    {report && <ActivityTimeline entries={activities} />}
    <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-slate-800 bg-[#0b0d10]/95 py-4 backdrop-blur">{!isEditing && <button className="button-secondary mr-auto" type="button" onClick={onBack}>Cancel</button>}{isEditing ? <button className="button-primary" type="submit">Save Changes</button> : <><button className="button-secondary" type="button" onClick={() => save("Draft")}>Save Draft</button>{draft.isExampleReport ? <button className="button-secondary" type="button" onClick={() => setShowConvertExample(true)}>Convert Example First</button> : <button className="button-primary" type="button" onClick={() => save("Ready to Submit")}>Mark Ready</button>}</>}</div>
  </form>{showPreview && <ReportPreviewDocument report={previewReport} settings={settings} onBack={() => setShowPreview(false)} onNotify={onNotify} overlay />}<ConfirmDialog isOpen={showConvertExample} title="Convert this educational example?" description="This removes the [EXAMPLE] prefix, clears fictional program details, and replaces target details with placeholders. Review every remaining field before using the report for an authorized finding." confirmLabel="Convert to Working Report" onConfirm={convertExample} onCancel={() => setShowConvertExample(false)} /></>;
}
