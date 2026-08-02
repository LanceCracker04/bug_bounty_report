import { DEFAULT_CVSS_METRICS, type CvssMetrics, type CvssMode, type Severity } from "../../types/report";
import { calculateCvssBaseScore, createCvssVector, severityFromCvss } from "../../utils/cvss";

interface CvssCalculatorProps {
  mode: CvssMode;
  metrics: CvssMetrics;
  score: string;
  vector: string;
  severity: Severity;
  severityOverridden: boolean;
  error?: string;
  onChange: (change: { mode?: CvssMode; metrics?: CvssMetrics; score?: string; vector?: string; severity?: Severity; severityOverridden?: boolean }) => void;
}

interface MetricSelectProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function MetricSelect<T extends string>({ label, value, options, onChange }: MetricSelectProps<T>) {
  return <label className="field-group"><span>{label}</span><select className="input-field" value={value} onChange={(event) => onChange(event.target.value as T)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function CvssCalculator({ mode, metrics, score, vector, severity, severityOverridden, error, onChange }: CvssCalculatorProps) {
  const calculatedScore = calculateCvssBaseScore(metrics);
  const calculatedSeverity = severityFromCvss(calculatedScore);
  const updateMetric = <K extends keyof CvssMetrics>(key: K, value: CvssMetrics[K]) => {
    const nextMetrics = { ...metrics, [key]: value };
    const nextScore = calculateCvssBaseScore(nextMetrics);
    onChange({ metrics: nextMetrics, score: nextScore.toFixed(1), vector: createCvssVector(nextMetrics), severity: severityOverridden ? undefined : severityFromCvss(nextScore) });
  };

  const setMode = (nextMode: CvssMode) => {
    const nextScore = calculateCvssBaseScore(metrics);
    onChange(nextMode === "calculated" ? { mode: nextMode, score: nextScore.toFixed(1), vector: createCvssVector(metrics), severity: severityOverridden ? undefined : severityFromCvss(nextScore) } : { mode: nextMode });
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-[#0d1014] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div><h3 className="font-medium text-slate-200">CVSS 3.1 Base Score</h3><p className="mt-1 text-xs text-slate-500">Use calculated metrics or provide a verified manual score.</p></div>
        <div className="flex rounded-md border border-slate-700 p-0.5 text-xs"><button className={`rounded px-3 py-1.5 ${mode === "calculated" ? "bg-cyan-900 text-cyan-100" : "text-slate-400"}`} type="button" onClick={() => setMode("calculated")}>Calculated</button><button className={`rounded px-3 py-1.5 ${mode === "manual" ? "bg-cyan-900 text-cyan-100" : "text-slate-400"}`} type="button" onClick={() => setMode("manual")}>Manual</button></div>
      </div>
      {mode === "calculated" ? <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricSelect label="Attack Vector" value={metrics.attackVector} onChange={(value) => updateMetric("attackVector", value)} options={[{ value: "N", label: "Network" }, { value: "A", label: "Adjacent" }, { value: "L", label: "Local" }, { value: "P", label: "Physical" }]} />
          <MetricSelect label="Attack Complexity" value={metrics.attackComplexity} onChange={(value) => updateMetric("attackComplexity", value)} options={[{ value: "L", label: "Low" }, { value: "H", label: "High" }]} />
          <MetricSelect label="Privileges Required" value={metrics.privilegesRequired} onChange={(value) => updateMetric("privilegesRequired", value)} options={[{ value: "N", label: "None" }, { value: "L", label: "Low" }, { value: "H", label: "High" }]} />
          <MetricSelect label="User Interaction" value={metrics.userInteraction} onChange={(value) => updateMetric("userInteraction", value)} options={[{ value: "N", label: "None" }, { value: "R", label: "Required" }]} />
          <MetricSelect label="Scope" value={metrics.scope} onChange={(value) => updateMetric("scope", value)} options={[{ value: "U", label: "Unchanged" }, { value: "C", label: "Changed" }]} />
          <MetricSelect label="Confidentiality" value={metrics.confidentiality} onChange={(value) => updateMetric("confidentiality", value)} options={[{ value: "N", label: "None" }, { value: "L", label: "Low" }, { value: "H", label: "High" }]} />
          <MetricSelect label="Integrity" value={metrics.integrity} onChange={(value) => updateMetric("integrity", value)} options={[{ value: "N", label: "None" }, { value: "L", label: "Low" }, { value: "H", label: "High" }]} />
          <MetricSelect label="Availability" value={metrics.availability} onChange={(value) => updateMetric("availability", value)} options={[{ value: "N", label: "None" }, { value: "L", label: "Low" }, { value: "H", label: "High" }]} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2"><span className="text-2xl font-semibold text-slate-100">{calculatedScore.toFixed(1)}</span><span className="badge border-slate-700 bg-slate-800 text-slate-200">{calculatedSeverity}</span><code className="ml-auto break-all text-xs text-slate-500">{createCvssVector(metrics)}</code></div>
      </> : <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-group"><span>Manual CVSS Score</span><input className={`input-field ${error ? "input-error" : ""}`} type="number" min="0" max="10" step="0.1" value={score} onChange={(event) => { const nextScore = event.target.value; const number = Number(nextScore); onChange({ score: nextScore, severity: nextScore && !Number.isNaN(number) && number >= 0 && number <= 10 && !severityOverridden ? severityFromCvss(number) : undefined }); }} placeholder="0.0–10.0" />{error && <small className="text-xs text-red-400">{error}</small>}</label><label className="field-group"><span>CVSS Vector (optional)</span><input className="input-field" value={vector} onChange={(event) => onChange({ vector: event.target.value })} placeholder="CVSS:3.1/..." /></label></div>}
      <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Current severity: <strong className="font-medium text-slate-300">{severity}</strong>{severityOverridden && " (overridden)"}</p><button className="button-secondary px-3 py-1.5 text-xs" type="button" onClick={() => onChange({ mode: "calculated", metrics: { ...DEFAULT_CVSS_METRICS }, score: "0.0", vector: createCvssVector(DEFAULT_CVSS_METRICS), severity: "Informational", severityOverridden: false })}>Reset calculator</button></div>
    </section>
  );
}
