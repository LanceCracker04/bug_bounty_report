interface TopbarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewReport: () => void;
}

export function Topbar({ title, searchQuery, onSearchChange, onNewReport }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-[#0b0d10]/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <h1 className="mr-auto text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">{title}</h1>
        <label className="relative hidden min-w-64 lg:block">
          <span className="sr-only">Search reports</span>
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-500" aria-hidden="true">⌕</span>
          <input className="input-field h-9 w-full pl-8 text-sm" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search reports..." />
        </label>
        <button className="button-primary h-9 whitespace-nowrap" type="button" onClick={onNewReport}>
          <span aria-hidden="true">+</span> New Report
        </button>
      </div>
      <div className="border-t border-slate-800 px-4 py-2 lg:hidden">
        <label className="relative block">
          <span className="sr-only">Search reports</span>
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-500" aria-hidden="true">⌕</span>
          <input className="input-field h-9 w-full pl-8 text-sm" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search reports..." />
        </label>
      </div>
    </header>
  );
}
