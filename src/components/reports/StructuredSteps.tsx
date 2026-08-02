import type { EvidenceItem, ReproductionStep } from "../../types/report";
import { generateReportId } from "../../utils/reportHelpers";

interface StructuredStepsProps {
  steps: ReproductionStep[];
  evidenceItems: EvidenceItem[];
  plainText: string;
  onChange: (steps: ReproductionStep[]) => void;
}

const emptyStep = (): ReproductionStep => ({ id: generateReportId(), title: "", instruction: "", expectedResult: "", actualResult: "", evidenceIds: [] });

export function StructuredSteps({ steps, evidenceItems, plainText, onChange }: StructuredStepsProps) {
  const updateStep = (id: string, change: Partial<ReproductionStep>) => onChange(steps.map((step) => step.id === id ? { ...step, ...change } : step));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const reordered = [...steps];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onChange(reordered);
  };
  const convertPlainText = () => {
    const chunks = plainText.split(/\n+/).map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim()).filter(Boolean);
    onChange(chunks.map((instruction) => ({ ...emptyStep(), instruction })));
  };

  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium text-slate-200">Structured Steps to Reproduce</h3><p className="mt-1 text-xs text-slate-500">Ordered, reviewable reproduction instructions with attached evidence.</p></div><div className="flex gap-2"><button className="button-secondary px-3 py-1.5 text-xs" type="button" disabled={!plainText.trim()} onClick={convertPlainText}>Convert to Structured Steps</button><button className="button-primary px-3 py-1.5 text-xs" type="button" onClick={() => onChange([...steps, emptyStep()])}>+ Add Step</button></div></div>
    {steps.length === 0 ? <p className="rounded-md border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-500">No structured steps yet. Add one, or convert the legacy plain-text steps above.</p> : <ol className="space-y-4">{steps.map((step, index) => <li className="rounded-lg border border-slate-800 bg-[#0d1014] p-4" key={step.id}><div className="mb-3 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-900 bg-cyan-950/60 text-xs font-semibold text-cyan-300">{index + 1}</span><input className="input-field flex-1" value={step.title} onChange={(event) => updateStep(step.id, { title: event.target.value })} placeholder="Optional step title" aria-label={`Title for step ${index + 1}`} /><button className="table-action" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move step ${index + 1} up`}>↑</button><button className="table-action" type="button" disabled={index === steps.length - 1} onClick={() => move(index, 1)} aria-label={`Move step ${index + 1} down`}>↓</button><button className="table-action-danger" type="button" onClick={() => onChange(steps.filter((item) => item.id !== step.id))} aria-label={`Delete step ${index + 1}`}>Delete</button></div><div className="grid gap-3 lg:grid-cols-3"><label className="field-group lg:col-span-3"><span>Instructions</span><textarea className="input-field min-h-24 resize-y" value={step.instruction} onChange={(event) => updateStep(step.id, { instruction: event.target.value })} placeholder="Describe the action to take and what to observe." /></label><label className="field-group"><span>Expected Result</span><textarea className="input-field min-h-20 resize-y" value={step.expectedResult ?? ""} onChange={(event) => updateStep(step.id, { expectedResult: event.target.value })} /></label><label className="field-group"><span>Actual Result</span><textarea className="input-field min-h-20 resize-y" value={step.actualResult ?? ""} onChange={(event) => updateStep(step.id, { actualResult: event.target.value })} /></label><fieldset className="field-group"><legend>Attach evidence</legend><div className="max-h-22 overflow-y-auto rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1.5">{evidenceItems.length ? evidenceItems.map((evidence) => <label className="flex items-center gap-2 py-1 text-xs normal-case tracking-normal text-slate-400" key={evidence.id}><input type="checkbox" checked={step.evidenceIds.includes(evidence.id)} onChange={(event) => updateStep(step.id, { evidenceIds: event.target.checked ? [...step.evidenceIds, evidence.id] : step.evidenceIds.filter((id) => id !== evidence.id) })} />{evidence.title}</label>) : <span className="text-xs normal-case tracking-normal text-slate-600">Add evidence below to attach it.</span>}</div></fieldset></div></li>)}</ol>}
  </section>;
}
