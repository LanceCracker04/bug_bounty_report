import type { SanitizedPdfData } from "../types/pdf";

export function sanitizedPdfFilename(data: SanitizedPdfData): string {
  const reference =
    data.reportReference.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "") ||
    "report";
  return `${reference}-sanitized-security-report.pdf`;
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
