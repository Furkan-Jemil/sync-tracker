"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  GitBranch,
  LayoutGrid,
  Users,
  Bell,
  ChevronRight,
  Zap,
  Loader2,
  Plus,
} from "lucide-react";
import clsx from "clsx";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { SyncGraph } from "@/components/interactive-graph/SyncGraph";
import { ResponsibilityTree } from "@/components/responsibility-tree/ResponsibilityTree";
import { SidePanel } from "@/components/task-details/SidePanel";
import { CreateTaskModal } from "@/components/task-details/CreateTaskModal";
import { TeamView } from "@/components/dashboard/TeamView";
import { TasksView } from "@/components/dashboard/TasksView";
import { LogsView } from "@/components/dashboard/LogsView";
import SocketListener from "@/components/SocketListener";
import { useUIStore, DashboardTab } from "@/store/useUIStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useTasks } from "@/hooks/useTasks";
import { useAuthStore } from "@/store/useAuthStore";
import { LogOut } from "lucide-react";
import { socket } from "@/lib/socket";

type ViewMode = "graph" | "tree";

interface DashboardShellProps {
  initialTab: DashboardTab;
}

export function DashboardShell({ initialTab }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [onlineCount, setOnlineCount] = useState<number>(0);

  const { isSidePanelOpen, activeTab, setTab } = useUIStore();
  const { tasks } = useTaskStore();
  const { user, logout } = useAuthStore();

  const { isLoading, error, refetch } = useTasks();

  // Sync global UI tab state with the route-specific initial tab
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, setTab]);

  // Initialize view mode from URL (?view=graph|tree)
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "graph" || view === "tree") {
      setViewMode(view);
    }
  }, [searchParams]);

  const updateViewMode = (mode: ViewMode) => {
    setViewMode(mode);

    // Keep URL in sync: update ?view=...
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  // Track socket connection status in real time
  useEffect(() => {
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Lightweight heartbeat to keep footer reactive even without real backend
    const heartbeat = setInterval(() => {
      setIsConnected((prev) => (socket.connected !== prev ? socket.connected : prev));
    }, 5000);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      clearInterval(heartbeat);
    };
  }, []);

  // Derive "participants online" count from current tasks as a live indicator
  useEffect(() => {
    const count = tasks.reduce((sum, task) => {
      return (
        sum +
        task.participants.filter((p) => p.syncStatus === "IN_SYNC").length
      );
    }, 0);
    setOnlineCount(count);
  }, [tasks]);

  const renderContent = () => {
    switch (activeTab) {
      case "team":
        return <TeamView />;
      case "tasks":
        return <TasksView tasks={tasks} />;
      case "logs":
        return <LogsView />;
      default: // "dashboard"
        return viewMode === "graph" ? (
          <SyncGraph tasks={tasks} />
        ) : (
          <div className="p-8 h-full overflow-y-auto bg-slate-950">
            <ResponsibilityTree tasks={tasks} />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 shrink-0">
        {/* Logo */}
        <div
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 cursor-pointer hover:scale-110 transition-transform"
        >
          <Zap className="w-5 h-5 text-white" />
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col items-center gap-2 mt-4">
          <SidebarIcon
            icon={LayoutGrid}
            label="Dashboard"
            active={activeTab === "dashboard"}
            onClick={() => router.push("/")}
          />
          <SidebarIcon
            icon={Users}
            label="Team / Participants"
            active={activeTab === "team"}
            onClick={() => router.push("/team")}
          />
          <SidebarIcon
            icon={GitBranch}
            label="Project Hierarchy"
            active={activeTab === "tasks"}
            onClick={() => router.push("/tasks")}
          />
          <SidebarIcon
            icon={Activity}
            label="Activity / Analytics"
            active={activeTab === "logs"}
            onClick={() => router.push("/activity")}
          />
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3">
          <SidebarIcon icon={Bell} label="Alerts" />
          <button
            onClick={() => logout()}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all group relative"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[10px] font-black flex items-center justify-center text-white shadow-md">
            {user?.name?.slice(0, 2).toUpperCase() || "UN"}
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
            <h1 className="text-lg font-extrabold tracking-tight text-white uppercase italic">
              {activeTab}
            </h1>
            {activeTab === "dashboard" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest animate-pulse">
                Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "dashboard" && (
              <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={() => updateViewMode("graph")}
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
                  onClick={() => updateViewMode("tree")}
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
            )}

            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          <div
            className={clsx(
              "flex-1 transition-all duration-300 relative",
              isSidePanelOpen ? "mr-0" : ""
            )}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-10">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
                <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <Activity className="text-red-500 w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Sync Interrupted
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">
                    {(error as Error).message || "Verification failed"}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg transition-all"
                  >
                    Retry Link
                  </button>
                </div>
              </div>
            ) : null}

            {renderContent()}
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
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              )}
            />
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          <span>•</span>
          <span>{onlineCount} participants online</span>
          <span className="ml-auto tracking-[0.2em] font-black text-indigo-500/50 uppercase">
            SyncTracker Terminal
          </span>
        </footer>
      </main>

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
}

function SidebarIcon({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative",
        active
          ? "bg-indigo-500/20 text-indigo-400"
          : "text-slate-500 hover:text-white hover:bg-slate-800"
      )}
    >
      <Icon className="w-5 h-5" />
      {/* Tooltip */}
      <span className="absolute left-14 px-2 py-1 rounded-md bg-slate-800 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-slate-700 shadow-lg z-50">
        {label}
        <ChevronRight className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" />
      </span>
    </button>
  );
}

