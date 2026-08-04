import { Text, View } from "@react-pdf/renderer";
import type { SanitizedPdfTimelineItem } from "../../types/pdf";
import { breakLongTokens, pdfStyles } from "./pdfStyles";

export function PdfTimeline({ items }: { items: SanitizedPdfTimelineItem[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View
          style={pdfStyles.timelineItem}
          key={`${item.date}-${index}`}
          wrap={false}
        >
          <Text style={pdfStyles.timelineDate}>{item.date || "Undated"}</Text>
          <View style={pdfStyles.timelineMarker} />
          <Text style={pdfStyles.timelineEvent}>
            {breakLongTokens(item.event)}
          </Text>
        </View>
      ))}
    </View>
  );
}
