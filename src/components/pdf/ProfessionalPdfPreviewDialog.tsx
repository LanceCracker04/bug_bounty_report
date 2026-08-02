import type { SanitizedPdfData } from "../../types/pdf";
import { sanitizedPdfFilename } from "../../utils/downloadPdf";

export function ProfessionalPdfPreviewDialog({ blob, data, previewUrl, onClose, onDownload }: { blob?: Blob; data?: SanitizedPdfData; previewUrl?: string; onClose: () => void; onDownload: () => void }) {
  if (!blob || !data) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={onClose}>
    <section className="flex h-[92vh] w-full max-w-6xl flex-col rounded-lg border border-slate-700 bg-[#101318] p-4" role="dialog" aria-modal="true" aria-labelledby="professional-pdf-preview-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 id="professional-pdf-preview-title" className="font-semibold text-slate-100">Professional PDF Preview</h2><p className="mt-1 text-xs text-slate-500">{sanitizedPdfFilename(data)} · Sanitized Copy — Not the Original Submission Record</p></div><div className="flex gap-2"><button className="button-secondary" type="button" onClick={onDownload}>Download Professional PDF</button><button className="button-secondary" type="button" onClick={onClose}>Close</button></div></div>
      {previewUrl ? <iframe className="min-h-0 flex-1 rounded border border-slate-700 bg-white" title="Professional sanitized PDF preview" src={previewUrl} /> : <p className="text-sm text-slate-400">Preparing preview…</p>}
    </section>
  </div>;
}
