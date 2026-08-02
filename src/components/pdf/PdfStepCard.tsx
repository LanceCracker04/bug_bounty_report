import { Text, View } from "@react-pdf/renderer";
import type { SanitizedPdfStep } from "../../types/pdf";
import { breakLongTokens, pdfStyles } from "./pdfStyles";

export function PdfStepCard({ step, index }: { step: SanitizedPdfStep; index: number }) {
  const canKeepTogether = [step.title, step.instruction, step.expectedResult, step.observedResult].join(" ").length < 1700;
  return <View style={pdfStyles.stepCard} wrap={!canKeepTogether}>
    <Text style={pdfStyles.stepEyebrow}>STEP {String(index + 1).padStart(2, "0")}</Text>
    <Text style={pdfStyles.stepTitle}>{breakLongTokens(step.title)}</Text>
    <Text style={pdfStyles.fieldLabel}>Instruction</Text>
    <Text style={pdfStyles.fieldValue}>{breakLongTokens(step.instruction)}</Text>
    {step.expectedResult && <View style={pdfStyles.expectedBlock}><Text style={pdfStyles.fieldLabel}>Expected Result</Text><Text style={pdfStyles.fieldValue}>{breakLongTokens(step.expectedResult)}</Text></View>}
    {step.observedResult && <View style={pdfStyles.observedBlock}><Text style={pdfStyles.fieldLabel}>Observed Result</Text><Text style={pdfStyles.fieldValue}>{breakLongTokens(step.observedResult)}</Text></View>}
  </View>;
}
