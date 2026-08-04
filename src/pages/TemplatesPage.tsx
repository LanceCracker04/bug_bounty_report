import { useEffect, useMemo, useRef, useState } from "react";
import { BUILT_IN_TEMPLATES } from "../components/templates/builtInTemplates";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import type { KnowledgeEntry } from "../types/knowledge";
import type { Report } from "../types/report";
import type {
  ReportTemplate,
  TemplateDifficulty,
  TemplateExample,
  TemplateSectionPrompts,
} from "../types/template";
import type { TemplatePreference } from "../utils/templatePreferences";
import { preferenceFor } from "../utils/templatePreferences";
import { generateReportId } from "../utils/reportHelpers";

interface TemplatesPageProps {
  customTemplates: ReportTemplate[];
  preferences: TemplatePreference[];
  reports: Report[];
  knowledgeEntries: KnowledgeEntry[];
  onUseBlank: (template: ReportTemplate) => void;
  onUseExample: (template: ReportTemplate) => void;
  onSaveCustom: (template: ReportTemplate) => void;
  onDeleteCustom: (template: ReportTemplate) => void;
  onUpdatePreference: (
    templateId: string,
    change: Partial<TemplatePreference>,
  ) => void;
  onUseKnowledge: (entry: KnowledgeEntry) => void;
  onOpenKnowledge: () => void;
}

const categories = [
  "Access Control",
  "Authentication",
  "Session Management",
  "Injection",
  "API Security",
  "Business Logic",
  "Information Disclosure",
  "Configuration",
  "File Handling",
  "Client-Side",
  "Request Integrity",
  "Mobile",
  "General",
];
const difficulties: Array<TemplateDifficulty | "all"> = [
  "all",
  "Beginner",
  "Intermediate",
  "Advanced",
];
const asList = (items?: string[]) => items ?? [];
const sectionPrompts = (template: ReportTemplate): TemplateSectionPrompts =>
  template.sectionPrompts ?? {
    summary: template.summaryPrompt,
    description: template.descriptionPrompt,
    impact: template.impactPrompt,
    remediation: template.remediationPrompt,
  };
const initialTemplate = (): ReportTemplate => ({
  id: generateReportId(),
  name: "",
  isBuiltIn: false,
  builtIn: false,
  category: "General",
  shortDescription: "",
  difficulty: "Beginner",
  tags: [],
  vulnerabilityType: "",
  vulnerabilityClass: "",
  sectionPrompts: {},
  evidenceChecklist: [],
  questionsToAnswer: [],
  commonMistakes: [],
  summaryPrompt: "",
  descriptionPrompt: "",
  impactPrompt: "",
  remediationPrompt: "",
  reproductionSteps: [],
});

function relatedKnowledge(
  template: ReportTemplate,
  entries: KnowledgeEntry[],
): KnowledgeEntry[] {
  const needle =
    `${template.name} ${template.vulnerabilityType} ${template.vulnerabilityClass}`.toLowerCase();
  return entries
    .filter(
      (entry) =>
        (template.relatedKnowledgeIds ?? []).includes(entry.id) ||
        needle.includes(entry.name.toLowerCase()) ||
        needle.includes(entry.category.toLowerCase()) ||
        entry.tags.some((tag) => needle.includes(tag.toLowerCase())),
    )
    .slice(0, 4);
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const update = (index: number, value: string) =>
    onChange(
      items.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-200">{label}</legend>
      {items.map((item, index) => (
        <div className="flex gap-2" key={`${label}-${index}`}>
          <input
            className="input-field"
            value={item}
            onChange={(event) => update(index, event.target.value)}
            aria-label={`${label} item ${index + 1}`}
          />
          <button
            className="table-action"
            type="button"
            onClick={() => move(index, -1)}
            disabled={index === 0}
            aria-label={`Move ${label} item ${index + 1} up`}
          >
            ↑
          </button>
          <button
            className="table-action"
            type="button"
            onClick={() => move(index, 1)}
            disabled={index === items.length - 1}
            aria-label={`Move ${label} item ${index + 1} down`}
          >
            ↓
          </button>
          <button
            className="table-action-danger"
            type="button"
            onClick={() =>
              onChange(items.filter((_, itemIndex) => itemIndex !== index))
            }
            aria-label={`Remove ${label} item ${index + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="button-secondary px-3 py-1.5 text-xs"
        type="button"
        onClick={() => onChange([...items, placeholder])}
      >
        + Add item
      </button>
    </fieldset>
  );
}

function sanitizeExampleText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s)]+/gi, "[CONTROLLED_URL]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(
      /(bearer|token|session|cookie)\s*[:=]\s*[^\s,;]+/gi,
      "$1: [REDACTED_TOKEN]",
    );
}

function TemplateEditor({
  template,
  reports,
  onSave,
  onCancel,
}: {
  template: ReportTemplate;
  reports: Report[];
  onSave: (template: ReportTemplate) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(template));
  const [sourceReportId, setSourceReportId] = useState("");
  const prompts = sectionPrompts(draft);
  const updatePrompts = (change: Partial<TemplateSectionPrompts>) =>
    setDraft((current) => ({
      ...current,
      sectionPrompts: { ...sectionPrompts(current), ...change },
      summaryPrompt: change.summary ?? current.summaryPrompt,
      descriptionPrompt: change.description ?? current.descriptionPrompt,
      impactPrompt: change.impact ?? current.impactPrompt,
      remediationPrompt: change.remediation ?? current.remediationPrompt,
    }));
  const createExample = () => {
    const source = reports.find((report) => report.id === sourceReportId);
    if (!source) return;
    const example: TemplateExample = {
      title:
        sanitizeExampleText(source.title).replace(/^\[EXAMPLE\]\s*/i, "") ||
        "Fictional example finding",
      programName: "Fictional Training Program",
      platform: "Other",
      target: "https://app.example.test",
      vulnerableEndpoint: source.vulnerableEndpoint
        ? "/[REDACTED_ENDPOINT]"
        : undefined,
      affectedAsset: source.affectedAsset
        ? "Fictional training asset"
        : undefined,
      vulnerabilityType: source.vulnerabilityType || draft.vulnerabilityType,
      vulnerabilityClass: source.vulnerabilityClass || draft.vulnerabilityClass,
      severity: source.severity,
      cvssScore: Number(source.cvssScore) || undefined,
      cvssVector: source.cvssVector,
      summary: sanitizeExampleText(source.summary),
      description: sanitizeExampleText(source.description),
      prerequisites: sanitizeExampleText(source.prerequisites),
      structuredSteps: source.structuredSteps.map((step, index) => ({
        ...step,
        id: `example-step-${index + 1}`,
        title: sanitizeExampleText(step.title),
        instruction: sanitizeExampleText(step.instruction),
        expectedResult: sanitizeExampleText(step.expectedResult ?? ""),
        actualResult: sanitizeExampleText(step.actualResult ?? ""),
        evidenceIds: [],
      })),
      impact: sanitizeExampleText(source.impact),
      remediation: sanitizeExampleText(source.remediation),
      evidenceSuggestions: source.evidenceItems
        .map(
          (item, index) =>
            `Redacted evidence item ${index + 1}: ${sanitizeExampleText(item.title)}`,
        )
        .slice(0, 5),
    };
    setDraft((current) => ({ ...current, example }));
  };
  const submit = () => {
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      ...draft,
      name: draft.name.trim(),
      isBuiltIn: false,
      builtIn: false,
      category: draft.category || "General",
      difficulty: draft.difficulty ?? "Beginner",
      tags: asList(draft.tags),
      evidenceChecklist: asList(draft.evidenceChecklist),
      questionsToAnswer: asList(draft.questionsToAnswer),
      commonMistakes: asList(draft.commonMistakes),
      sectionPrompts: prompts,
      summaryPrompt: prompts.summary ?? "",
      descriptionPrompt: prompts.description ?? "",
      impactPrompt: prompts.impact ?? "",
      remediationPrompt: prompts.remediation ?? "",
      updatedAt: now,
      createdAt: draft.createdAt ?? now,
    });
  };
  return (
    <form
      className="rounded-lg border border-cyan-900/70 bg-[#101318] p-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-100">
            {template.createdAt
              ? "Edit custom template"
              : "Create custom template"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Everything stays local. Examples must be reviewed for private
            details before you save them.
          </p>
        </div>
        <button className="table-action" type="button" onClick={onCancel}>
          Close
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field-group">
          <span>Template name</span>
          <input
            className="input-field"
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            required
          />
        </label>
        <label className="field-group">
          <span>Category</span>
          <select
            className="input-field"
            value={draft.category ?? "General"}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value })
            }
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="field-group">
          <span>Difficulty</span>
          <select
            className="input-field"
            value={draft.difficulty ?? "Beginner"}
            onChange={(event) =>
              setDraft({
                ...draft,
                difficulty: event.target.value as TemplateDifficulty,
              })
            }
          >
            {difficulties.slice(1).map((difficulty) => (
              <option key={difficulty}>{difficulty}</option>
            ))}
          </select>
        </label>
        <label className="field-group">
          <span>Tags, separated by commas</span>
          <input
            className="input-field"
            value={asList(draft.tags).join(", ")}
            onChange={(event) =>
              setDraft({
                ...draft,
                tags: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label className="field-group">
          <span>Vulnerability type</span>
          <input
            className="input-field"
            value={draft.vulnerabilityType}
            onChange={(event) =>
              setDraft({ ...draft, vulnerabilityType: event.target.value })
            }
          />
        </label>
        <label className="field-group">
          <span>Vulnerability class</span>
          <input
            className="input-field"
            value={draft.vulnerabilityClass}
            onChange={(event) =>
              setDraft({ ...draft, vulnerabilityClass: event.target.value })
            }
          />
        </label>
        <label className="field-group md:col-span-2">
          <span>Short description</span>
          <textarea
            className="input-field min-h-20 resize-y"
            value={draft.shortDescription ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, shortDescription: event.target.value })
            }
          />
        </label>
      </div>
      <section className="mt-6">
        <h3 className="font-medium text-slate-200">Writing prompts</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(
            [
              "title",
              "summary",
              "description",
              "prerequisites",
              "reproduction",
              "impact",
              "remediation",
            ] as const
          ).map((field) => (
            <label className="field-group" key={field}>
              <span className="capitalize">
                {field === "reproduction" ? "Reproduction steps" : field}
              </span>
              <textarea
                className="input-field min-h-18 resize-y"
                value={prompts[field] ?? ""}
                onChange={(event) =>
                  updatePrompts({ [field]: event.target.value })
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <ListEditor
          label="Evidence checklist"
          items={asList(draft.evidenceChecklist)}
          onChange={(evidenceChecklist) =>
            setDraft({ ...draft, evidenceChecklist })
          }
          placeholder="Describe one redacted evidence item"
        />
        <ListEditor
          label="Questions to answer"
          items={asList(draft.questionsToAnswer)}
          onChange={(questionsToAnswer) =>
            setDraft({ ...draft, questionsToAnswer })
          }
          placeholder="What should the report establish?"
        />
        <ListEditor
          label="Common mistakes"
          items={asList(draft.commonMistakes)}
          onChange={(commonMistakes) => setDraft({ ...draft, commonMistakes })}
          placeholder="Describe a reporting pitfall"
        />
      </section>
      <section className="mt-6 rounded border border-slate-800 bg-[#0d1014] p-4">
        <h3 className="font-medium text-slate-200">
          Optional example from an existing report
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          No evidence binaries, submission IDs, analyst names, bounty amounts,
          communication history, or direct target URLs are copied. The basic
          replacement is not a guarantee that text is safe—review every field
          before saving.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="input-field max-w-xl"
            value={sourceReportId}
            onChange={(event) => setSourceReportId(event.target.value)}
          >
            <option value="">Select a report to sanitize</option>
            {reports.map((report) => (
              <option key={report.id} value={report.id}>
                {report.reportReference} · {report.title}
              </option>
            ))}
          </select>
          <button
            className="button-secondary"
            type="button"
            disabled={!sourceReportId}
            onClick={createExample}
          >
            Create sanitized example
          </button>
          {draft.example && (
            <button
              className="table-action-danger"
              type="button"
              onClick={() => setDraft({ ...draft, example: undefined })}
            >
              Remove example
            </button>
          )}
        </div>
      </section>
      <div className="mt-5 flex justify-end gap-3">
        <button className="button-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="button-primary"
          type="submit"
          disabled={!draft.name.trim()}
        >
          Save Template
        </button>
      </div>
    </form>
  );
}

type PreviewTab =
  "overview" | "guide" | "example" | "evidence" | "questions" | "mistakes";
const previewTabs: Array<[PreviewTab, string]> = [
  ["overview", "Overview"],
  ["guide", "Writing Guide"],
  ["example", "Example Report"],
  ["evidence", "Evidence Checklist"],
  ["questions", "Questions to Answer"],
  ["mistakes", "Common Mistakes"],
];

function TemplatePreview({
  template,
  knowledge,
  onClose,
  onUseBlank,
  onUseExample,
  onUseKnowledge,
  onOpenKnowledge,
}: {
  template: ReportTemplate;
  knowledge: KnowledgeEntry[];
  onClose: () => void;
  onUseBlank: () => void;
  onUseExample: () => void;
  onUseKnowledge: (entry: KnowledgeEntry) => void;
  onOpenKnowledge: () => void;
}) {
  const [tab, setTab] = useState<PreviewTab>("overview");
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const example = template.example;
  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();
    return () => previousFocus.current?.focus();
  }, []);
  const trapFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled])",
      ),
    ];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const prompts = sectionPrompts(template);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-700 bg-[#161a20] p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2
              id="template-preview-title"
              className="text-lg font-semibold text-slate-100"
            >
              {template.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {template.category} · {template.difficulty} ·{" "}
              {template.vulnerabilityType || "General"}
            </p>
          </div>
          <button
            ref={closeRef}
            className="button-secondary"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div
          className="mt-5 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Template preview sections"
        >
          {previewTabs.map(([id, label]) => (
            <button
              className={`rounded px-3 py-1.5 text-sm ${tab === id ? "bg-cyan-900 text-cyan-50" : "bg-slate-800 text-slate-300"}`}
              id={`template-tab-${id}`}
              type="button"
              role="tab"
              aria-controls={`template-panel-${id}`}
              aria-selected={tab === id}
              key={id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          id={`template-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`template-tab-${tab}`}
          className="mt-5"
        >
          {tab === "overview" && (
            <div className="space-y-4">
              <p className="text-slate-300">{template.shortDescription}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase text-slate-500">Category</dt>
                  <dd>{template.category}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Difficulty
                  </dt>
                  <dd>{template.difficulty}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Tags</dt>
                  <dd>{asList(template.tags).join(", ") || "None"}</dd>
                </div>
              </dl>
              {knowledge.length > 0 ? (
                <section className="rounded border border-slate-800 bg-[#0d1014] p-4">
                  <h3 className="font-medium text-slate-200">
                    Related Knowledge Base guidance
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Knowledge guidance helps with documentation; it does not
                    confirm a vulnerability.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {knowledge.map((entry) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        key={entry.id}
                      >
                        <span>
                          {entry.name}{" "}
                          <span className="text-slate-500">
                            ({entry.category})
                          </span>
                        </span>
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => onUseKnowledge(entry)}
                        >
                          Use Knowledge Guidance
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    className="mt-3 button-secondary px-3 py-1.5 text-xs"
                    type="button"
                    onClick={onOpenKnowledge}
                  >
                    Open Knowledge Entry
                  </button>
                </section>
              ) : (
                <p className="text-xs text-slate-500">
                  No matching Knowledge Base entry was found. You can create a
                  custom entry in the Knowledge Base.
                </p>
              )}
            </div>
          )}
          {tab === "guide" && (
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  "title",
                  "summary",
                  "description",
                  "prerequisites",
                  "reproduction",
                  "impact",
                  "remediation",
                ] as const
              ).map((field) => (
                <article
                  className="rounded border border-slate-800 bg-[#0d1014] p-3"
                  key={field}
                >
                  <h3 className="font-medium capitalize text-slate-200">
                    {field === "reproduction" ? "Reproduction steps" : field}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {prompts[field] || "No prompt provided."}
                  </p>
                </article>
              ))}
            </div>
          )}
          {tab === "example" &&
            (example ? (
              <article className="rounded border border-cyan-900 bg-slate-950 p-5">
                <p className="rounded border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-100">
                  Fictional educational example — replace all placeholder
                  details with your own authorized findings.
                </p>
                <h3 className="mt-5 text-xl font-semibold text-slate-100">
                  {example.title}
                </h3>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Target</dt>
                    <dd>{example.target}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">
                      Endpoint
                    </dt>
                    <dd>{example.vulnerableEndpoint}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">
                      Severity
                    </dt>
                    <dd>{example.severity}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">CVSS</dt>
                    <dd>{example.cvssScore ?? "Not included"}</dd>
                  </div>
                </dl>
                {[
                  ["Executive Summary", example.summary],
                  ["Technical Description", example.description],
                  ["Prerequisites", example.prerequisites],
                  ["Impact", example.impact],
                  ["Remediation", example.remediation],
                ].map(([label, value]) => (
                  <section className="mt-5" key={label}>
                    <h4 className="font-medium text-slate-200">{label}</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                      {value}
                    </p>
                  </section>
                ))}
                <section className="mt-5">
                  <h4 className="font-medium text-slate-200">
                    Structured reproduction steps
                  </h4>
                  <ol className="mt-3 space-y-3">
                    {example.structuredSteps.map((item, index) => (
                      <li
                        className="rounded border border-slate-800 p-3 text-sm"
                        key={item.id}
                      >
                        <p className="font-medium text-slate-200">
                          {index + 1}. {item.title}
                        </p>
                        <p className="mt-1 text-slate-400">
                          {item.instruction}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Expected: {item.expectedResult}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Actual: {item.actualResult}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              </article>
            ) : (
              <p className="text-sm text-slate-500">
                This template does not include a full example.
              </p>
            ))}
          {tab === "evidence" && (
            <div className="space-y-2">
              {asList(template.evidenceChecklist).map((item) => (
                <label
                  className="flex items-center gap-3 rounded border border-slate-800 bg-[#0d1014] p-3"
                  key={item}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(item)}
                    onChange={(event) =>
                      setChecked((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(item);
                        else next.delete(item);
                        return next;
                      })
                    }
                  />
                  {item}
                </label>
              ))}
              <p className="text-xs text-slate-500">
                These checklist marks are temporary and are not saved until you
                use the template.
              </p>
            </div>
          )}
          {tab === "questions" && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              {asList(template.questionsToAnswer).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )}
          {tab === "mistakes" && (
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
              {asList(template.commonMistakes).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            className="button-secondary"
            type="button"
            onClick={() =>
              void navigator.clipboard.writeText(
                asList(template.questionsToAnswer)
                  .map((item) => `- ${item}`)
                  .join("\n"),
              )
            }
          >
            Copy Questions to Report Notes
          </button>
          <button className="button-primary" type="button" onClick={onUseBlank}>
            Use Blank
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={!example}
            aria-describedby={!example ? "example-unavailable" : undefined}
            onClick={onUseExample}
          >
            Use Example
          </button>
          {!example && (
            <span id="example-unavailable" className="sr-only">
              No fictional example is available for this template.
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

export function TemplatesPage({
  customTemplates,
  preferences,
  reports,
  knowledgeEntries,
  onUseBlank,
  onUseExample,
  onSaveCustom,
  onDeleteCustom,
  onUpdatePreference,
  onUseKnowledge,
  onOpenKnowledge,
}: TemplatesPageProps) {
  const [preview, setPreview] = useState<ReportTemplate>();
  const [editing, setEditing] = useState<ReportTemplate>();
  const [deleting, setDeleting] = useState<ReportTemplate>();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState<TemplateDifficulty | "all">(
    "all",
  );
  const [scope, setScope] = useState<"all" | "built-in" | "custom">("all");
  const [hasExample, setHasExample] = useState<"all" | "yes">("all");
  const [classFilter, setClassFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const templates = useMemo(
    () =>
      [...BUILT_IN_TEMPLATES, ...customTemplates].map((template) => ({
        ...template,
        preference: preferenceFor(preferences, template.id),
      })),
    [customTemplates, preferences],
  );
  const classes = useMemo(
    () =>
      [
        ...new Set(
          templates
            .map((template) => template.vulnerabilityClass)
            .filter(Boolean),
        ),
      ].sort(),
    [templates],
  );
  const filtered = useMemo(
    () =>
      templates.filter(({ preference, ...template }) => {
        const query = search.trim().toLowerCase();
        const searchable =
          `${template.name} ${template.vulnerabilityType} ${template.vulnerabilityClass} ${template.category} ${asList(template.tags).join(" ")}`.toLowerCase();
        return (
          (!query || searchable.includes(query)) &&
          (category === "all" || template.category === category) &&
          (difficulty === "all" || template.difficulty === difficulty) &&
          (scope === "all" ||
            (scope === "built-in"
              ? template.isBuiltIn
              : !template.isBuiltIn)) &&
          (hasExample === "all" || Boolean(template.example)) &&
          (classFilter === "all" ||
            template.vulnerabilityClass === classFilter) &&
          (!favoritesOnly || preference.favorite)
        );
      }),
    [
      category,
      classFilter,
      difficulty,
      favoritesOnly,
      hasExample,
      scope,
      search,
      templates,
    ],
  );
  const recentlyUsed = templates
    .filter((template) => template.preference.lastUsedAt)
    .sort(
      (left, right) =>
        new Date(right.preference.lastUsedAt ?? 0).getTime() -
        new Date(left.preference.lastUsedAt ?? 0).getTime(),
    )
    .slice(0, 6);
  const markUsed = (template: ReportTemplate) =>
    onUpdatePreference(template.id, {
      usageCount: preferenceFor(preferences, template.id).usageCount + 1,
      lastUsedAt: new Date().toISOString(),
    });
  const useBlank = (template: ReportTemplate) => {
    markUsed(template);
    onUseBlank(template);
  };
  const useExample = (template: ReportTemplate) => {
    if (!template.example) return;
    markUsed(template);
    onUseExample(template);
  };
  const clear = () => {
    setSearch("");
    setCategory("all");
    setDifficulty("all");
    setScope("all");
    setHasExample("all");
    setClassFilter("all");
    setFavoritesOnly(false);
  };
  // Local action names describe the UI action; they are not React Hooks.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return (
    <div className="space-y-5">
      {editing && (
        <TemplateEditor
          template={editing}
          reports={reports}
          onSave={(template) => {
            onSaveCustom(template);
            setEditing(undefined);
          }}
          onCancel={() => setEditing(undefined)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            Start an authorized report with safe writing guidance, evidence
            prompts, and fictional educational examples.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Built-in definitions cannot be deleted; favorites and usage stay
            local.
          </p>
        </div>
        <button
          className="button-primary"
          type="button"
          onClick={() => setEditing(initialTemplate())}
        >
          + Create Custom Template
        </button>
      </div>
      <section className="grid gap-3 rounded-lg border border-slate-800 bg-[#101318] p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="field-group">
          <span>Search templates</span>
          <input
            className="input-field"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, tag, class"
          />
        </label>
        <label className="field-group">
          <span>Category</span>
          <select
            className="input-field"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field-group">
          <span>Difficulty</span>
          <select
            className="input-field"
            value={difficulty}
            onChange={(event) =>
              setDifficulty(event.target.value as TemplateDifficulty | "all")
            }
          >
            {difficulties.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All difficulties" : item}
              </option>
            ))}
          </select>
        </label>
        <label className="field-group">
          <span>Library</span>
          <select
            className="input-field"
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as "all" | "built-in" | "custom")
            }
          >
            <option value="all">Built-in and custom</option>
            <option value="built-in">Built-in only</option>
            <option value="custom">Custom only</option>
          </select>
        </label>
        <label className="field-group">
          <span>Example</span>
          <select
            className="input-field"
            value={hasExample}
            onChange={(event) =>
              setHasExample(event.target.value as "all" | "yes")
            }
          >
            <option value="all">Any example status</option>
            <option value="yes">Has full example</option>
          </select>
        </label>
        <label className="field-group">
          <span>Vulnerability class</span>
          <select
            className="input-field"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="all">All classes</option>
            {classes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />
          Favorites only
        </label>
        <div className="flex items-end">
          <button className="button-secondary" type="button" onClick={clear}>
            Clear Filters
          </button>
        </div>
      </section>
      {recentlyUsed.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-[#101318] p-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Recently Used
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentlyUsed.map((template) => (
              <button
                className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-cyan-700"
                type="button"
                key={template.id}
                onClick={() => setPreview(template)}
              >
                {template.name} · {template.preference.usageCount} uses
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="text-sm text-slate-400">
        {filtered.length} matching template{filtered.length === 1 ? "" : "s"}
      </p>
      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ preference, ...template }) => (
            <article
              className="rounded-lg border border-slate-800 bg-[#101318] p-5"
              key={template.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-100">
                    {template.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {template.vulnerabilityType || "General report structure"}
                  </p>
                </div>
                <button
                  className="text-lg text-amber-300"
                  type="button"
                  aria-label={`${preference.favorite ? "Remove" : "Add"} ${template.name} ${preference.favorite ? "from" : "to"} favorites`}
                  onClick={() =>
                    onUpdatePreference(template.id, {
                      favorite: !preference.favorite,
                    })
                  }
                >
                  {preference.favorite ? "★" : "☆"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <span className="badge border-slate-700 bg-slate-800 text-slate-300">
                  {template.isBuiltIn ? "Built-in" : "Custom"}
                </span>
                <span className="badge border-cyan-900 bg-cyan-950/50 text-cyan-200">
                  {template.category}
                </span>
                <span className="badge border-violet-900 bg-violet-950/40 text-violet-200">
                  {template.difficulty}
                </span>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                {template.shortDescription || template.descriptionPrompt}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {template.example?.structuredSteps.length ?? 0} example steps ·{" "}
                {asList(template.evidenceChecklist).length} evidence items ·{" "}
                {template.example ? "Full example included" : "No full example"}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="button-primary px-3 py-1.5 text-xs"
                  type="button"
                  aria-label={`Use blank ${template.name} template`}
                  onClick={() => useBlank(template)}
                >
                  Use Blank
                </button>
                <button
                  className="button-secondary px-3 py-1.5 text-xs"
                  type="button"
                  aria-label={`Use example ${template.name} template`}
                  disabled={!template.example}
                  title={
                    !template.example
                      ? "No fictional example is available"
                      : undefined
                  }
                  onClick={() => useExample(template)}
                >
                  Use Example
                </button>
                <button
                  className="button-secondary px-3 py-1.5 text-xs"
                  type="button"
                  onClick={() => setPreview(template)}
                >
                  Preview
                </button>
                <button
                  className="button-secondary px-3 py-1.5 text-xs"
                  type="button"
                  onClick={() =>
                    onSaveCustom({
                      ...template,
                      id: generateReportId(),
                      name: `Copy of ${template.name}`,
                      isBuiltIn: false,
                      builtIn: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                >
                  Duplicate
                </button>
                {!template.isBuiltIn && (
                  <>
                    <button
                      className="table-action"
                      type="button"
                      onClick={() => setEditing(template)}
                    >
                      Edit
                    </button>
                    <button
                      className="table-action-danger"
                      type="button"
                      onClick={() => setDeleting(template)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates match"
          description="Clear filters or create a custom template."
          action={
            <button className="button-secondary" type="button" onClick={clear}>
              Clear Filters
            </button>
          }
        />
      )}
      {preview && (
        <TemplatePreview
          template={preview}
          knowledge={relatedKnowledge(preview, knowledgeEntries)}
          onClose={() => setPreview(undefined)}
          onUseBlank={() => {
            useBlank(preview);
            setPreview(undefined);
          }}
          onUseExample={() => {
            useExample(preview);
            setPreview(undefined);
          }}
          onUseKnowledge={(entry) => {
            onUseKnowledge(entry);
            setPreview(undefined);
          }}
          onOpenKnowledge={() => {
            setPreview(undefined);
            onOpenKnowledge();
          }}
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete custom template?"
        description={`This will permanently remove “${deleting?.name ?? "this template"}” from this browser.`}
        confirmLabel="Delete Template"
        onConfirm={() => {
          if (deleting) onDeleteCustom(deleting);
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
