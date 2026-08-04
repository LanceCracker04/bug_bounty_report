import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-[#101318] px-6 text-center">
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-lg text-slate-400"
        aria-hidden="true"
      >
        ⌁
      </div>
      <h2 className="text-base font-semibold text-slate-200">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
