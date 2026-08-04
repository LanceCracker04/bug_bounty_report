import { useState } from "react";
import type {
  ProgramPlatform,
  ProgramProfile,
  ScopeDisposition,
  ScopeRule,
  ScopeRuleType,
} from "../types/program";
import { generateReportId } from "../utils/reportHelpers";
const platforms: ProgramPlatform[] = [
  "HackerOne",
  "Bugcrowd",
  "Intigriti",
  "YesWeHack",
  "Private Program",
  "Direct Disclosure",
  "Other",
];
const blank = (): ProgramProfile => ({
  id: generateReportId(),
  name: "",
  platform: "Other",
  scopeRules: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
export function ProgramsPage({
  programs,
  reports,
  onSave,
  onDelete,
}: {
  programs: ProgramProfile[];
  reports: Array<{ programProfileId?: string }>;
  onSave: (program: ProgramProfile) => void;
  onDelete: (program: ProgramProfile) => void;
}) {
  const [editing, setEditing] = useState<ProgramProfile>();
  const [search, setSearch] = useState("");
  const visible = programs.filter(
    (program) =>
      !program.archivedAt &&
      program.name.toLowerCase().includes(search.toLowerCase()),
  );
  const updateRule = (id: string, change: Partial<ScopeRule>) =>
    editing &&
    setEditing({
      ...editing,
      scopeRules: editing.scopeRules.map((rule) =>
        rule.id === id ? { ...rule, ...change } : rule,
      ),
    });
  const addRule = () =>
    editing &&
    setEditing({
      ...editing,
      scopeRules: [
        ...editing.scopeRules,
        {
          id: generateReportId(),
          type: "Exact Domain",
          value: "",
          disposition: "In Scope",
        },
      ],
    });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="field-group min-w-64 flex-1">
          <span>Search programs</span>
          <input
            className="input-field"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button
          className="button-primary"
          type="button"
          onClick={() => setEditing(blank())}
        >
          + Create Program
        </button>
      </div>
      {editing && (
        <section className="editor-section">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-group">
              <span>Program name</span>
              <input
                className="input-field"
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
              />
            </label>
            <label className="field-group">
              <span>Platform</span>
              <select
                className="input-field"
                value={editing.platform}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    platform: event.target.value as ProgramPlatform,
                  })
                }
              >
                {platforms.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Policy URL</span>
              <input
                className="input-field"
                type="url"
                value={editing.policyUrl ?? ""}
                onChange={(event) =>
                  setEditing({ ...editing, policyUrl: event.target.value })
                }
              />
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">Scope Rules</h2>
            <button
              className="button-secondary"
              type="button"
              onClick={addRule}
            >
              + Add Rule
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {editing.scopeRules.map((rule) => (
              <div
                className="grid gap-2 rounded border border-slate-800 bg-[#0d1014] p-3 md:grid-cols-[1fr_1fr_1fr_2fr_auto]"
                key={rule.id}
              >
                <select
                  className="input-field"
                  value={rule.disposition}
                  onChange={(event) =>
                    updateRule(rule.id, {
                      disposition: event.target.value as ScopeDisposition,
                    })
                  }
                >
                  <option>In Scope</option>
                  <option>Out of Scope</option>
                  <option>Conditional</option>
                  <option>Unknown</option>
                </select>
                <select
                  className="input-field"
                  value={rule.type}
                  onChange={(event) =>
                    updateRule(rule.id, {
                      type: event.target.value as ScopeRuleType,
                    })
                  }
                >
                  <option>Exact Domain</option>
                  <option>Wildcard Domain</option>
                  <option>Exact URL</option>
                  <option>URL Prefix</option>
                  <option>API Host</option>
                  <option>Other</option>
                </select>
                <input
                  className="input-field"
                  value={rule.value}
                  onChange={(event) =>
                    updateRule(rule.id, { value: event.target.value })
                  }
                  placeholder="example.com"
                />
                <input
                  className="input-field"
                  value={rule.conditions ?? ""}
                  onChange={(event) =>
                    updateRule(rule.id, { conditions: event.target.value })
                  }
                  placeholder="Conditions or notes"
                />
                <button
                  className="table-action-danger"
                  type="button"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      scopeRules: editing.scopeRules.filter(
                        (item) => item.id !== rule.id,
                      ),
                    })
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="button-secondary"
              type="button"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              type="button"
              disabled={!editing.name.trim()}
              onClick={() => {
                onSave({ ...editing, updatedAt: new Date().toISOString() });
                setEditing(undefined);
              }}
            >
              Save Program
            </button>
          </div>
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((program) => (
          <article
            className="rounded-lg border border-slate-800 bg-[#101318] p-5"
            key={program.id}
          >
            <h2 className="font-semibold text-slate-100">{program.name}</h2>
            <p className="mt-1 text-xs uppercase text-slate-500">
              {program.platform} · {program.scopeRules.length} scope rules
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {
                reports.filter(
                  (report) => report.programProfileId === program.id,
                ).length
              }{" "}
              linked report(s)
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setEditing(program)}
              >
                Edit
              </button>
              <button
                className="table-action"
                type="button"
                onClick={() =>
                  onSave({
                    ...program,
                    archivedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                Archive
              </button>
              <button
                className="table-action-danger"
                type="button"
                onClick={() => onDelete(program)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <p className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          No active programs yet.
        </p>
      )}
    </div>
  );
}
