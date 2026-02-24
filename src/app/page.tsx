"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  GitBranch,
  LayoutGrid,
  Users,
  Bell,
  Search,
  ChevronRight,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { SyncGraph } from "@/components/interactive-graph/SyncGraph";
import { ResponsibilityTree } from "@/components/responsibility-tree/ResponsibilityTree";
import { SidePanel } from "@/components/task-details/SidePanel";
import SocketListener from "@/components/SocketListener";
import { useUIStore } from "@/store/useUIStore";
import { useTaskStore, Task } from "@/store/useTaskStore";

// ── Seed data (replace with API fetch in production) ─────────────────────────
const SEED_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Refactor Core Engine",
    participants: [
      { userId: "u-sarah", name: "Sarah Chen", role: "Responsible Owner", syncStatus: "IN_SYNC" },
      { userId: "u-alex", name: "Alex Doe", role: "Contributor", syncStatus: "NEEDS_UPDATE" },
      { userId: "u-jamie", name: "Jamie Smith", role: "Helper", syncStatus: "HELP_REQUESTED" },
      { userId: "u-review", name: "Dr. Review", role: "Reviewer", syncStatus: "BLOCKED" },
    ],
  },
  {
    id: "task-2",
    title: "Design Auth Flow",
    participants: [
      { userId: "u-maria", name: "Maria Garcia", role: "Responsible Owner", syncStatus: "IN_SYNC" },
      { userId: "u-tom", name: "Tom Nguyen", role: "Contributor", syncStatus: "IN_SYNC" },
      { userId: "u-lisa", name: "Lisa Park", role: "Reviewer", syncStatus: "NEEDS_UPDATE" },
    ],
  },
];

type ViewMode = "graph" | "tree";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const { isSidePanelOpen } = useUIStore();
  const { tasks, setTasks } = useTaskStore();

  // Hydrate with seed data on first mount
  useEffect(() => {
    if (tasks.length === 0) setTasks(SEED_TASKS);
  }, [tasks.length, setTasks]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 shrink-0">
        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Zap className="w-5 h-5 text-white" />
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col items-center gap-2 mt-4">
          <SidebarIcon icon={LayoutGrid} label="Dashboard" active />
          <SidebarIcon icon={Users} label="Team" />
          <SidebarIcon icon={GitBranch} label="Tasks" />
          <SidebarIcon icon={Activity} label="Logs" />
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3">
          <SidebarIcon icon={Bell} label="Alerts" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[10px] font-black flex items-center justify-center text-white shadow-md">
            SC
          </div>
        </div>
      </aside>

      {/* SocketListener — headless real-time bridge */}
      <SocketListener />

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              SyncTracker
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest">
              Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-56 h-9 bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode("graph")}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                  viewMode === "graph"
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Graph View
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                  viewMode === "tree"
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Tree View
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div
            className={clsx(
              "flex-1 transition-all duration-300",
              isSidePanelOpen ? "mr-0" : ""
            )}
          >
            {viewMode === "graph" ? (
              <SyncGraph tasks={tasks} />
            ) : (
              <div className="p-8 h-full overflow-y-auto bg-slate-950">
                <ResponsibilityTree tasks={tasks} />
              </div>
            )}
          </div>

          {/* Side Panel (slides in from right) */}
          <div
            className={clsx(
              "shrink-0 border-l border-slate-800 bg-slate-900 transition-all duration-300 overflow-hidden",
              isSidePanelOpen ? "w-96" : "w-0"
            )}
          >
            {isSidePanelOpen && <SidePanel />}
          </div>
        </div>

        {/* Status Bar */}
        <footer className="h-8 shrink-0 bg-slate-900 border-t border-slate-800 flex items-center px-4 text-[11px] text-slate-500 gap-4 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
          <span>•</span>
          <span>5 participants online</span>
          <span className="ml-auto">SyncTracker v0.1.0</span>
        </footer>
      </main>
    </div>
  );
}

// ─── Sidebar Icon Component ──────────────────────────────────────────────────

function SidebarIcon({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative",
        active
          ? "bg-indigo-500/20 text-indigo-400"
          : "text-slate-500 hover:text-white hover:bg-slate-800"
      )}
    >
      <Icon className="w-5 h-5" />
      {/* Tooltip */}
      <span className="absolute left-14 px-2 py-1 rounded-md bg-slate-800 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-slate-700 shadow-lg">
        {label}
        <ChevronRight className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" />
      </span>
    </button>
  );
}
