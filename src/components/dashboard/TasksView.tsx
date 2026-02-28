"use client";

import React, { useMemo, useState } from "react";
import { Layout, Search, Filter } from "lucide-react";
import { Task } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";

interface TasksViewProps {
  tasks: Task[];
}

export function TasksView({ tasks }: TasksViewProps) {
  const { openSidePanel } = useUIStore();
  const [query, setQuery] = useState("");

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => {
      const inTitle = task.title.toLowerCase().includes(q);
      const inId = task.id.toLowerCase().includes(q);
      const inParticipants = task.participants.some((p) =>
        p.name.toLowerCase().includes(q)
      );
      return inTitle || inId || inParticipants;
    });
  }, [tasks, query]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            System Tasks
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage and track all active responsibility chains.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-64 h-10 bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <button className="px-3 md:px-4 h-10 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-all shrink-0">
            <Filter size={16} />
            <span className="hidden xs:inline">Filters</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
              <Layout size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">
              No tasks initialized
            </h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2 italic text-sm">
              Deploy your first task to see responsibility nodes and sync
              status.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const completedMilestones =
              (task.milestones || []).filter((m: any) => m.isCompleted).length;
            const totalMilestones = (task.milestones || []).length;
            const responsible =
              task.participants.find(
                (p) =>
                  p.role.includes("Owner") || p.role.toUpperCase() === "CONTRIBUTOR"
              )?.name || "Unassigned";

            return (
              <div
                key={task.id}
                onClick={() => openSidePanel(task.id)}
                className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 md:p-5 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    <Layout size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 font-mono">
                        ID: {task.id.slice(0, 8)}...
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {task.participants.length} Participants
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 w-full md:w-auto pt-4 md:pt-0 border-t border-slate-800 md:border-t-0">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      Progress
                    </p>
                    <p className="text-sm text-indigo-400 font-bold font-mono">
                      {completedMilestones}/{totalMilestones}
                    </p>
                  </div>

                  <div className="hidden md:block w-px h-8 bg-slate-800" />

                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      Responsible
                    </p>
                    <p className="text-xs md:text-sm text-slate-300 font-medium max-w-[100px] truncate">
                      {responsible}
                    </p>
                  </div>

                  <div className="hidden md:block w-px h-8 bg-slate-800" />

                  <div className="flex -space-x-1.5 md:-space-x-2">
                    {task.participants.slice(0, 4).map((p) => (
                      <div
                        key={p.userId}
                        className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300 overflow-hidden"
                        title={p.name}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {task.participants.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        +{task.participants.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
