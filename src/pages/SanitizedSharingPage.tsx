import { useMemo, useState } from "react";
import JSZip from "jszip";
import { ProfessionalPdfPreviewDialog } from "../components/pdf/ProfessionalPdfPreviewDialog";
import type { SanitizationMode, SanitizationProfile } from "../types/phase6";
import type { SanitizedPdfData, SanitizedPdfImageInput } from "../types/pdf";
import type { Report } from "../types/report";
import type { AppSettings } from "../types/settings";
import { downloadBlob } from "../utils/backup";
import { buildSanitizedPdfData } from "../utils/buildSanitizedPdfData";
import { downloadPdfBlob, sanitizedPdfFilename } from "../utils/downloadPdf";
import {
  createReportMarkdown,
  downloadMarkdown,
  safeMarkdownFilename,
} from "../utils/markdownExport";
import {
  createSanitizationProfile,
  createSanitizedCopy,
} from "../utils/sanitization";
import { validateSanitizedPdfData } from "../utils/sanitizedPdfValidation";

type PdfAction = "preview" | "download";

interface PendingPdfAction {
  action: PdfAction;
  data: SanitizedPdfData;
  warnings: string[];
}

function readSanitizedImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("The selected image could not be read."));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(
            new Error(
              "The selected image could not be converted for PDF export.",
            ),
          );
    reader.readAsDataURL(file);
  });
}

export function SanitizedSharingPage({
  reports,
  settings,
  profiles,
  onSaveProfile,
  onActivity,
  onNotify,
}: {
  reports: Report[];
  settings: AppSettings;
  profiles: SanitizationProfile[];
  onSaveProfile: (profile: SanitizationProfile) => void;
  onActivity: (report: Report) => void;
  onNotify: (type: "success" | "error", message: string) => void;
}) {
  const [reportId, setReportId] = useState(reports[0]?.id ?? "");
  const [mode, setMode] = useState<SanitizationMode>("Standard");
  const [profile, setProfile] = useState<SanitizationProfile>();
  const [sanitizedImages, setSanitizedImages] = useState<
    Record<string, SanitizedPdfImageInput | undefined>
  >({});
  const [sanitizedUrlOverrides, setSanitizedUrlOverrides] = useState<
    Record<string, string | undefined>
  >({});
  const [pendingPdfAction, setPendingPdfAction] = useState<PendingPdfAction>();
  const [preview, setPreview] = useState<{
    blob: Blob;
    data: SanitizedPdfData;
    url: string;
  }>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfGenerationError, setPdfGenerationError] = useState<string | null>(
    null,
  );
  const [pdfFeedback, setPdfFeedback] = useState<string>();

  const selectedReportId = reports.some((report) => report.id === reportId)
    ? reportId
    : (reports[0]?.id ?? "");
  const source = reports.find((report) => report.id === selectedReportId);
  const generatedProfile = useMemo(
    () => (source ? createSanitizationProfile(source, mode) : undefined),
    [mode, source],
  );
  const active = profile ?? generatedProfile;
  const copy = useMemo(
    () => (source && active ? createSanitizedCopy(source, active) : undefined),
    [active, source],
  );
  const sanitizedPdfData = useMemo(
    () =>
      copy
        ? buildSanitizedPdfData(copy, {
            sanitizedImageInputs: sanitizedImages,
            sanitizedUrlOverrides,
          })
        : undefined,
    [copy, sanitizedImages, sanitizedUrlOverrides],
  );
  const record = () => {
    if (source) onActivity(source);
  };

  const resetSelectedReport = (nextId: string) => {
    setReportId(nextId);
    setProfile(undefined);
    setSanitizedImages({});
    setSanitizedUrlOverrides({});
    if (preview) URL.revokeObjectURL(preview.url);
    setPdfFeedback(undefined);
    setPdfGenerationError(null);
    setIsPdfPreviewOpen(false);
    setPreview(undefined);
  };

  const exportHtml = () => {
    if (!copy || !source) return;
    const text = createReportMarkdown(copy.report, settings.exportPreferences);
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    downloadBlob(
      new Blob(
        [
          `<!doctype html><html><head><meta charset="utf-8"><title>Sanitized Copy</title></head><body><header><strong>Sanitized Copy — Not the Original Submission Record</strong></header><pre>${escaped}</pre></body></html>`,
        ],
        { type: "text/html" },
      ),
      `${safeMarkdownFilename(copy.report.title).replace(/\.md$/, "")}-sanitized.html`,
    );
    record();
  };

  const exportZip = async () => {
    if (!copy || !source) return;
    const zip = new JSZip();
    zip.file(
      "README.txt",
      "Sanitized Copy — Not the Original Submission Record\nOriginal evidence, HAR files, unredacted transcripts, AI conversations, activity history, contacts, encryption settings, and workspace settings are excluded.",
    );
    zip.file(
      "report.md",
      createReportMarkdown(copy.report, settings.exportPreferences),
    );
    zip.file("report.json", JSON.stringify(copy.report, null, 2));
    downloadBlob(
      await zip.generateAsync({ type: "blob", compression: "DEFLATE" }),
      `${safeMarkdownFilename(copy.report.title).replace(/\.md$/, "")}-sanitized.zip`,
    );
    record();
  };

  const generatePdf = async (action: PdfAction, data: SanitizedPdfData) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfGenerationError(null);
    setPdfFeedback("Generating professional PDF…");
    try {
      // Keep React PDF out of the initial application bundle. A PDF renderer
      // failure is therefore limited to an explicit PDF action, never startup.
      const [{ pdf }, { SanitizedSecurityReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../components/pdf/SanitizedSecurityReportPdf"),
      ]);
      const blob = await pdf(
        <SanitizedSecurityReportPdf data={data} />,
      ).toBlob();
      if (!blob.size)
        throw new Error(
          "The professional PDF generator returned an empty file.",
        );
      if (action === "preview") {
        setPreview({ blob, data, url: URL.createObjectURL(blob) });
        setIsPdfPreviewOpen(true);
      } else {
        downloadPdfBlob(blob, sanitizedPdfFilename(data));
        onNotify("success", "Professional PDF downloaded.");
      }
      record();
      setPdfFeedback(
        action === "preview"
          ? "Professional PDF preview is ready."
          : "Professional PDF download started.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? `Professional PDF could not be generated: ${error.message}`
          : "Professional PDF could not be generated. Your report remains unchanged.";
      setPdfGenerationError(message);
      setPdfFeedback(message);
      onNotify("error", message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const preparePdf = (action: PdfAction) => {
    if (!source || !copy || !sanitizedPdfData) {
      const message = "Select a report first.";
      setPdfGenerationError(message);
      setPdfFeedback(message);
      onNotify("error", message);
      return;
    }
    const validation = validateSanitizedPdfData(sanitizedPdfData, source);
    if (validation.errors.length) {
      const message = validation.errors.join(" ");
      setPdfGenerationError(message);
      setPdfFeedback(message);
      onNotify("error", message);
      return;
    }
    if (validation.warnings.length) {
      setPendingPdfAction({
        action,
        data: sanitizedPdfData,
        warnings: validation.warnings,
      });
      return;
    }
    void generatePdf(action, sanitizedPdfData);
  };

  const handlePreviewProfessionalPdf = () => {
    setPdfGenerationError(null);
    preparePdf("preview");
  };
  const handleDownloadProfessionalPdf = () => {
    setPdfGenerationError(null);
    preparePdf("download");
  };

  const exportActions = (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        className="button-secondary"
        type="button"
        disabled={!copy}
        onClick={() => {
          if (!copy) return;
          downloadMarkdown(
            createReportMarkdown(copy.report, settings.exportPreferences),
            `${safeMarkdownFilename(copy.report.title).replace(/\.md$/, "")}-sanitized.md`,
          );
          record();
        }}
      >
        Export Markdown
      </button>
      <button
        className="button-secondary"
        type="button"
        disabled={!copy}
        onClick={() => {
          if (!copy) return;
          downloadBlob(
            new Blob(
              [createReportMarkdown(copy.report, settings.exportPreferences)],
              { type: "text/plain" },
            ),
            `${safeMarkdownFilename(copy.report.title).replace(/\.md$/, "")}-sanitized.txt`,
          );
          record();
        }}
      >
        Export Plain Text
      </button>
      <button
        className="button-secondary"
        type="button"
        disabled={!copy}
        onClick={exportHtml}
      >
        Export HTML
      </button>
      <button
        className="button-secondary"
        type="button"
        disabled={!copy}
        onClick={() => {
          if (!copy) return;
          downloadBlob(
            new Blob([JSON.stringify(copy.report, null, 2)], {
              type: "application/json",
            }),
            `${safeMarkdownFilename(copy.report.title).replace(/\.md$/, "")}-sanitized.json`,
          );
          record();
        }}
      >
        Export JSON
      </button>
      <button
        className="button-primary"
        type="button"
        disabled={!copy}
        onClick={() => void exportZip()}
      >
        Export Sanitized ZIP
      </button>
      <button
        className="button-secondary"
        type="button"
        disabled={!source || isGeneratingPdf}
        onClick={handlePreviewProfessionalPdf}
      >
        Preview Professional PDF
      </button>
      <button
        className="button-primary"
        type="button"
        disabled={!source || isGeneratingPdf}
        onClick={handleDownloadProfessionalPdf}
      >
        {isGeneratingPdf ? "Generating PDF…" : "Download Professional PDF"}
      </button>
    </div>
  );

  const selectSanitizedImage = async (evidenceId: string, file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setPdfFeedback(
        "Professional PDF image evidence supports sanitized PNG and JPEG files only.",
      );
      return;
    }
    try {
      const dataUrl = await readSanitizedImage(file);
      setSanitizedImages((current) => ({
        ...current,
        [evidenceId]: {
          dataUrl,
          label: current[evidenceId]?.label ?? "Sanitized Evidence",
        },
      }));
      setPdfFeedback(
        "Sanitized image selected for this PDF export only. The original evidence remains excluded.",
      );
    } catch (error) {
      setPdfFeedback(
        error instanceof Error
          ? error.message
          : "The selected sanitized image could not be used.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-lg border border-slate-800 bg-[#101318] p-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Sanitized Sharing
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Generate a separate portfolio, educational, peer-review, or
          professional PDF copy. Original reports and evidence remain unchanged.
        </p>
      </section>
      <section className="editor-section">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field-group">
            <span>Report</span>
            <select
              className="input-field"
              value={selectedReportId}
              disabled={!reports.length}
              onChange={(event) => resetSelectedReport(event.target.value)}
            >
              {!reports.length && (
                <option value="">No reports available</option>
              )}
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.reportReference} · {report.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span>Sanitization mode</span>
            <select
              className="input-field"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as SanitizationMode);
                setProfile(undefined);
                setPdfFeedback(undefined);
              }}
            >
              <option>Minimal</option>
              <option>Standard</option>
              <option>Strict</option>
              <option>Custom</option>
            </select>
          </label>
        </div>
        {exportActions}
        {!source && (
          <p className="mt-3 text-xs text-slate-500">
            Select a report to enable sanitized exports and professional PDF
            actions.
          </p>
        )}
        {(pdfFeedback || pdfGenerationError) && (
          <p
            className={`mt-3 text-xs ${pdfGenerationError ? "text-red-300" : "text-slate-300"}`}
            role={pdfGenerationError ? "alert" : undefined}
            aria-live="polite"
          >
            {pdfGenerationError ?? pdfFeedback}
          </p>
        )}
        {active && (
          <>
            <div className="mt-5">
              <h3 className="font-medium text-slate-200">
                Review replacements
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Repeated values use deterministic, whole-value replacement to
                preserve technical readability.
              </p>
              <div className="mt-3 space-y-2">
                {active.replacements.map((item) => (
                  <label
                    className="grid gap-2 rounded border border-slate-800 bg-[#0d1014] p-3 sm:grid-cols-[auto_10rem_1fr_1fr]"
                    key={item.id}
                  >
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        setProfile({
                          ...active,
                          replacements: active.replacements.map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, enabled: event.target.checked }
                              : candidate,
                          ),
                          updatedAt: new Date().toISOString(),
                        })
                      }
                    />
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      {item.category}
                    </span>
                    <code className="break-all text-xs text-slate-400">
                      {item.source || "Strict-mode pattern"}
                    </code>
                    <input
                      className="input-field py-1 text-xs"
                      value={item.replacement}
                      onChange={(event) =>
                        setProfile({
                          ...active,
                          replacements: active.replacements.map((candidate) =>
                            candidate.id === item.id
                              ? {
                                  ...candidate,
                                  replacement: event.target.value,
                                }
                              : candidate,
                          ),
                          updatedAt: new Date().toISOString(),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => {
                    onSaveProfile(active);
                    setProfile(active);
                  }}
                >
                  Save profile
                </button>
                <span className="text-xs text-slate-500">
                  {profiles.length} saved local profile(s)
                </span>
              </div>
            </div>
            {copy && (
              <section className="mt-6 rounded border border-slate-800 bg-[#0d1014] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-100">
                      Sanitized preview
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Sensitive-data scanner findings after sanitization:{" "}
                      {copy.scanCount}
                    </p>
                  </div>
                  <span className="badge border-amber-800 bg-amber-950/40 text-amber-200">
                    Sanitized Copy — Not the Original Submission Record
                  </span>
                </div>
                {copy.warnings.map((warning) => (
                  <p
                    className="mt-3 rounded border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-200"
                    key={warning}
                  >
                    {warning}
                  </p>
                ))}
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
                  {createReportMarkdown(
                    copy.report,
                    settings.exportPreferences,
                  )}
                </pre>
                <section className="mt-6 border-t border-slate-800 pt-5">
                  <h3 className="font-medium text-slate-100">
                    Professional PDF evidence controls
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Original image binaries are never read or embedded. To
                    include an image, explicitly select a manually redacted PNG
                    or JPEG replacement for this PDF export only. URL evidence
                    also requires an explicitly entered sanitized destination.
                  </p>
                  {copy.report.evidenceItems
                    .filter((item) => item.type === "image")
                    .map((item) => (
                      <div
                        className="mt-3 rounded border border-slate-800 p-3"
                        key={item.id}
                      >
                        <p className="text-sm text-slate-300">{item.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <label
                            className="button-secondary cursor-pointer"
                            htmlFor={`sanitized-image-${item.id}`}
                          >
                            Select sanitized image
                            <input
                              className="sr-only"
                              id={`sanitized-image-${item.id}`}
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={(event) =>
                                void selectSanitizedImage(
                                  item.id,
                                  event.target.files?.[0],
                                )
                              }
                            />
                          </label>
                          {sanitizedImages[item.id] && (
                            <>
                              <select
                                className="input-field max-w-48 py-1 text-xs"
                                aria-label={`Evidence label for ${item.title}`}
                                value={
                                  sanitizedImages[item.id]?.label ??
                                  "Sanitized Evidence"
                                }
                                onChange={(event) =>
                                  setSanitizedImages((current) => {
                                    const selected = current[item.id];
                                    return selected
                                      ? {
                                          ...current,
                                          [item.id]: {
                                            ...selected,
                                            label: event.target
                                              .value as SanitizedPdfImageInput["label"],
                                          },
                                        }
                                      : current;
                                  })
                                }
                              >
                                <option>Sanitized Evidence</option>
                                <option>Redacted Evidence</option>
                                <option>Annotated Evidence</option>
                              </select>
                              <button
                                className="table-action-danger"
                                type="button"
                                onClick={() =>
                                  setSanitizedImages((current) => ({
                                    ...current,
                                    [item.id]: undefined,
                                  }))
                                }
                              >
                                Exclude image
                              </button>
                            </>
                          )}
                          <span className="text-xs text-slate-500">
                            {sanitizedImages[item.id]
                              ? "Selected sanitized replacement"
                              : "Original excluded"}
                          </span>
                        </div>
                      </div>
                    ))}
                  {copy.report.evidenceItems
                    .filter((item) => item.type === "url")
                    .map((item) => (
                      <label className="field-group mt-3" key={item.id}>
                        <span>{item.title} — sanitized URL destination</span>
                        <input
                          className="input-field"
                          type="url"
                          value={sanitizedUrlOverrides[item.id] ?? ""}
                          onChange={(event) =>
                            setSanitizedUrlOverrides((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="https://sanitized.example/path"
                        />
                      </label>
                    ))}
                </section>
                <section className="mt-5 rounded border border-cyan-900 bg-cyan-950/20 p-4">
                  <h3 className="font-medium text-cyan-100">
                    Professional PDF
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Generates a browser-only A4 security report with
                    professional metadata, numbered sections, structured step
                    cards, click-safe links, and PDF page numbering. The
                    component receives only the sanitized PDF data model.
                  </p>
                </section>
              </section>
            )}
          </>
        )}
      </section>
      {pendingPdfAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
        >
          <section
            className="w-full max-w-lg rounded-lg border border-amber-800 bg-[#161a20] p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="professional-pdf-warning-title"
          >
            <h2
              id="professional-pdf-warning-title"
              className="text-lg font-semibold text-amber-100"
            >
              Review PDF export warnings
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              The PDF is sanitized, but these items need your confirmation
              before it is generated.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-100">
              {pendingPdfAction.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setPendingPdfAction(undefined)}
              >
                Return to editor
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={() => {
                  const next = pendingPdfAction;
                  setPendingPdfAction(undefined);
                  void generatePdf(next.action, next.data);
                }}
              >
                Continue with sanitized PDF
              </button>
            </div>
          </section>
        </div>
      )}
      <ProfessionalPdfPreviewDialog
        blob={isPdfPreviewOpen ? preview?.blob : undefined}
        data={isPdfPreviewOpen ? preview?.data : undefined}
        previewUrl={isPdfPreviewOpen ? preview?.url : undefined}
        onClose={() => {
          if (preview) URL.revokeObjectURL(preview.url);
          setIsPdfPreviewOpen(false);
          setPreview(undefined);
        }}
        onDownload={() => {
          if (preview) {
            downloadPdfBlob(preview.blob, sanitizedPdfFilename(preview.data));
            setPdfFeedback("Professional PDF download started.");
            onNotify("success", "Professional PDF downloaded.");
          }
        }}
      />
    </div>
  );
}
