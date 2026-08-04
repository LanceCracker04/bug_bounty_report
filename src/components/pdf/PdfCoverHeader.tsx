import { Text, View } from "@react-pdf/renderer";
import type { SanitizedPdfData } from "../../types/pdf";
import { pdfStyles, severityColor } from "./pdfStyles";

export function PdfCoverHeader({ data }: { data: SanitizedPdfData }) {
  return (
    <>
      <View style={pdfStyles.coverHeader}>
        <View>
          <Text style={pdfStyles.eyebrow}>BUG BOUNTY SECURITY REPORT</Text>
          <Text style={pdfStyles.coverName}>
            Professional disclosure record
          </Text>
        </View>
        <Text style={pdfStyles.sanitizedBadge}>SANITIZED COPY</Text>
      </View>
      <Text style={pdfStyles.sanitizedNotice}>
        Sanitized Copy — Not the Original Submission Record
      </Text>
      <View style={pdfStyles.titleRow}>
        <Text style={pdfStyles.title}>{data.title}</Text>
        <View
          style={[
            pdfStyles.severityBadge,
            { backgroundColor: severityColor(data.severity) },
          ]}
        >
          <Text style={pdfStyles.severityBadgeText}>
            {data.severity.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={pdfStyles.overview}>
        {[
          ["Report reference", data.reportReference],
          ["Status", data.status],
          ["Date prepared", data.updatedAt || data.createdAt || "Not recorded"],
          ["Prepared by", data.preparedBy],
        ].map(([label, value]) => (
          <View style={pdfStyles.overviewItem} key={label}>
            <Text style={pdfStyles.overviewLabel}>{label}</Text>
            <Text style={pdfStyles.overviewValue}>{value}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
