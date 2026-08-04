import { useState } from "react";
import {
  DataManagementPanel,
  type ImportResult,
  type ImportStrategy,
} from "../components/backup/DataManagementPanel";
import {
  REPORT_STATUSES,
  type CvssMode,
  type ReportStatus,
} from "../types/report";
import type { AiSettings, AppSettings } from "../types/settings";
import type { BackupData, ParsedBackup } from "../utils/backup";
import type { EvidenceScanResult } from "../utils/evidenceCleanup";
import { listOllamaModels } from "../utils/ollamaClient";
import type { LockSettings } from "../types/phase6";
import {
  exportEncryptedBackup,
  passphraseGuidance,
} from "../utils/encryptedBackup";

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  backupData: BackupData;
  evidenceCount: number;
  onImport: (
    backup: ParsedBackup,
    strategy: ImportStrategy,
  ) => Promise<ImportResult>;
  onClearActivity: () => void;
  onCleanupEvidence: (scan: EvidenceScanResult) => Promise<void>;
  onResetTemplates: () => void;
  onResetKnowledge: () => void;
  onDeleteAll: () => Promise<void>;
  onNotify: (type: "success" | "error" | "warning", message: string) => void;
  aiSettings: AiSettings;
  onSaveAiSettings: (settings: AiSettings) => void;
  lockSettings: LockSettings;
  onConfigureLock: (
    passphrase: string,
    settings: LockSettings,
  ) => Promise<void>;
  onLockNow: () => void;
  onEncryptedBackup: () => void;
}

export function SettingsPage({
  settings,
  onSave,
  backupData,
  evidenceCount,
  onImport,
  onClearActivity,
  onCleanupEvidence,
  onResetTemplates,
  onResetKnowledge,
  onDeleteAll,
  onNotify,
  aiSettings,
  onSaveAiSettings,
  lockSettings,
  onConfigureLock,
  onLockNow,
  onEncryptedBackup,
}: SettingsPageProps) {
  const [draft, setDraft] = useState(() => structuredClone(settings));
  const [draftSettings, setDraftSettings] = useState(() =>
    structuredClone(aiSettings),
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [lockDraft, setLockDraft] = useState(() =>
    structuredClone(lockSettings),
  );
  const [lockPassphrase, setLockPassphrase] = useState("");
  const [lockConfirmation, setLockConfirmation] = useState("");
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupConfirmation, setBackupConfirmation] = useState("");
  const [backupProgress, setBackupProgress] = useState("");
  const aiSaveDisabled = draftSettings.enabled && !draftSettings.selectedModel;

  const setProfile = <K extends keyof AppSettings["profile"]>(
    key: K,
    value: AppSettings["profile"][K],
  ) =>
    setDraft((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value },
    }));
  const setPreference = <K extends keyof AppSettings["exportPreferences"]>(
    key: K,
    value: boolean,
  ) =>
    setDraft((current) => ({
      ...current,
      exportPreferences: { ...current.exportPreferences, [key]: value },
    }));
  const updateAi = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) =>
    setDraftSettings((current) => ({ ...current, [key]: value }));
  const handleRefreshModels = async () => {
    setIsLoadingModels(true);
    setModelLoadError(null);

    try {
      const models = await listOllamaModels(draftSettings.baseUrl);

      setAvailableModels(models);

      setDraftSettings((current) => {
        const selectedStillExists = models.includes(current.selectedModel);

        return {
          ...current,
          selectedModel: selectedStillExists
            ? current.selectedModel
            : models.length === 1
              ? models[0]
              : "",
        };
      });

      onNotify("success", `${models.length} installed models found.`);
    } catch (error) {
      setAvailableModels([]);
      setModelLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load installed models.",
      );
    } finally {
      setIsLoadingModels(false);
    }
  };
  const handleSaveAiSettings = () => {
    if (draftSettings.enabled && !draftSettings.selectedModel) {
      onNotify("warning", "Select an installed Ollama model first.");
      return;
    }

    onSaveAiSettings(draftSettings);
  };
  const saveLock = async () => {
    if (
      lockDraft.enabled &&
      (lockPassphrase.length < 8 || lockPassphrase !== lockConfirmation)
    ) {
      onNotify(
        "warning",
        "Enter a matching workspace passphrase of at least 8 characters.",
      );
      return;
    }
    try {
      await onConfigureLock(lockPassphrase, lockDraft);
      setLockPassphrase("");
      setLockConfirmation("");
      onNotify(
        "success",
        lockDraft.enabled
          ? "Workspace lock configured. This does not encrypt existing browser storage."
          : "Workspace lock disabled.",
      );
    } catch {
      onNotify("error", "Workspace lock could not be configured.");
    }
  };
  const exportEncrypted = async () => {
    if (
      backupPassphrase.length < 8 ||
      backupPassphrase !== backupConfirmation
    ) {
      onNotify(
        "warning",
        "Enter matching backup passphrases of at least 8 characters.",
      );
      return;
    }
    try {
      await exportEncryptedBackup(
        backupData,
        backupPassphrase,
        (stage, percent) =>
          setBackupProgress(
            `${stage}${percent === undefined ? "" : ` ${percent}%`}`,
          ),
      );
      onEncryptedBackup();
      onNotify(
        "success",
        "Encrypted backup download started. Losing the passphrase means it cannot be recovered.",
      );
    } catch {
      onNotify(
        "error",
        "Encrypted backup could not be created; current data was not changed.",
      );
    } finally {
      setBackupPassphrase("");
      setBackupConfirmation("");
      setBackupProgress("");
    }
  };

  return (
    <form
      className="mx-auto max-w-5xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <section className="editor-section">
        <div className="section-heading">
          <span>01</span>
          <div>
            <h2>Researcher Profile</h2>
            <p>Defaults applied to new reports.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(
            [
              ["researcherName", "Researcher name"],
              ["publicHandle", "Public handle"],
              ["email", "Email"],
              ["defaultPlatform", "Default platform"],
            ] as Array<[keyof AppSettings["profile"], string]>
          ).map(([key, label]) => (
            <label className="field-group" key={key}>
              <span>{label}</span>
              <input
                className="input-field"
                type={key === "email" ? "email" : "text"}
                value={draft.profile[key]}
                onChange={(event) => setProfile(key, event.target.value)}
              />
            </label>
          ))}
          <label className="field-group">
            <span>Default report status</span>
            <select
              className="input-field"
              value={draft.profile.defaultReportStatus}
              onChange={(event) =>
                setProfile(
                  "defaultReportStatus",
                  event.target.value as ReportStatus,
                )
              }
            >
              {REPORT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span>Default CVSS mode</span>
            <select
              className="input-field"
              value={draft.profile.defaultCvssMode}
              onChange={(event) =>
                setProfile("defaultCvssMode", event.target.value as CvssMode)
              }
            >
              <option value="calculated">Calculated</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </div>
      </section>
      <section className="editor-section">
        <div className="section-heading">
          <span>02</span>
          <div>
            <h2>Export Preferences</h2>
            <p>Controls Markdown and print output.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["includeDisclosureTimeline", "Include disclosure timeline"],
              ["includeReferences", "Include references"],
              ["includeEvidenceDescriptions", "Include evidence descriptions"],
              [
                "includeReportReferenceInHeader",
                "Include report reference in header",
              ],
              [
                "includeResearcherNameInFooter",
                "Include researcher name in footer",
              ],
            ] as Array<[keyof AppSettings["exportPreferences"], string]>
          ).map(([key, label]) => (
            <label
              className="flex items-center gap-3 text-sm text-slate-300"
              key={key}
            >
              <input
                type="checkbox"
                checked={draft.exportPreferences[key]}
                onChange={(event) => setPreference(key, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </section>
      <section className="editor-section">
        <div className="section-heading">
          <span>03</span>
          <div>
            <h2>Local AI</h2>
            <p>
              Optional local Ollama writing assistance. Review all output before
              using it.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draftSettings.enabled}
              onChange={(event) => updateAi("enabled", event.target.checked)}
            />
            Enable Local AI
          </label>
          <label className="field-group">
            <span>Ollama Base URL</span>
            <input
              className="input-field"
              value={draftSettings.baseUrl}
              onChange={(event) => updateAi("baseUrl", event.target.value)}
            />
          </label>
          <div className="field-group">
            <span>Selected Model</span>
            <select
              className="input-field"
              value={draftSettings.selectedModel}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...current,
                  selectedModel: event.target.value,
                }))
              }
            >
              <option value="">Select installed model</option>
              {availableModels.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-slate-400" aria-live="polite">
              <p>Installed models loaded: {availableModels.length}</p>
              {availableModels.length > 0 && (
                <p>{availableModels.join(", ")}</p>
              )}
            </div>
            {modelLoadError && (
              <p className="mt-2 text-xs text-red-300" role="alert">
                {modelLoadError}
              </p>
            )}
          </div>
          <label className="field-group">
            <span>Timeout (ms)</span>
            <input
              className="input-field"
              type="number"
              min="5000"
              max="300000"
              value={draftSettings.requestTimeoutMs}
              onChange={(event) =>
                updateAi("requestTimeoutMs", Number(event.target.value))
              }
            />
          </label>
          <label className="field-group">
            <span>Maximum context characters</span>
            <input
              className="input-field"
              type="number"
              min="2000"
              max="100000"
              value={draftSettings.maxContextCharacters}
              onChange={(event) =>
                updateAi("maxContextCharacters", Number(event.target.value))
              }
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="button-secondary"
            type="button"
            disabled={isLoadingModels}
            onClick={() => void handleRefreshModels()}
          >
            {isLoadingModels ? "Refreshing Models..." : "Refresh Models"}
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={isLoadingModels}
            onClick={() => void handleRefreshModels()}
          >
            Test Connection
          </button>
          <button
            className="button-primary"
            type="button"
            disabled={aiSaveDisabled}
            aria-describedby={aiSaveDisabled ? "ai-model-required" : undefined}
            onClick={handleSaveAiSettings}
          >
            Save Local AI Settings
          </button>
          {aiSaveDisabled && (
            <span id="ai-model-required" className="text-xs text-amber-300">
              Select an installed Ollama model first.
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <label>
            <input
              type="checkbox"
              checked={draftSettings.streamResponses}
              onChange={(event) =>
                updateAi("streamResponses", event.target.checked)
              }
            />{" "}
            Stream responses
          </label>
          <label>
            <input
              type="checkbox"
              checked={draftSettings.includeReportMetadata}
              onChange={(event) =>
                updateAi("includeReportMetadata", event.target.checked)
              }
            />{" "}
            Include report metadata
          </label>
          <label>
            <input
              type="checkbox"
              checked={draftSettings.includeEvidenceDescriptions}
              onChange={(event) =>
                updateAi("includeEvidenceDescriptions", event.target.checked)
              }
            />{" "}
            Include evidence descriptions
          </label>
          <label>
            <input
              type="checkbox"
              checked={draftSettings.persistConversations}
              onChange={(event) =>
                updateAi("persistConversations", event.target.checked)
              }
            />{" "}
            Remember conversations locally
          </label>
        </div>
      </section>
      <section className="editor-section">
        <div className="section-heading">
          <span>04</span>
          <div>
            <h2>Local Workspace Lock</h2>
            <p>
              Discourages casual access while the app is open. It does not
              encrypt existing localStorage or replace operating-system
              security.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={lockDraft.enabled}
            onChange={(event) =>
              setLockDraft({ ...lockDraft, enabled: event.target.checked })
            }
          />
          Enable workspace lock
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="field-group">
            <span>Lock after inactivity (minutes)</span>
            <input
              className="input-field"
              type="number"
              min="1"
              value={lockDraft.lockAfterMinutes}
              onChange={(event) =>
                setLockDraft({
                  ...lockDraft,
                  lockAfterMinutes: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="field-group">
            <span>Lock after tab hidden (minutes)</span>
            <input
              className="input-field"
              type="number"
              min="1"
              value={lockDraft.lockOnHiddenMinutes}
              onChange={(event) =>
                setLockDraft({
                  ...lockDraft,
                  lockOnHiddenMinutes: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={lockDraft.requireOnStart}
              onChange={(event) =>
                setLockDraft({
                  ...lockDraft,
                  requireOnStart: event.target.checked,
                })
              }
            />
            Require unlock on application start
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={lockDraft.sessionOnlyUnlock}
              onChange={(event) =>
                setLockDraft({
                  ...lockDraft,
                  sessionOnlyUnlock: event.target.checked,
                })
              }
            />
            Allow session-only unlock
          </label>
        </div>
        {lockDraft.enabled && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="field-group">
              <span>New passphrase</span>
              <input
                className="input-field"
                type="password"
                value={lockPassphrase}
                onChange={(event) => setLockPassphrase(event.target.value)}
              />
            </label>
            <label className="field-group">
              <span>Confirm passphrase</span>
              <input
                className="input-field"
                type="password"
                value={lockConfirmation}
                onChange={(event) => setLockConfirmation(event.target.value)}
              />
            </label>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="button-primary"
            type="button"
            onClick={() => void saveLock()}
          >
            Save lock settings
          </button>
          {lockSettings.enabled && (
            <button
              className="button-secondary"
              type="button"
              onClick={onLockNow}
            >
              Lock immediately
            </button>
          )}
        </div>
      </section>
      <section className="editor-section">
        <div className="section-heading">
          <span>05</span>
          <div>
            <h2>Encrypted Backup Package</h2>
            <p>
              AES-GCM encryption is performed locally. Losing the passphrase
              means the encrypted backup cannot be recovered.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field-group">
            <span>Backup passphrase</span>
            <input
              className="input-field"
              type="password"
              value={backupPassphrase}
              onChange={(event) => setBackupPassphrase(event.target.value)}
            />
          </label>
          <label className="field-group">
            <span>Confirm passphrase</span>
            <input
              className="input-field"
              type="password"
              value={backupConfirmation}
              onChange={(event) => setBackupConfirmation(event.target.value)}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {passphraseGuidance(backupPassphrase)}
        </p>
        <button
          className="button-primary mt-4"
          type="button"
          onClick={() => void exportEncrypted()}
        >
          Export Encrypted .bbrvault
        </button>
        {backupProgress && (
          <p className="mt-2 text-xs text-slate-400" aria-live="polite">
            {backupProgress}
          </p>
        )}
      </section>
      <div className="flex justify-end">
        <button className="button-primary" type="submit">
          Save Settings
        </button>
      </div>
      <DataManagementPanel
        data={backupData}
        evidenceCount={evidenceCount}
        onImport={onImport}
        onClearActivity={onClearActivity}
        onCleanupEvidence={onCleanupEvidence}
        onResetTemplates={onResetTemplates}
        onResetKnowledge={onResetKnowledge}
        onDeleteAll={onDeleteAll}
        onNotify={onNotify}
      />
    </form>
  );
}
