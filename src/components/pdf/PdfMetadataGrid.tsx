import { Text, View } from "@react-pdf/renderer";
import type { SanitizedPdfData } from "../../types/pdf";
import { breakLongTokens, pdfStyles } from "./pdfStyles";

export function PdfMetadataGrid({ data }: { data: SanitizedPdfData }) {
  const values = [
    ["Program", data.program],
    ["Platform", data.platform],
    ["Target", data.target],
    ["Affected Asset", data.affectedAsset],
    ["Vulnerable Endpoint", data.vulnerableEndpoint],
    ["Vulnerability Type", data.vulnerabilityType],
    ["Vulnerability Class", data.vulnerabilityClass],
    ["Discovery Date", data.discoveredAt],
    ["CVSS Score", data.cvssScore?.toFixed(1)],
    ["CVSS Vector", data.cvssVector],
  ].filter(([, value]) => Boolean(value));
  return (
    <View style={pdfStyles.metadataGrid}>
      {values.map(([label, value]) => (
        <View style={pdfStyles.metadataCell} key={label}>
          <Text style={pdfStyles.metadataLabel}>{label}</Text>
          <Text
            style={
              label === "CVSS Vector" || label === "Vulnerable Endpoint"
                ? [pdfStyles.metadataValue, pdfStyles.mono]
                : pdfStyles.metadataValue
            }
          >
            {breakLongTokens(value ?? "")}
          </Text>
        </View>
      ))}
    </View>
  );
}
