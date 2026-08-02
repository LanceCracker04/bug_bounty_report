import type { AppPage, NavigableAppPage } from "../../App";

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: NavigableAppPage) => void;
}

const navigation: Array<{ id: NavigableAppPage; label: string; symbol: string }> = [
  { id: "dashboard", label: "Dashboard", symbol: "▦" },
  { id: "reports", label: "Reports", symbol: "≡" },
  { id: "programs", label: "Programs", symbol: "◎" },
  { id: "submissions", label: "Submissions", symbol: "↗" },
  { id: "retests", label: "Retests", symbol: "↻" },
  { id: "families", label: "Finding Families", symbol: "⌘" },
  { id: "communications", label: "Communications", symbol: "✉" },
  { id: "sanitized", label: "Sanitized Sharing", symbol: "◌" },
  { id: "knowledge", label: "Knowledge Base", symbol: "◫" },
  { id: "templates", label: "Templates", symbol: "◇" },
  { id: "settings", label: "Settings", symbol: "⚙" },
  { id: "diagnostics", label: "Diagnostics", symbol: "⊙" },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="border-b border-slate-800 bg-[#101318] md:fixed md:inset-y-0 md:left-0 md:z-20 md:w-64 md:border-r md:border-b-0">
      <div className="flex h-16 items-center border-b border-slate-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-cyan-700/60 bg-cyan-950/50 text-sm font-bold text-cyan-300">B</div>
        <div className="ml-3 leading-tight">
          <p className="text-sm font-semibold tracking-tight text-slate-100">Bug Bounty</p>
          <p className="text-xs text-slate-500">Report</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible" aria-label="Main navigation">
        {navigation.map((item) => {
          const active = currentPage === item.id || (currentPage === "editor" && item.id === "reports");
          return (
            <button
              className={`nav-item shrink-0 ${active ? "nav-item-active" : ""}`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <span className="w-5 text-center text-base" aria-hidden="true">{item.symbol}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="hidden px-5 pt-6 text-xs leading-5 text-slate-600 md:block">
        Private workspace<br />Data stays in this browser.
      </div>
    </aside>
  );
}
