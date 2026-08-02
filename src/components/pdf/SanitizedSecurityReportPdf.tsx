import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import type { SanitizedPdfData } from "../../types/pdf";
import { PdfCoverHeader } from "./PdfCoverHeader";
import { PdfEvidenceCard } from "./PdfEvidenceCard";
import { PdfMetadataGrid } from "./PdfMetadataGrid";
import { PdfSection } from "./PdfSection";
import { PdfStepCard } from "./PdfStepCard";
import { PdfTimeline } from "./PdfTimeline";
import { breakLongTokens, pdfStyles } from "./pdfStyles";

function Paragraphs({ value, style = pdfStyles.body }: { value: string; style?: typeof pdfStyles.body }) {
  return <>{value.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <Text style={style} key={index}>{breakLongTokens(paragraph.replace(/\n/g, " "))}</Text>)}</>;
}

export function SanitizedSecurityReportPdf({ data }: { data: SanitizedPdfData }) {
  let sectionNumber = 1;
  const nextSection = () => sectionNumber++;
  return <Document title={`${data.reportReference} Sanitized Security Report`} author={data.preparedBy} subject="Sanitized security report">
    <Page size="A4" style={pdfStyles.page}>
      <Text fixed style={pdfStyles.runningHeader} render={({ pageNumber }) => pageNumber > 1 ? `SANITIZED SECURITY REPORT  ·  ${data.reportReference}` : ""} />
      <Text fixed style={pdfStyles.footer} render={({ pageNumber, totalPages }) => `Sanitized Copy — Not the Original Submission Record  ·  Page ${pageNumber} of ${totalPages}`} />
      <PdfCoverHeader data={data} />
      <PdfMetadataGrid data={data} />
      <View style={pdfStyles.riskSummary} wrap={false}>
        <Text style={pdfStyles.riskScore}>{data.cvssScore?.toFixed(1) ?? "—"}</Text>
        <View style={pdfStyles.riskDetails}><Text style={pdfStyles.riskHeading}>Risk Summary</Text><Text style={pdfStyles.riskText}>{data.severity} severity · {data.vulnerabilityClass || data.vulnerabilityType} · {data.status}</Text></View>
      </View>
      {data.executiveSummary && <PdfSection number={nextSection()} title="Executive Summary"><Paragraphs value={data.executiveSummary} /></PdfSection>}
      {data.technicalDescription && <PdfSection number={nextSection()} title="Technical Description"><Paragraphs value={data.technicalDescription} /></PdfSection>}
      {data.prerequisites && <PdfSection number={nextSection()} title="Prerequisites"><Paragraphs value={data.prerequisites} /></PdfSection>}
      {data.structuredSteps.length > 0 && <PdfSection number={nextSection()} title="Steps to Reproduce">{data.structuredSteps.map((step, index) => <PdfStepCard step={step} index={index} key={`${step.title}-${index}`} />)}</PdfSection>}
      {data.securityImpact && <PdfSection number={nextSection()} title="Security Impact"><View style={pdfStyles.impactCallout}><Text style={pdfStyles.remediationMarker}>Security Impact</Text><Paragraphs value={data.securityImpact} /></View></PdfSection>}
      {data.evidenceItems.length > 0 && <PdfSection number={nextSection()} title="Evidence">{data.evidenceItems.map((evidence, index) => <PdfEvidenceCard evidence={evidence} index={index} key={`${evidence.title}-${index}`} />)}</PdfSection>}
      {data.remediation && <PdfSection number={nextSection()} title="Recommended Remediation"><View style={pdfStyles.remediation}><Text style={pdfStyles.remediationMarker}>01  DEFENSIVE GUIDANCE</Text><Paragraphs value={data.remediation} /></View></PdfSection>}
      {data.references.length > 0 && <PdfSection number={nextSection()} title="References">{data.references.map((reference, index) => <View style={pdfStyles.reference} key={`${reference.url}-${index}`} wrap={false}><Text style={pdfStyles.referenceTitle}>{reference.label}</Text><Link style={pdfStyles.link} src={reference.url}>{breakLongTokens(reference.url)}</Link></View>)}</PdfSection>}
      {data.disclosureTimeline.length > 0 && <PdfSection number={nextSection()} title="Disclosure Timeline"><PdfTimeline items={data.disclosureTimeline} /></PdfSection>}
    </Page>
  </Document>;
}
