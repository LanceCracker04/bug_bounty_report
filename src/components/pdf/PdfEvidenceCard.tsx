import { Image, Link, Text, View } from "@react-pdf/renderer";
import type { SanitizedPdfEvidence } from "../../types/pdf";
import { breakLongTokens, hasTechnicalFormatting, pdfStyles } from "./pdfStyles";

function shortUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname.length > 46 ? `${url.pathname.slice(0, 46)}…` : url.pathname}`;
  } catch {
    return value;
  }
}

export function PdfEvidenceCard({ evidence, index }: { evidence: SanitizedPdfEvidence; index: number }) {
  const canKeepTogether = !evidence.imageDataUrl && [evidence.title, evidence.description].join(" ").length < 1200;
  return <View style={pdfStyles.evidenceCard} wrap={!canKeepTogether}>
    <Text style={pdfStyles.stepEyebrow}>EVIDENCE {String(index + 1).padStart(2, "0")}</Text>
    <Text style={pdfStyles.evidenceHeading}>{breakLongTokens(evidence.title)}</Text>
    <Text style={pdfStyles.evidenceMeta}>Type: {evidence.type}</Text>
    {evidence.description && <><Text style={pdfStyles.fieldLabel}>Description</Text><Text style={hasTechnicalFormatting(evidence.description) ? pdfStyles.codeBlock : pdfStyles.body}>{breakLongTokens(evidence.description)}</Text></>}
    {evidence.url && <><Text style={pdfStyles.fieldLabel}>Sanitized destination</Text><Link style={pdfStyles.link} src={evidence.url}>{breakLongTokens(shortUrl(evidence.url))}</Link></>}
    {evidence.imageDataUrl && <><Image style={pdfStyles.evidenceImage} src={evidence.imageDataUrl} /><Text style={pdfStyles.imageLabel}>{evidence.imageLabel ?? "Sanitized Evidence"}</Text></>}
  </View>;
}
