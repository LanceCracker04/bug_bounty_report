import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import type {
  ImportResult,
  ImportStrategy,
} from "./components/backup/DataManagementPanel";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import {
  ToastRegion,
  type ToastMessage,
  type ToastType,
} from "./components/ui/Toast";
import { CommandPalette } from "./components/ui/CommandPalette";
import { DashboardPage } from "./pages/DashboardPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { ReportEditorPage } from "./pages/ReportEditorPage";
import { ReportPreviewPage } from "./pages/ReportPreviewPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SubmissionTrackerPage } from "./pages/SubmissionTrackerPage";
import { SubmissionWorkflowPage } from "./pages/SubmissionWorkflowPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { ProgramsPage } from "./pages/ProgramsPage";
import { RetestWorkspacePage } from "./pages/RetestWorkspacePage";
import { FindingFamiliesPage } from "./pages/FindingFamiliesPage";
import { CommunicationsPage } from "./pages/CommunicationsPage";
import { SanitizedSharingPage } from "./pages/SanitizedSharingPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import type { AssetRecord, ProgramProfile } from "./types/program";
import {
  loadAssets,
  loadPrograms,
  saveAssets,
  savePrograms,
} from "./utils/programStorage";
import type { ActivityAction, ActivityEntry } from "./types/activity";
import type { ReportSnapshot, SnapshotReason } from "./types/history";
import type { KnowledgeEntry } from "./types/knowledge";
import {
  DEFAULT_SETTINGS,
  type AiSettings,
  type AppSettings,
} from "./types/settings";
import {
  EMPTY_REPORT_DRAFT,
  type Report,
  type ReportDraft,
  type ReportStatus,
  type Severity,
  type SubmissionOutcome,
} from "./types/report";
import type { ReportTemplate } from "./types/template";
import {
  createActivity,
  loadActivities,
  saveActivities,
} from "./utils/activityStorage";
import type { ParsedBackup } from "./utils/backup";
import type { EvidenceScanResult } from "./utils/evidenceCleanup";
import {
  createDuplicate,
  filterReports,
  generateReportId,
} from "./utils/reportHelpers";
import {
  createReportMarkdown,
  downloadMarkdown,
  safeMarkdownFilename,
} from "./utils/markdownExport";
import {
  loadCustomKnowledge,
  saveCustomKnowledge,
} from "./utils/knowledgeStorage";
import { BUILT_IN_KNOWLEDGE } from "./components/knowledge/builtInKnowledge";
import { generateReportReference } from "./utils/reportReference";
import {
  runReportQualityCheck,
  synchronizeChecklist,
} from "./utils/reportQuality";
import { loadReports, saveReports } from "./utils/reportStorage";
import {
  addSnapshot,
  createSnapshot,
  loadSnapshots,
  saveSnapshots,
} from "./utils/reportSnapshots";
import { loadSettings, saveSettings } from "./utils/settingsStorage";
import {
  loadCustomTemplates,
  saveCustomTemplates,
} from "./utils/templateStorage";
import {
  loadTemplatePreferences,
  saveTemplatePreferences,
  type TemplatePreference,
} from "./utils/templatePreferences";
import {
  deleteAllEvidenceFiles,
  deleteEvidenceFile,
  deleteEvidenceFilesForReport,
  getEvidenceFile,
  saveEvidenceBlob,
} from "./utils/evidenceDatabase";
import { normalizeReports } from "./utils/reportMigration";
import { loadAiSettings, saveAiSettings } from "./utils/aiStorage";
import type {
  CommunicationEntry,
  DiagnosticsMetadata,
  FindingFamily,
  FindingLifecycleStatus,
  InformationRequest,
  RetestRecord,
  RootCauseEntry,
  SanitizationProfile,
} from "./types/phase6";
import {
  loadCommunications,
  loadDiagnostics,
  loadFindingFamilies,
  loadInformationRequests,
  loadRetests,
  loadRootCauses,
  loadSanitizationProfiles,
  saveCommunications,
  saveDiagnostics,
  saveFindingFamilies,
  saveInformationRequests,
  saveRetests,
  saveRootCauses,
  saveSanitizationProfiles,
} from "./utils/phase6Storage";
import {
  createLifecycleEvent,
  isImportantLifecycleTransition,
  lifecycleFromLegacy,
  reasonRequired,
  statusForLifecycle,
} from "./utils/lifecycle";
import { runDataHealthCheck, type HealthData } from "./utils/dataHealthCheck";
import {
  configureWorkspaceLock,
  loadLockSettings,
  saveLockSettings,
  verifyWorkspacePassphrase,
} from "./utils/lockStorage";
import type { LockSettings } from "./types/phase6";
import {
  exportRawMetadataBackup,
  shouldStartSafeRecovery,
  storageKeyStatus,
} from "./utils/safeRecovery";

export type AppPage =
  | "dashboard"
  | "reports"
  | "templates"
  | "settings"
  | "editor"
  | "preview"
  | "submissions"
  | "submission"
  | "knowledge"
  | "programs"
  | "retests"
  | "families"
  | "communications"
  | "sanitized"
  | "diagnostics"
  | "notFound";
export type NavigableAppPage = Exclude<
  AppPage,
  "editor" | "preview" | "submission" | "notFound"
>;

const pagePaths: Record<NavigableAppPage, string> = {
  dashboard: "/",
  reports: "/reports",
  programs: "/programs",
  submissions: "/submissions",
  retests: "/retests",
  families: "/finding-families",
  communications: "/communications",
  sanitized: "/sanitized-sharing",
  knowledge: "/knowledge-base",
  templates: "/templates",
  settings: "/settings",
  diagnostics: "/diagnostics",
};

function pageFromPath(pathname: string): AppPage {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const match = (
    Object.entries(pagePaths) as Array<[NavigableAppPage, string]>
  ).find(([, path]) => path === normalized);
  return match?.[0] ?? "notFound";
}

function pathForPage(page: AppPage): string | undefined {
  if (page === "editor" || page === "preview") return pagePaths.reports;
  if (page === "submission") return pagePaths.submissions;
  return page === "notFound" ? undefined : pagePaths[page];
}

interface EditorLeaveHandlers {
  save: () => Promise<boolean>;
  discard: () => Promise<void>;
}
type BulkAction =
  | "draft"
  | "ready"
  | "archive"
  | "restore"
  | "quality"
  | "exportMetadata"
  | "delete";

function App() {
  const [reports, setReports] = useState<Report[]>(() => loadReports());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [aiSettings, setAiSettings] = useState<AiSettings>(() =>
    loadAiSettings(),
  );
  const [customTemplates, setCustomTemplates] = useState<ReportTemplate[]>(() =>
    loadCustomTemplates(),
  );
  const [templatePreferences, setTemplatePreferences] = useState<
    TemplatePreference[]
  >(() => loadTemplatePreferences());
  const [programs, setPrograms] = useState<ProgramProfile[]>(() =>
    loadPrograms(),
  );
  const [assets, setAssets] = useState<AssetRecord[]>(() => loadAssets());
  const [customKnowledge, setCustomKnowledge] = useState<KnowledgeEntry[]>(() =>
    loadCustomKnowledge(),
  );
  const [activities, setActivities] = useState<ActivityEntry[]>(() =>
    loadActivities(),
  );
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>(() =>
    loadSnapshots(),
  );
  const [retests, setRetests] = useState<RetestRecord[]>(() => loadRetests());
  const [findingFamilies, setFindingFamilies] = useState<FindingFamily[]>(() =>
    loadFindingFamilies(),
  );
  const [rootCauses, setRootCauses] = useState<RootCauseEntry[]>(() =>
    loadRootCauses(),
  );
  const [communications, setCommunications] = useState<CommunicationEntry[]>(
    () => loadCommunications(),
  );
  const [informationRequests, setInformationRequests] = useState<
    InformationRequest[]
  >(() => loadInformationRequests());
  const [sanitizationProfiles, setSanitizationProfiles] = useState<
    SanitizationProfile[]
  >(() => loadSanitizationProfiles());
  const [diagnostics, setDiagnostics] = useState<DiagnosticsMetadata>(() =>
    loadDiagnostics(),
  );
  const [lockSettings, setLockSettings] = useState<LockSettings>(() =>
    loadLockSettings(),
  );
  const [locked, setLocked] = useState(
    () => loadLockSettings().enabled && loadLockSettings().requireOnStart,
  );
  const [privacyScreen, setPrivacyScreen] = useState(false);
  const [safeRecoveryMode, setSafeRecoveryMode] = useState(() =>
    shouldStartSafeRecovery(),
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [page, setPage] = useState<AppPage>(() =>
    pageFromPath(window.location.pathname),
  );
  const [editingReport, setEditingReport] = useState<Report | undefined>();
  const [initialDraft, setInitialDraft] = useState<ReportDraft | undefined>();
  const [nextReference, setNextReference] = useState(() =>
    generateReportReference(loadReports()),
  );
  const [previewReport, setPreviewReport] = useState<Report | undefined>();
  const [submissionReportId, setSubmissionReportId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [reportToDelete, setReportToDelete] = useState<Report | undefined>();
  const [editorDirty, setEditorDirty] = useState(false);
  const [leaveAction, setLeaveAction] = useState<(() => void) | undefined>();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const leaveHandlers = useRef<EditorLeaveHandlers | undefined>(undefined);
  const autosaveActivityAt = useRef<Record<string, number>>({});

  const notify = useCallback(
    (type: ToastType, message: string) =>
      setToasts((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          message,
        },
      ]),
    [],
  );
  const persistReports = useCallback((next: Report[]) => {
    saveReports(next);
    setReports(next);
  }, []);
  const persistActivities = useCallback((next: ActivityEntry[]) => {
    saveActivities(next);
    setActivities(next);
  }, []);
  const persistSnapshots = useCallback((next: ReportSnapshot[]) => {
    saveSnapshots(next);
    setSnapshots(next);
  }, []);
  const persistRetests = useCallback((next: RetestRecord[]) => {
    saveRetests(next);
    setRetests(next);
  }, []);
  const persistFamilies = useCallback((next: FindingFamily[]) => {
    saveFindingFamilies(next);
    setFindingFamilies(next);
  }, []);
  const persistRootCauses = useCallback((next: RootCauseEntry[]) => {
    saveRootCauses(next);
    setRootCauses(next);
  }, []);
  const persistCommunications = useCallback((next: CommunicationEntry[]) => {
    saveCommunications(next);
    setCommunications(next);
  }, []);
  const persistInformationRequests = useCallback(
    (next: InformationRequest[]) => {
      saveInformationRequests(next);
      setInformationRequests(next);
    },
    [],
  );
  const persistSanitizationProfiles = useCallback(
    (next: SanitizationProfile[]) => {
      saveSanitizationProfiles(next);
      setSanitizationProfiles(next);
    },
    [],
  );
  const persistDiagnostics = useCallback((next: DiagnosticsMetadata) => {
    saveDiagnostics(next);
    setDiagnostics(next);
  }, []);
  const addActivity = useCallback(
    (reportId: string, action: ActivityAction, description: string) => {
      const entry = createActivity(reportId, action, description);
      persistActivities([entry, ...activities].slice(0, 3000));
    },
    [activities, persistActivities],
  );
  const addReportSnapshot = useCallback(
    (report: Report, reason: SnapshotReason, label?: string) => {
      persistSnapshots(
        addSnapshot(snapshots, createSnapshot(report, reason, label)),
      );
    },
    [persistSnapshots, snapshots],
  );

  useEffect(() => {
    const activatePrivacy = () => {
      setPrivacyScreen(true);
      setLocked((current) => current);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "l"
      ) {
        event.preventDefault();
        activatePrivacy();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const path = pathForPage(page);
    if (path && window.location.pathname !== path)
      window.history.pushState(null, "", path);
  }, [page]);
  useEffect(() => {
    const update = () =>
      notify(
        "warning",
        "An application update is available. Refresh when you are ready to use it.",
      );
    window.addEventListener("bbr-pwa-update", update);
    return () => window.removeEventListener("bbr-pwa-update", update);
  }, [notify]);
  useEffect(() => {
    if (!lockSettings.enabled || locked) return undefined;
    let timer: number | undefined;
    let hiddenTimer: number | undefined;
    const lockLater = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setLocked(true),
        Math.max(1, lockSettings.lockAfterMinutes) * 60_000,
      );
    };
    const activity = () => lockLater();
    const visibility = () => {
      if (document.hidden)
        hiddenTimer = window.setTimeout(
          () => setLocked(true),
          Math.max(1, lockSettings.lockOnHiddenMinutes) * 60_000,
        );
      else if (hiddenTimer) window.clearTimeout(hiddenTimer);
    };
    ["mousemove", "keydown", "pointerdown", "touchstart"].forEach((event) =>
      window.addEventListener(event, activity),
    );
    document.addEventListener("visibilitychange", visibility);
    lockLater();
    return () => {
      if (timer) window.clearTimeout(timer);
      if (hiddenTimer) window.clearTimeout(hiddenTimer);
      ["mousemove", "keydown", "pointerdown", "touchstart"].forEach((event) =>
        window.removeEventListener(event, activity),
      );
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [lockSettings, locked]);

  const upsertReport = useCallback(
    (report: Report) => {
      const normalized = {
        ...report,
        submissionChecklist: synchronizeChecklist(report),
      };
      const exists = reports.some((item) => item.id === normalized.id);
      const next = exists
        ? reports.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...reports];
      persistReports(next);
      setNextReference(generateReportReference(next));
    },
    [persistReports, reports],
  );
  const visibleReports = useMemo(
    () => filterReports(reports, searchQuery, severityFilter, statusFilter),
    [reports, searchQuery, severityFilter, statusFilter],
  );
  const currentSubmission = reports.find(
    (report) => report.id === submissionReportId,
  );
  const createDefaultDraft = useCallback(
    (template?: ReportTemplate): ReportDraft => {
      const sectionPrompts =
        template?.sectionPrompts ??
        (template
          ? {
              summary: template.summaryPrompt,
              description: template.descriptionPrompt,
              impact: template.impactPrompt,
              remediation: template.remediationPrompt,
            }
          : undefined);
      return {
        ...structuredClone(EMPTY_REPORT_DRAFT),
        researcherName: settings.profile.researcherName,
        platform: settings.profile.defaultPlatform,
        status: settings.profile.defaultReportStatus,
        cvssMode: settings.profile.defaultCvssMode,
        templateId: template?.id,
        vulnerabilityType: template?.vulnerabilityType ?? "",
        vulnerabilityClass: template?.vulnerabilityClass ?? "",
        templateGuidance: template
          ? {
              sectionPrompts: sectionPrompts ?? {},
              evidenceChecklist: structuredClone(
                template.evidenceChecklist ?? [],
              ),
              questionsToAnswer: structuredClone(
                template.questionsToAnswer ?? [],
              ),
              commonMistakes: structuredClone(template.commonMistakes ?? []),
            }
          : undefined,
        structuredSteps: [],
      };
    },
    [settings],
  );
  const clearEditor = () => {
    setEditingReport(undefined);
    setInitialDraft(undefined);
    setEditorDirty(false);
  };
  const proceed = (action: () => void) => {
    clearEditor();
    action();
  };
  const requestLeave = (action: () => void) => {
    if (page === "editor" && editorDirty) {
      setLeaveAction(() => action);
      return;
    }
    proceed(action);
  };
  const openNewReport = () =>
    requestLeave(() => {
      setInitialDraft(createDefaultDraft());
      setEditingReport(undefined);
      setNextReference(generateReportReference(reports));
      setPage("editor");
    });
  const openTemplateBlank = (template: ReportTemplate) =>
    requestLeave(() => {
      setInitialDraft(createDefaultDraft(template));
      setEditingReport(undefined);
      setNextReference(generateReportReference(reports));
      setPage("editor");
    });
  const openTemplateExample = (template: ReportTemplate) =>
    requestLeave(() => {
      if (!template.example) {
        notify(
          "warning",
          "This template does not include a fictional example.",
        );
        return;
      }
      const example = template.example;
      setInitialDraft({
        ...createDefaultDraft(template),
        title: `[EXAMPLE] ${example.title}`,
        programName: "Fictional Training Program",
        platform: "Other",
        target: example.target ?? "https://app.example.test",
        vulnerableEndpoint: example.vulnerableEndpoint ?? "",
        affectedAsset: example.affectedAsset ?? "",
        vulnerabilityType:
          example.vulnerabilityType || template.vulnerabilityType,
        vulnerabilityClass:
          example.vulnerabilityClass ?? template.vulnerabilityClass,
        severity: example.severity ?? "Informational",
        cvssScore: example.cvssScore?.toFixed(1) ?? "0.0",
        cvssVector: example.cvssVector ?? EMPTY_REPORT_DRAFT.cvssVector,
        summary: example.summary,
        description: example.description,
        prerequisites: example.prerequisites ?? "",
        structuredSteps: structuredClone(example.structuredSteps),
        impact: example.impact,
        remediation: example.remediation,
        references: structuredClone(example.references ?? []),
        disclosureTimeline: structuredClone(example.disclosureTimeline ?? []),
        status: "Draft",
        isExampleReport: true,
        submissionDetails: {
          platform: "Other",
          programName: "Fictional Training Program",
          outcome: "Not Submitted",
        },
      });
      setEditingReport(undefined);
      setNextReference(generateReportReference(reports));
      setPage("editor");
    });
  const openKnowledge = (entry: KnowledgeEntry) =>
    requestLeave(() => {
      setInitialDraft({
        ...createDefaultDraft(),
        vulnerabilityType: entry.name,
        vulnerabilityClass: entry.category,
        templateGuidance: {
          sectionPrompts: {
            summary: entry.definition,
            description:
              "Document the relevant trust boundary, expected behavior, and observed behavior using your own authorized evidence.",
            impact: entry.impactGuidance,
            remediation: entry.remediationGuidance,
          },
          evidenceChecklist: entry.evidenceChecklist,
          questionsToAnswer: entry.reportQuestions,
          commonMistakes: [
            "Treating guidance as proof of a confirmed issue",
            "Claiming impact without evidence",
            "Including private tokens or account data in report evidence",
            "Omitting scope and environment details",
          ],
        },
      });
      setEditingReport(undefined);
      setNextReference(generateReportReference(reports));
      setPage("editor");
    });
  const openKnowledgeLibrary = () => requestLeave(() => setPage("knowledge"));
  const openReport = (report: Report) => {
    setInitialDraft(undefined);
    setEditingReport(report);
    setPage("editor");
  };
  const openPreview = (report: Report) => {
    setPreviewReport(report);
    setPage("preview");
  };
  const openSubmission = (report: Report) => {
    if (report.isExampleReport) {
      notify(
        "warning",
        "Convert this fictional example into a working report before preparing a submission.",
      );
      return;
    }
    setSubmissionReportId(report.id);
    setPage("submission");
  };

  const updateLifecycle = useCallback(
    (
      candidate: Report,
      nextStatus: FindingLifecycleStatus,
      reason: string,
      actorLabel = "",
      source: "Researcher" | "Program Response" | "Retest" = "Researcher",
    ): Report | undefined => {
      if (candidate.isExampleReport) {
        notify(
          "warning",
          "Convert this fictional example into a working report before changing its lifecycle.",
        );
        return undefined;
      }
      const previous =
        reports.find((item) => item.id === candidate.id) ?? candidate;
      const previousStatus =
        previous.lifecycleStatus ??
        lifecycleFromLegacy(
          previous.status,
          previous.submissionDetails.outcome,
        );
      if (previousStatus === nextStatus) return previous;
      if (reasonRequired(previousStatus, nextStatus) && !reason.trim()) {
        notify("warning", "This lifecycle transition requires a reason.");
        return undefined;
      }
      if (isImportantLifecycleTransition(previousStatus, nextStatus)) {
        const snapshotReason: SnapshotReason =
          nextStatus === "Submitted"
            ? "Before Submission"
            : nextStatus === "Retesting"
              ? "Before Retesting"
              : nextStatus === "Remediated"
                ? "Before Remediated"
                : nextStatus === "Closed"
                  ? "Before Closed"
                  : "Before Reopen";
        addReportSnapshot(previous, snapshotReason);
      }
      const event = createLifecycleEvent(
        candidate.id,
        previousStatus,
        nextStatus,
        reason,
        source,
        actorLabel,
      );
      const now = new Date().toISOString();
      const updated: Report = {
        ...candidate,
        status: statusForLifecycle(nextStatus, candidate.status),
        lifecycleStatus: nextStatus,
        lifecycleEvents: [...(previous.lifecycleEvents ?? []), event],
        remediationStartedAt:
          nextStatus === "Remediation in Progress"
            ? now
            : candidate.remediationStartedAt,
        readyForRetestAt:
          nextStatus === "Ready for Retest" ? now : candidate.readyForRetestAt,
        closedAt: nextStatus === "Closed" ? now : undefined,
        riskAcceptanceNote:
          nextStatus === "Risk Accepted"
            ? reason.trim()
            : candidate.riskAcceptanceNote,
        regressionDetectedAt:
          source === "Retest" &&
          nextStatus === "Retesting" &&
          previousStatus === "Remediated"
            ? now
            : candidate.regressionDetectedAt,
        updatedAt: now,
      };
      upsertReport(updated);
      setEditingReport((current) =>
        current?.id === updated.id ? updated : current,
      );
      addActivity(
        updated.id,
        "Lifecycle Changed",
        `Lifecycle changed from ${previousStatus} to ${nextStatus}.${reason.trim() ? " Reason recorded." : ""}`,
      );
      if (nextStatus === "Remediated")
        addActivity(
          updated.id,
          "Remediation Verified",
          "Retest outcome was manually recorded as no longer reproducible.",
        );
      if (updated.regressionDetectedAt)
        addActivity(
          updated.id,
          "Regression Recorded",
          "A regression was recorded without overwriting prior remediation history.",
        );
      return updated;
    },
    [addActivity, addReportSnapshot, notify, reports, upsertReport],
  );
  const saveRetestRecord = useCallback(
    (retest: RetestRecord) => {
      const exists = retests.some((item) => item.id === retest.id);
      persistRetests(
        exists
          ? retests.map((item) => (item.id === retest.id ? retest : item))
          : [retest, ...retests],
      );
      if (!exists)
        addActivity(
          retest.reportId,
          "Retest Started",
          "Started a manual retest record.",
        );
    },
    [addActivity, persistRetests, retests],
  );
  const completeRetest = (
    retest: RetestRecord,
    proposed?: FindingLifecycleStatus,
  ) => {
    persistRetests(
      retests.map((item) => (item.id === retest.id ? retest : item)),
    );
    addActivity(
      retest.reportId,
      "Retest Completed",
      `Completed retest with outcome: ${retest.verificationOutcome}.`,
    );
    const report = reports.find((item) => item.id === retest.reportId);
    if (report && proposed)
      updateLifecycle(
        report,
        proposed,
        `Retest ${retest.id} completed with outcome: ${retest.verificationOutcome}.`,
        retest.testerName,
        "Retest",
      );
    notify(
      "success",
      proposed
        ? "Retest completed and lifecycle change recorded."
        : "Retest completed. Review lifecycle status manually if needed.",
    );
  };
  const saveComparisonNote = (report: Report, summary: string) => {
    const item = {
      id: generateReportId(),
      reportId: report.id,
      type: "text" as const,
      title: "Remediation comparison summary",
      description: summary,
      createdAt: new Date().toISOString(),
    };
    upsertReport({
      ...report,
      evidenceItems: [...report.evidenceItems, item],
      updatedAt: new Date().toISOString(),
    });
    addActivity(
      report.id,
      "Evidence Added",
      "Saved remediation comparison as an evidence note.",
    );
    notify("success", "Comparison summary saved as a text evidence note.");
  };

  const handleSave = (report: Report, navigateAfterSave: boolean) => {
    const safeReport: Report = report.isExampleReport
      ? {
          ...report,
          status: "Draft",
          submissionDetails: {
            ...report.submissionDetails,
            platform: "Other",
            programName: "Fictional Training Program",
            outcome: "Not Submitted",
            submissionId: undefined,
            submissionUrl: undefined,
            submittedAt: undefined,
            analystName: undefined,
            bountyAmount: undefined,
            bountyCurrency: undefined,
          },
        }
      : report;
    const previous = reports.find((item) => item.id === safeReport.id);
    const exists = Boolean(previous);
    const previousEvidence = new Set(
      previous?.evidenceItems.map((item) => item.id) ?? [],
    );
    const nextEvidence = new Set(
      safeReport.evidenceItems.map((item) => item.id),
    );
    const addedEvidence = [...nextEvidence].filter(
      (id) => !previousEvidence.has(id),
    ).length;
    const removedEvidence = [...previousEvidence].filter(
      (id) => !nextEvidence.has(id),
    ).length;
    if (previous && previous.status !== safeReport.status)
      addReportSnapshot(previous, "Status Change");
    upsertReport(safeReport);
    const action: ActivityAction = !exists
      ? "Created"
      : addedEvidence
        ? "Evidence Added"
        : removedEvidence
          ? "Evidence Removed"
          : safeReport.status === "Ready to Submit" &&
              previous?.status !== "Ready to Submit"
            ? "Marked Ready"
            : "Edited";
    const description = !exists
      ? "Created report."
      : addedEvidence
        ? `Saved report changes and added ${addedEvidence} evidence item(s).`
        : removedEvidence
          ? `Saved report changes and removed ${removedEvidence} evidence item(s).`
          : action === "Marked Ready"
            ? "Marked report ready to submit."
            : "Saved report changes.";
    addActivity(safeReport.id, action, description);
    if (navigateAfterSave) {
      clearEditor();
      setPage("reports");
      notify("success", "Report saved.");
    }
  };
  const handleAutosave = (report: Report) => {
    upsertReport(report);
    const last = autosaveActivityAt.current[report.id] ?? 0;
    if (Date.now() - last > 10 * 60 * 1000) {
      autosaveActivityAt.current[report.id] = Date.now();
      addActivity(report.id, "Autosaved", "Autosaved report changes.");
    }
  };
  const handleQualityCheck = async (report: Report) => {
    let missingImageIds: string[] = [];
    try {
      missingImageIds = (
        await Promise.all(
          report.evidenceItems
            .filter((item) => item.type === "image")
            .map(async (item) =>
              (await getEvidenceFile(item.id)) ? undefined : item.id,
            ),
        )
      ).filter((id): id is string => Boolean(id));
    } catch {
      notify(
        "warning",
        "Evidence storage could not be checked; text quality checks still ran.",
      );
    }
    const result = runReportQualityCheck(report, missingImageIds);
    const next = {
      ...report,
      qualityResult: result,
      lastReviewedAt: result.checkedAt,
    };
    if (reports.some((item) => item.id === report.id)) {
      upsertReport(next);
      addActivity(
        report.id,
        "Quality Checked",
        `Ran quality check: ${result.score}/100 (${result.grade}).`,
      );
    }
    notify("success", `Quality check complete: ${result.score}/100.`);
    return result;
  };
  const handleDuplicate = (report: Report) => {
    const duplicate = createDuplicate(report, reports);
    persistReports([duplicate, ...reports]);
    setNextReference(generateReportReference([duplicate, ...reports]));
    addActivity(
      duplicate.id,
      "Duplicated",
      `Duplicated from ${report.reportReference}.`,
    );
    notify(
      "success",
      "Report duplicated as a new draft. Uploaded image attachments were not copied.",
    );
  };
  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      await deleteEvidenceFilesForReport(reportToDelete.id);
      persistReports(reports.filter((item) => item.id !== reportToDelete.id));
      persistActivities(
        activities.filter((item) => item.reportId !== reportToDelete.id),
      );
      persistSnapshots(
        snapshots.filter((item) => item.reportId !== reportToDelete.id),
      );
      setReportToDelete(undefined);
      notify("success", "Report and associated evidence were deleted.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error
          ? `Report was not deleted: ${error.message}`
          : "Report evidence could not be deleted.",
      );
    }
  };
  const handleArchive = (report: Report) => {
    const archived = Boolean(report.archivedAt);
    const next = {
      ...report,
      archivedAt: archived ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertReport(next);
    addActivity(
      report.id,
      "Status Changed",
      archived ? "Restored report from archive." : "Archived report.",
    );
    notify("success", archived ? "Report restored." : "Report archived.");
  };
  const handleExport = (report: Report) => {
    downloadMarkdown(
      createReportMarkdown(report, settings.exportPreferences),
      safeMarkdownFilename(report.title),
    );
    addActivity(report.id, "Exported", "Exported report as Markdown.");
    notify("success", "Markdown download started.");
  };
  const handleWorkflowUpdate = (
    report: Report,
    action: "Edited" | "Submitted" | "Status Changed" | "Exported",
    description: string,
    snapshot?: "Before Submission" | "Status Change",
  ) => {
    if (report.isExampleReport && action !== "Edited") {
      notify(
        "warning",
        "Example reports cannot enter the submission workflow. Convert the example first.",
      );
      return;
    }
    if (snapshot) {
      const current = reports.find((item) => item.id === report.id);
      if (current) addReportSnapshot(current, snapshot);
    }
    upsertReport(report);
    addActivity(report.id, action, description);
  };
  const updateOutcome = (
    report: Report,
    outcome: SubmissionOutcome,
    note: string,
    bounty: string,
    currency: string,
  ) => {
    if (report.isExampleReport) {
      notify(
        "warning",
        "Convert this fictional example before recording a submission outcome.",
      );
      return;
    }
    const statusMap: Record<SubmissionOutcome, ReportStatus> = {
      "Not Submitted": "Draft",
      Submitted: "Submitted",
      "Needs More Information": "Submitted",
      Triaged: "Triaged",
      Accepted: "Accepted",
      Duplicate: "Duplicate",
      Informative: "Informative",
      "Not Applicable": "Informative",
      Resolved: "Resolved",
      Rejected: "Rejected",
    };
    const amount = bounty ? Number(bounty) : undefined;
    handleWorkflowUpdate(
      {
        ...report,
        status: statusMap[outcome],
        submissionDetails: {
          ...report.submissionDetails,
          outcome,
          notes: note || undefined,
          bountyAmount: amount && amount > 0 ? amount : undefined,
          bountyCurrency: currency || undefined,
          lastResponseAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      },
      "Status Changed",
      `Submission outcome updated to ${outcome}.`,
      "Status Change",
    );
    notify("success", "Submission outcome updated.");
  };
  const createManualSnapshot = (report: Report, label?: string) => {
    addReportSnapshot(report, "Manual Save", label);
    notify("success", "Version snapshot created.");
  };
  const restoreSnapshot = (snapshot: ReportSnapshot) => {
    const current = reports.find((item) => item.id === snapshot.reportId);
    if (!current) return;
    addReportSnapshot(current, "Restored");
    const restored = {
      ...snapshot.data,
      id: current.id,
      reportReference: current.reportReference,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    upsertReport(restored);
    addActivity(
      current.id,
      "Restored",
      `Restored snapshot from ${new Date(snapshot.createdAt).toLocaleString()}.`,
    );
    notify("success", "Snapshot restored.");
  };
  const labelSnapshot = (snapshot: ReportSnapshot, label: string) =>
    persistSnapshots(
      snapshots.map((item) =>
        item.id === snapshot.id ? { ...item, label: label || undefined } : item,
      ),
    );
  const saveSettingsChange = (next: AppSettings) => {
    try {
      saveSettings(next);
      setSettings(next);
      notify("success", "Settings saved.");
    } catch {
      notify("error", "Settings could not be saved in local storage.");
    }
  };
  const saveAiSettingsChange = (next: AiSettings) => {
    if (next.enabled && !next.selectedModel) {
      notify("warning", "Select an installed Ollama model first.");
      return;
    }
    try {
      saveAiSettings(next);
      setAiSettings(next);
      notify("success", "Local AI settings saved.");
    } catch {
      notify("error", "Local AI settings could not be saved.");
    }
  };
  const saveTemplate = (template: ReportTemplate) => {
    const next = customTemplates.some((item) => item.id === template.id)
      ? customTemplates.map((item) =>
          item.id === template.id ? template : item,
        )
      : [template, ...customTemplates];
    try {
      saveCustomTemplates(next);
      setCustomTemplates(next);
      notify("success", "Custom template saved.");
    } catch {
      notify("error", "Custom template could not be saved.");
    }
  };
  const deleteTemplate = (template: ReportTemplate) => {
    const next = customTemplates.filter((item) => item.id !== template.id);
    try {
      saveCustomTemplates(next);
      setCustomTemplates(next);
      notify("success", "Custom template deleted.");
    } catch {
      notify("error", "Custom template could not be deleted.");
    }
  };
  const updateTemplatePreference = (
    templateId: string,
    change: Partial<TemplatePreference>,
  ) => {
    const current = templatePreferences.find(
      (item) => item.templateId === templateId,
    );
    const nextEntry: TemplatePreference = {
      templateId,
      favorite: false,
      usageCount: 0,
      ...(current ?? {}),
      ...change,
    };
    const next = current
      ? templatePreferences.map((item) =>
          item.templateId === templateId ? nextEntry : item,
        )
      : [...templatePreferences, nextEntry];
    try {
      saveTemplatePreferences(next);
      setTemplatePreferences(next);
    } catch {
      notify("error", "Template preferences could not be saved locally.");
    }
  };
  const saveKnowledge = (entry: KnowledgeEntry) => {
    const next = customKnowledge.some((item) => item.id === entry.id)
      ? customKnowledge.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...customKnowledge];
    saveCustomKnowledge(next);
    setCustomKnowledge(next);
    notify("success", "Custom knowledge entry saved.");
  };
  const deleteKnowledge = (entry: KnowledgeEntry) => {
    const next = customKnowledge.filter((item) => item.id !== entry.id);
    saveCustomKnowledge(next);
    setCustomKnowledge(next);
    notify("success", "Custom knowledge entry deleted.");
  };
  const importBackup = async (
    backup: ParsedBackup,
    strategy: ImportStrategy,
  ): Promise<ImportResult> => {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      replaced: 0,
      duplicated: 0,
      evidenceRestored: 0,
      evidenceMissing: backup.payload.manifest.evidence?.length
        ? backup.payload.manifest.evidence.length - backup.evidence.length
        : 0,
      warnings: [...backup.warnings],
      errors: [],
    };
    const incoming = normalizeReports(backup.payload.data.reports);
    const nextReports = [...reports];
    const evidenceRemap = new Map<
      string,
      { evidenceId: string; reportId: string }
    >();
    const replacementSnapshots: ReportSnapshot[] = [];
    for (const source of incoming) {
      const conflictIndex = nextReports.findIndex(
        (current) =>
          current.id === source.id ||
          current.reportReference === source.reportReference,
      );
      if (conflictIndex === -1) {
        nextReports.unshift(source);
        result.imported += 1;
        continue;
      }
      const current = nextReports[conflictIndex];
      if (strategy === "skip") {
        result.skipped += 1;
        continue;
      }
      if (strategy === "replace") {
        replacementSnapshots.push(createSnapshot(current, "Imported"));
        nextReports[conflictIndex] = source;
        result.replaced += 1;
        continue;
      }
      if (strategy === "merge") {
        const incomingIsNewer =
          new Date(source.updatedAt).getTime() >
          new Date(current.updatedAt).getTime();
        const main = incomingIsNewer ? source : current;
        const secondary = incomingIsNewer ? current : source;
        nextReports[conflictIndex] = {
          ...main,
          evidenceItems: [
            ...main.evidenceItems,
            ...secondary.evidenceItems.filter(
              (item) =>
                !main.evidenceItems.some((existing) => existing.id === item.id),
            ),
          ],
          references: [
            ...main.references,
            ...secondary.references.filter(
              (item) =>
                !main.references.some((existing) => existing.url === item.url),
            ),
          ],
          disclosureTimeline: [
            ...main.disclosureTimeline,
            ...secondary.disclosureTimeline.filter(
              (item) =>
                !main.disclosureTimeline.some(
                  (existing) => existing.id === item.id,
                ),
            ),
          ],
        };
        result.imported += 1;
        continue;
      }
      const duplicateId = generateReportId();
      const ids = new Map(
        source.evidenceItems.map((item) => [item.id, generateReportId()]),
      );
      const duplicate: Report = {
        ...source,
        id: duplicateId,
        reportReference: generateReportReference(nextReports),
        title: `Imported copy of ${source.title}`,
        status: "Draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: undefined,
        submissionDetails: {
          platform: "Other",
          outcome: "Not Submitted",
          notes: `Imported from ${source.reportReference}.`,
        },
        evidenceItems: source.evidenceItems.map((item) => {
          const evidenceId = ids.get(item.id) ?? generateReportId();
          evidenceRemap.set(item.id, { evidenceId, reportId: duplicateId });
          return { ...item, id: evidenceId, reportId: duplicateId };
        }),
        structuredSteps: source.structuredSteps.map((step) => ({
          ...step,
          id: generateReportId(),
          evidenceIds: step.evidenceIds.flatMap((id) =>
            ids.has(id) ? [ids.get(id) as string] : [],
          ),
        })),
      };
      nextReports.unshift(duplicate);
      result.duplicated += 1;
    }
    persistReports(nextReports);
    setNextReference(generateReportReference(nextReports));
    const importedActivities = backup.payload.data.activity.filter(
      (entry) => !activities.some((current) => current.id === entry.id),
    );
    persistActivities(
      [
        createActivity(
          "workspace-import",
          "Imported",
          `Imported backup: ${result.imported + result.replaced + result.duplicated} report action(s).`,
        ),
        ...importedActivities,
        ...activities,
      ].slice(0, 3000),
    );
    const importedSnapshots = backup.payload.data.history.filter(
      (snapshot) => !snapshots.some((current) => current.id === snapshot.id),
    );
    persistSnapshots([
      ...importedSnapshots,
      ...replacementSnapshots,
      ...snapshots,
    ]);
    const mergedTemplates = [
      ...customTemplates,
      ...backup.payload.data.templates.filter(
        (template) =>
          !customTemplates.some((current) => current.id === template.id),
      ),
    ];
    saveCustomTemplates(mergedTemplates);
    setCustomTemplates(mergedTemplates);
    const mergedKnowledge = [
      ...customKnowledge,
      ...backup.payload.data.knowledge.filter(
        (entry) => !customKnowledge.some((current) => current.id === entry.id),
      ),
    ];
    saveCustomKnowledge(mergedKnowledge);
    setCustomKnowledge(mergedKnowledge);
    if (
      backup.payload.data.settings?.profile &&
      backup.payload.data.settings?.exportPreferences
    ) {
      saveSettings(backup.payload.data.settings);
      setSettings(backup.payload.data.settings);
    }
    const mergeById = <T extends { id: string }>(
      current: T[],
      incomingValues: T[] | undefined,
    ) => [
      ...current,
      ...(incomingValues ?? []).filter(
        (item) => !current.some((existing) => existing.id === item.id),
      ),
    ];
    const importedPrograms = mergeById(programs, backup.payload.data.programs);
    savePrograms(importedPrograms);
    setPrograms(importedPrograms);
    const importedAssets = mergeById(assets, backup.payload.data.assets);
    saveAssets(importedAssets);
    setAssets(importedAssets);
    persistRetests(mergeById(retests, backup.payload.data.retests));
    persistFamilies(
      mergeById(findingFamilies, backup.payload.data.findingFamilies),
    );
    persistRootCauses(mergeById(rootCauses, backup.payload.data.rootCauses));
    persistCommunications(
      mergeById(communications, backup.payload.data.communications),
    );
    persistInformationRequests(
      mergeById(informationRequests, backup.payload.data.informationRequests),
    );
    persistSanitizationProfiles(
      mergeById(sanitizationProfiles, backup.payload.data.sanitizationProfiles),
    );
    persistDiagnostics({
      ...diagnostics,
      ...(backup.payload.data.diagnostics ?? {}),
      lastRestoreAt: new Date().toISOString(),
    });
    for (const file of backup.evidence) {
      const remapped = evidenceRemap.get(file.evidenceId);
      const restored = remapped
        ? {
            ...file,
            evidenceId: remapped.evidenceId,
            reportId: remapped.reportId,
          }
        : file;
      try {
        await saveEvidenceBlob(restored);
        result.evidenceRestored += 1;
      } catch {
        result.errors.push(`Could not restore evidence file ${file.fileName}.`);
      }
    }
    return result;
  };
  const cleanupEvidence = async (scan: EvidenceScanResult) => {
    await Promise.all(
      scan.orphanedFiles.map((file) => deleteEvidenceFile(file.evidenceId)),
    );
    const missing = new Set(scan.missingMetadataFileIds);
    const next = reports.map((report) => {
      const evidenceItems = report.evidenceItems.filter(
        (item) => !missing.has(item.id),
      );
      const valid = new Set(evidenceItems.map((item) => item.id));
      return {
        ...report,
        evidenceItems,
        structuredSteps: report.structuredSteps.map((step) => ({
          ...step,
          evidenceIds: step.evidenceIds.filter((id) => valid.has(id)),
        })),
        updatedAt: new Date().toISOString(),
      };
    });
    persistReports(next);
    notify("success", "Evidence maintenance changes were applied.");
  };
  const clearActivity = () => persistActivities([]);
  const resetTemplates = () => {
    saveCustomTemplates([]);
    setCustomTemplates([]);
    notify("success", "Custom templates reset.");
  };
  const resetKnowledge = () => {
    saveCustomKnowledge([]);
    setCustomKnowledge([]);
    notify("success", "Custom knowledge entries reset.");
  };
  const deleteAllData = async () => {
    await deleteAllEvidenceFiles();
    [
      "bug-bounty-reports",
      "bug-bounty-report-templates",
      "bug-bounty-report-settings",
      "bug-bounty-report-knowledge",
      "bug-bounty-report-activity",
      "bug-bounty-report-history",
      "bug-bounty-report-programs",
      "bug-bounty-report-assets",
      "bug-bounty-report-retests",
      "bug-bounty-report-finding-families",
      "bug-bounty-report-root-causes",
      "bug-bounty-report-communications",
      "bug-bounty-report-information-requests",
      "bug-bounty-report-sanitization-profiles",
      "bug-bounty-report-lock-settings",
      "bug-bounty-report-layout-settings",
      "bug-bounty-report-diagnostics",
    ].forEach((key) => localStorage.removeItem(key));
    setReports([]);
    setPrograms([]);
    setAssets([]);
    setCustomTemplates([]);
    setCustomKnowledge([]);
    setActivities([]);
    setSnapshots([]);
    setRetests([]);
    setFindingFamilies([]);
    setRootCauses([]);
    setCommunications([]);
    setInformationRequests([]);
    setSanitizationProfiles([]);
    setDiagnostics({});
    setSettings(structuredClone(DEFAULT_SETTINGS));
    clearEditor();
    setPage("dashboard");
  };
  const handleBulkAction = async (selected: Report[], action: BulkAction) => {
    if (!selected.length) return;
    if (action === "delete") {
      await Promise.all(
        selected.map((report) => deleteEvidenceFilesForReport(report.id)),
      );
      const deleted = new Set(selected.map((report) => report.id));
      persistReports(reports.filter((report) => !deleted.has(report.id)));
      persistActivities(
        activities.filter((entry) => !deleted.has(entry.reportId)),
      );
      persistSnapshots(
        snapshots.filter((snapshot) => !deleted.has(snapshot.reportId)),
      );
      notify("success", `Deleted ${selected.length} report(s).`);
      return;
    }
    if (action === "exportMetadata") {
      const file = new Blob(
        [
          JSON.stringify(
            {
              application: "Bug Bounty Report",
              exportedAt: new Date().toISOString(),
              reports: selected,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bug-bounty-report-selection-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify("success", "Selected report metadata download started.");
      return;
    }
    const updatedAt = new Date().toISOString();
    const next = reports.map((report) => {
      if (!selected.some((item) => item.id === report.id)) return report;
      if (action === "quality") {
        const qualityResult = runReportQualityCheck(report);
        return {
          ...report,
          qualityResult,
          lastReviewedAt: qualityResult.checkedAt,
          updatedAt,
        };
      }
      if (action === "draft")
        return { ...report, status: "Draft" as const, updatedAt };
      if (action === "ready")
        return { ...report, status: "Ready to Submit" as const, updatedAt };
      if (action === "archive")
        return { ...report, archivedAt: updatedAt, updatedAt };
      return { ...report, archivedAt: undefined, updatedAt };
    });
    persistReports(next);
    const actionName: ActivityAction =
      action === "quality"
        ? "Quality Checked"
        : action === "ready"
          ? "Marked Ready"
          : "Status Changed";
    const label =
      action === "quality"
        ? "Ran quality check through bulk actions."
        : action === "archive"
          ? "Archived report through bulk actions."
          : action === "restore"
            ? "Restored report from archive through bulk actions."
            : action === "ready"
              ? "Marked report ready to submit through bulk actions."
              : "Marked report as draft through bulk actions.";
    persistActivities(
      [
        ...selected.map((report) =>
          createActivity(report.id, actionName, label),
        ),
        ...activities,
      ].slice(0, 3000),
    );
    if (action === "draft" || action === "ready")
      persistSnapshots(
        selected.reduce(
          (current, report) =>
            addSnapshot(current, createSnapshot(report, "Status Change")),
          snapshots,
        ),
      );
    notify("success", `${selected.length} report(s) updated.`);
  };
  const confirmSaveAndLeave = async () => {
    if (!leaveAction || !leaveHandlers.current) return;
    if (await leaveHandlers.current.save()) {
      const action = leaveAction;
      setLeaveAction(undefined);
      proceed(action);
    }
  };
  const confirmDiscardAndLeave = async () => {
    if (!leaveAction) return;
    await leaveHandlers.current?.discard();
    const action = leaveAction;
    setLeaveAction(undefined);
    proceed(action);
  };

  const saveProgram = (program: ProgramProfile) => {
    const next = programs.some((item) => item.id === program.id)
      ? programs.map((item) => (item.id === program.id ? program : item))
      : [program, ...programs];
    savePrograms(next);
    setPrograms(next);
    notify("success", "Program profile saved.");
  };
  const deleteProgram = (program: ProgramProfile) => {
    savePrograms(programs.filter((item) => item.id !== program.id));
    setPrograms(programs.filter((item) => item.id !== program.id));
    notify(
      "success",
      "Program profile deleted; linked reports were preserved.",
    );
  };
  const saveFamily = (family: FindingFamily) => {
    const next = findingFamilies.some((item) => item.id === family.id)
      ? findingFamilies.map((item) => (item.id === family.id ? family : item))
      : [family, ...findingFamilies];
    persistFamilies(next);
  };
  const deleteFamily = (family: FindingFamily) => {
    if (family.reportIds.length) {
      notify("warning", "Remove linked reports before deleting this family.");
      return;
    }
    persistFamilies(findingFamilies.filter((item) => item.id !== family.id));
  };
  const saveRootCause = (entry: RootCauseEntry) => {
    const next = rootCauses.some((item) => item.id === entry.id)
      ? rootCauses.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...rootCauses];
    persistRootCauses(next);
  };
  const deleteRootCause = (entry: RootCauseEntry) => {
    if (!entry.custom || entry.reportIds.length) {
      notify("warning", "Only unused custom root causes can be deleted.");
      return;
    }
    persistRootCauses(rootCauses.filter((item) => item.id !== entry.id));
  };
  const linkRelationships = (
    report: Report,
    familyId?: string,
    rootCauseId?: string,
  ) => {
    const next = {
      ...report,
      findingFamilyId: familyId,
      rootCauseId: rootCauseId ?? report.rootCauseId,
      updatedAt: new Date().toISOString(),
    };
    upsertReport(next);
    if (familyId !== undefined) {
      persistFamilies(
        findingFamilies.map((family) => ({
          ...family,
          reportIds:
            family.id === familyId
              ? [...new Set([...family.reportIds, report.id])]
              : family.reportIds.filter((id) => id !== report.id),
          updatedAt:
            family.id === familyId
              ? new Date().toISOString()
              : family.updatedAt,
        })),
      );
      addActivity(
        report.id,
        "Finding Family Linked",
        familyId
          ? "Added report to a finding family."
          : "Removed report from its finding family.",
      );
    }
    if (rootCauseId) {
      persistRootCauses(
        rootCauses.map((entry) => ({
          ...entry,
          reportIds:
            entry.id === rootCauseId
              ? [...new Set([...entry.reportIds, report.id])]
              : entry.reportIds.filter((id) => id !== report.id),
          updatedAt:
            entry.id === rootCauseId
              ? new Date().toISOString()
              : entry.updatedAt,
        })),
      );
      addActivity(report.id, "Root Cause Linked", "Linked a root-cause entry.");
    }
  };
  const saveCommunication = (entry: CommunicationEntry) => {
    const exists = communications.some((item) => item.id === entry.id);
    persistCommunications(
      exists
        ? communications.map((item) => (item.id === entry.id ? entry : item))
        : [entry, ...communications],
    );
    if (!exists && entry.reportId)
      addActivity(
        entry.reportId,
        "Communication Recorded",
        "Recorded a local program communication.",
      );
  };
  const saveInformationRequest = (request: InformationRequest) => {
    const exists = informationRequests.some((item) => item.id === request.id);
    persistInformationRequests(
      exists
        ? informationRequests.map((item) =>
            item.id === request.id ? request : item,
          )
        : [request, ...informationRequests],
    );
    if (!exists)
      addActivity(
        request.reportId,
        "Information Request Created",
        "Created an information request.",
      );
    if (request.status === "Responded")
      addActivity(
        request.reportId,
        "Information Request Responded",
        "Marked information request response as sent externally by the researcher.",
      );
  };
  const healthData: HealthData = {
    reports,
    programs,
    assets,
    retests,
    communications,
    informationRequests,
    findingFamilies,
    rootCauses,
    snapshots,
  };
  const repairHealth = (
    result: Awaited<ReturnType<typeof runDataHealthCheck>>,
  ) => {
    const repairIds = new Set(
      result.findings.filter((item) => item.repairable).map((item) => item.id),
    );
    const nextReports = reports.map((report) => ({
      ...report,
      programProfileId: repairIds.has(`program-${report.id}`)
        ? undefined
        : report.programProfileId,
      linkedAssetIds: (report.linkedAssetIds ?? []).filter(
        (id) => !repairIds.has(`asset-${report.id}-${id}`),
      ),
      rootCauseId: repairIds.has(`root-${report.id}`)
        ? undefined
        : report.rootCauseId,
      findingFamilyId: repairIds.has(`family-${report.id}`)
        ? undefined
        : report.findingFamilyId,
    }));
    persistReports(nextReports);
    persistFamilies(
      findingFamilies.map((family) => ({
        ...family,
        reportIds: family.reportIds.filter(
          (id) => !repairIds.has(`family-member-${family.id}-${id}`),
        ),
      })),
    );
    persistCommunications(
      communications.filter(
        (entry) =>
          !entry.reportId || !repairIds.has(`communication-${entry.id}`),
      ),
    );
    persistRetests(
      retests.map((retest) => ({
        ...retest,
        evidenceIds: retest.evidenceIds.filter(
          (id) => !repairIds.has(`retest-evidence-${retest.id}-${id}`),
        ),
      })),
    );
    persistDiagnostics({
      ...diagnostics,
      lastHealthScanAt: new Date().toISOString(),
      lastHealthResult: result.findings,
    });
    addActivity(
      "workspace-health",
      "Safe Repair Applied",
      "Applied unambiguous local relationship cleanup.",
    );
    notify(
      "success",
      "Safe repairs were applied. Review any remaining warnings manually.",
    );
  };
  const unlockWorkspace = async () => {
    if (privacyScreen && !locked) {
      setPrivacyScreen(false);
      return;
    }
    if (await verifyWorkspacePassphrase(unlockPassphrase, lockSettings)) {
      setUnlockPassphrase("");
      setUnlockError("");
      setLocked(false);
      setPrivacyScreen(false);
    } else setUnlockError("Unlock failed. Check the passphrase and try again.");
  };
  const enableWorkspaceLock = async (passphrase: string) => {
    const next = await configureWorkspaceLock(passphrase, {
      enabled: true,
      lockAfterMinutes: lockSettings.lockAfterMinutes,
      lockOnHiddenMinutes: lockSettings.lockOnHiddenMinutes,
      requireOnStart: lockSettings.requireOnStart,
      sessionOnlyUnlock: lockSettings.sessionOnlyUnlock,
    });
    setLockSettings(next);
  };
  const navTitles: Record<NavigableAppPage, string> = {
    dashboard: "Dashboard",
    reports: "Reports",
    templates: "Templates",
    settings: "Settings",
    submissions: "Submission Tracker",
    knowledge: "Knowledge Base",
    programs: "Programs",
    retests: "Retest Workspace",
    families: "Finding Families",
    communications: "Communications",
    sanitized: "Sanitized Sharing",
    diagnostics: "Diagnostics",
  };
  const toastRegion = (
    <ToastRegion
      toasts={toasts}
      onDismiss={(id) =>
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }
    />
  );
  if (safeRecoveryMode)
    return (
      <div className="min-h-screen bg-[#0b0d10] p-6 text-slate-200">
        <main className="mx-auto max-w-2xl rounded-lg border border-amber-900 bg-[#101318] p-6">
          <h1 className="text-xl font-semibold text-slate-100">
            Safe Recovery Mode
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Some local metadata could not be parsed. Nothing has been erased or
            replaced. Optional AI and PWA update handling are paused until you
            return to normal mode.
          </p>
          <ul className="mt-4 space-y-1 text-xs text-slate-400">
            {storageKeyStatus().map((item) => (
              <li key={item.key}>
                {item.key}: {item.state}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="button-secondary"
              type="button"
              onClick={exportRawMetadataBackup}
            >
              Export raw metadata backup
            </button>
            <button
              className="button-primary"
              type="button"
              onClick={() => setSafeRecoveryMode(false)}
            >
              Return to normal mode
            </button>
          </div>
        </main>
      </div>
    );
  if (locked || privacyScreen)
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-6 text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label={locked ? "Workspace locked" : "Privacy screen active"}
      >
        <section className="w-full max-w-md rounded-lg border border-slate-700 bg-[#101318] p-6 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-800 bg-cyan-950/50 text-xl"
            aria-hidden="true"
          >
            ⌑
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-100">
            {locked ? "Workspace Locked" : "Privacy Screen"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {locked
              ? "Report content is hidden. This local lock discourages casual access; it does not encrypt existing browser storage."
              : "Workspace details and evidence previews are hidden until you explicitly dismiss this screen."}
          </p>
          {locked && (
            <label className="field-group mt-5 text-left">
              <span>Workspace passphrase</span>
              <input
                className="input-field"
                type="password"
                value={unlockPassphrase}
                onChange={(event) => setUnlockPassphrase(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void unlockWorkspace();
                }}
                autoFocus
              />
            </label>
          )}
          {unlockError && (
            <p className="mt-2 text-sm text-red-300" role="alert">
              {unlockError}
            </p>
          )}
          <button
            className="button-primary mt-5"
            type="button"
            onClick={() => void unlockWorkspace()}
          >
            {locked ? "Unlock workspace" : "Dismiss privacy screen"}
          </button>
        </section>
      </div>
    );
  if (page === "preview" && previewReport)
    return (
      <>
        {
          <ReportPreviewPage
            report={previewReport}
            settings={settings}
            onBack={() => {
              setPreviewReport(undefined);
              setPage("reports");
            }}
            onNotify={notify}
            onPrepareSubmission={openSubmission}
          />
        }
        {toastRegion}
      </>
    );
  if (page === "submission" && currentSubmission)
    return (
      <>
        <AppLayout
          page={page}
          title="Prepare Submission"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigate={(next) => setPage(next)}
          onNewReport={openNewReport}
        >
          <SubmissionWorkflowPage
            report={currentSubmission}
            onBack={() => setPage("submissions")}
            onOpenReport={() => openReport(currentSubmission)}
            onOpenPreview={() => openPreview(currentSubmission)}
            onRunQuality={() => void handleQualityCheck(currentSubmission)}
            onUpdate={handleWorkflowUpdate}
            onNotify={notify}
          />
        </AppLayout>
        {toastRegion}
      </>
    );
  const layoutTitle =
    page === "editor"
      ? editingReport
        ? "Edit Report"
        : "New Report"
      : page === "submission"
        ? "Prepare Submission"
        : page === "preview"
          ? "Report Preview"
          : page === "notFound"
            ? "Page not found"
            : navTitles[page];
  return (
    <>
      <AppLayout
        page={page}
        title={layoutTitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={(next) => requestLeave(() => setPage(next))}
        onNewReport={openNewReport}
      >
        {page === "dashboard" && (
          <DashboardPage
            reports={visibleReports}
            allReports={reports}
            activities={activities}
            hasSearch={searchQuery.trim().length > 0}
            onOpen={openReport}
            onPrepareSubmission={openSubmission}
            onPreview={openPreview}
            onExport={handleExport}
            onDuplicate={handleDuplicate}
            onDelete={setReportToDelete}
            onViewReports={() => setPage("reports")}
            retests={retests}
            communications={communications}
            informationRequests={informationRequests}
            diagnostics={diagnostics}
          />
        )}
        {page === "reports" && (
          <ReportsPage
            reports={visibleReports}
            hasSearch={searchQuery.trim().length > 0}
            severityFilter={severityFilter}
            statusFilter={statusFilter}
            onSeverityChange={setSeverityFilter}
            onStatusChange={setStatusFilter}
            onClearFilters={() => {
              setSearchQuery("");
              setSeverityFilter("all");
              setStatusFilter("all");
            }}
            onNewReport={openNewReport}
            onOpen={openReport}
            onPrepareSubmission={openSubmission}
            onPreview={openPreview}
            onExport={handleExport}
            onDuplicate={handleDuplicate}
            onDelete={setReportToDelete}
            onBulkAction={handleBulkAction}
          />
        )}
        {page === "editor" && (
          <ReportEditorPage
            key={
              editingReport?.id ??
              `${nextReference}-${initialDraft?.templateId ?? "blank"}`
            }
            report={editingReport}
            initialDraft={initialDraft}
            reportReference={editingReport?.reportReference ?? nextReference}
            settings={settings}
            aiSettings={aiSettings}
            allReports={reports}
            onSave={handleSave}
            onAutosave={handleAutosave}
            onBack={() => requestLeave(() => setPage("reports"))}
            onDirtyChange={setEditorDirty}
            registerLeaveHandlers={(handlers) => {
              leaveHandlers.current = handlers;
            }}
            onNotify={notify}
            activities={activities.filter(
              (item) => item.reportId === editingReport?.id,
            )}
            snapshots={snapshots.filter(
              (item) => item.reportId === editingReport?.id,
            )}
            onQualityCheck={handleQualityCheck}
            onCreateSnapshot={createManualSnapshot}
            onPreviewSnapshot={(snapshot) => openPreview(snapshot.data)}
            onRestoreSnapshot={restoreSnapshot}
            onDeleteSnapshot={(snapshot) =>
              persistSnapshots(
                snapshots.filter((item) => item.id !== snapshot.id),
              )
            }
            onLabelSnapshot={labelSnapshot}
            onPrepareSubmission={openSubmission}
            onLifecycleTransition={updateLifecycle}
          />
        )}
        {page === "templates" && (
          <TemplatesPage
            customTemplates={customTemplates}
            preferences={templatePreferences}
            reports={reports}
            knowledgeEntries={[...BUILT_IN_KNOWLEDGE, ...customKnowledge]}
            onUseBlank={openTemplateBlank}
            onUseExample={openTemplateExample}
            onSaveCustom={saveTemplate}
            onDeleteCustom={deleteTemplate}
            onUpdatePreference={updateTemplatePreference}
            onUseKnowledge={openKnowledge}
            onOpenKnowledge={openKnowledgeLibrary}
          />
        )}
        {page === "knowledge" && (
          <KnowledgeBasePage
            customEntries={customKnowledge}
            onUse={openKnowledge}
            onSave={saveKnowledge}
            onDelete={deleteKnowledge}
            onNotify={notify}
          />
        )}
        {page === "programs" && (
          <ProgramsPage
            programs={programs}
            reports={reports}
            onSave={saveProgram}
            onDelete={deleteProgram}
          />
        )}
        {page === "submissions" && (
          <SubmissionTrackerPage
            reports={reports.filter((item) => !item.archivedAt)}
            onOpen={openReport}
            onUpdateOutcome={updateOutcome}
            onArchive={handleArchive}
            onActivity={(report) => openReport(report)}
            onLifecycleTransition={updateLifecycle}
          />
        )}
        {page === "retests" && (
          <RetestWorkspacePage
            reports={reports}
            assets={assets}
            retests={retests}
            onSave={saveRetestRecord}
            onDelete={(retest) =>
              persistRetests(retests.filter((item) => item.id !== retest.id))
            }
            onComplete={completeRetest}
            onSaveComparisonNote={saveComparisonNote}
          />
        )}
        {page === "families" && (
          <FindingFamiliesPage
            reports={reports}
            programs={programs}
            families={findingFamilies}
            rootCauses={rootCauses}
            onSaveFamily={saveFamily}
            onDeleteFamily={deleteFamily}
            onSaveRootCause={saveRootCause}
            onDeleteRootCause={deleteRootCause}
            onLinkReport={linkRelationships}
          />
        )}
        {page === "communications" && (
          <CommunicationsPage
            reports={reports}
            programs={programs}
            communications={communications}
            requests={informationRequests}
            onSaveCommunication={saveCommunication}
            onSaveRequest={saveInformationRequest}
          />
        )}
        {page === "sanitized" && (
          <SanitizedSharingPage
            reports={reports}
            settings={settings}
            profiles={sanitizationProfiles}
            onSaveProfile={(profile) =>
              persistSanitizationProfiles(
                sanitizationProfiles.some((item) => item.id === profile.id)
                  ? sanitizationProfiles.map((item) =>
                      item.id === profile.id ? profile : item,
                    )
                  : [profile, ...sanitizationProfiles],
              )
            }
            onActivity={(report) => {
              addActivity(
                report.id,
                "Sanitized Export Generated",
                "Generated a sanitized copy; original report was unchanged.",
              );
              notify("success", "Sanitized export started.");
            }}
            onNotify={notify}
          />
        )}
        {page === "diagnostics" && (
          <DiagnosticsPage
            data={healthData}
            metadata={diagnostics}
            onSaveMetadata={persistDiagnostics}
            onRepair={repairHealth}
          />
        )}
        {page === "settings" && (
          <SettingsPage
            settings={settings}
            onSave={saveSettingsChange}
            aiSettings={aiSettings}
            onSaveAiSettings={saveAiSettingsChange}
            backupData={{
              reports,
              templates: customTemplates,
              settings,
              knowledge: customKnowledge,
              activity: activities,
              history: snapshots,
              programs,
              assets,
              retests,
              findingFamilies,
              rootCauses,
              communications,
              informationRequests,
              sanitizationProfiles,
              diagnostics,
            }}
            evidenceCount={reports.reduce(
              (total, report) =>
                total +
                report.evidenceItems.filter((item) => item.type === "image")
                  .length,
              0,
            )}
            onImport={importBackup}
            onClearActivity={clearActivity}
            onCleanupEvidence={cleanupEvidence}
            onResetTemplates={resetTemplates}
            onResetKnowledge={resetKnowledge}
            onDeleteAll={deleteAllData}
            onNotify={notify}
            lockSettings={lockSettings}
            onConfigureLock={async (passphrase, next) => {
              if (next.enabled) await enableWorkspaceLock(passphrase);
              else {
                const disabled = {
                  ...next,
                  enabled: false,
                  salt: undefined,
                  verifier: undefined,
                  iterations: undefined,
                  updatedAt: new Date().toISOString(),
                };
                saveLockSettings(disabled);
                setLockSettings(disabled);
              }
            }}
            onLockNow={() => {
              setLocked(true);
              addActivity(
                "workspace-lock",
                "Workspace Locked",
                "Locked local workspace.",
              );
            }}
            onEncryptedBackup={() => {
              persistDiagnostics({
                ...diagnostics,
                lastBackupAt: new Date().toISOString(),
              });
              addActivity(
                "workspace-backup",
                "Encrypted Backup Generated",
                "Generated an encrypted local backup package.",
              );
            }}
          />
        )}
        {page === "notFound" && (
          <section className="mx-auto max-w-2xl rounded-lg border border-slate-800 bg-[#101318] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
              404
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-100">
              Page not found
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This route is not available in the local workspace. Reports and
              evidence have not been changed.
            </p>
            <button
              className="button-primary mt-5"
              type="button"
              onClick={() => setPage("dashboard")}
            >
              Return to dashboard
            </button>
          </section>
        )}
      </AppLayout>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(next) => requestLeave(() => setPage(next))}
        onOpenReport={openReport}
        onLock={() => {
          setLocked(true);
          addActivity(
            "workspace-lock",
            "Workspace Locked",
            "Locked local workspace.",
          );
        }}
        onPrivacy={() => setPrivacyScreen(true)}
        reports={reports}
        retests={retests}
        communications={communications}
        requests={informationRequests}
        families={findingFamilies}
        rootCauses={rootCauses}
        profiles={sanitizationProfiles}
      />
      <ConfirmDialog
        isOpen={Boolean(reportToDelete)}
        title="Delete report?"
        description={`This will permanently remove “${reportToDelete?.title || "this report"}” and its uploaded evidence from this device.`}
        confirmLabel="Delete report"
        onConfirm={() => void handleDelete()}
        onCancel={() => setReportToDelete(undefined)}
      />
      <ConfirmDialog
        isOpen={Boolean(leaveAction)}
        title="Unsaved changes"
        description="You have changes that have not been saved to this report."
        confirmLabel="Save and Leave"
        confirmTone="primary"
        secondaryLabel="Leave Without Saving"
        cancelLabel="Stay"
        onConfirm={() => void confirmSaveAndLeave()}
        onSecondary={() => void confirmDiscardAndLeave()}
        onCancel={() => setLeaveAction(undefined)}
      />
      {toastRegion}
    </>
  );
}

export default App;
