import type { ReactNode } from "react";
import type { AppPage, NavigableAppPage } from "../../App";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppLayoutProps {
  children: ReactNode;
  page: AppPage;
  title: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNavigate: (page: NavigableAppPage) => void;
  onNewReport: () => void;
}

export function AppLayout({
  children,
  page,
  title,
  searchQuery,
  onSearchChange,
  onNavigate,
  onNewReport,
}: AppLayoutProps) {
  return (
    <div className="app-shell min-h-screen bg-[#0b0d10] text-slate-200">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-cyan-700 focus:px-3 focus:py-2"
        href="#main-content"
      >
        Skip to main content
      </a>
      <Sidebar currentPage={page} onNavigate={onNavigate} />
      <div className="min-h-screen md:pl-64">
        <Topbar
          title={title}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onNewReport={onNewReport}
        />
        <main
          id="main-content"
          className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
