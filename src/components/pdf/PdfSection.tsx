import type { ReactNode } from "react";
import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";

export function PdfSection({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <View style={pdfStyles.section} minPresenceAhead={72}>
    <View style={pdfStyles.sectionHeading}>
      <Text style={pdfStyles.sectionNumber}>{String(number).padStart(2, "0")}</Text>
      <Text style={pdfStyles.sectionTitle}>{title}</Text>
      <View style={pdfStyles.sectionLine} />
    </View>
    {children}
  </View>;
}
