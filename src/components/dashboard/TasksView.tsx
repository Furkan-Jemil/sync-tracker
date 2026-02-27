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
    <div className="p-8 h-full overflow-y-auto bg-slate-950">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Tasks</h2>
          <p className="text-sm text-slate-400 mt-1">Manage and track all active responsibility chains.</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64 h-10 bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <button className="px-4 h-10 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-all">
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
              <Layout size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">No tasks initialized</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2 italic text-sm">
              Deploy your first task to see responsibility nodes and sync status.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.id}
              onClick={() => openSidePanel(task.id)}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 transition-all cursor-pointer flex items-center justify-between"
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
                    <span className="text-xs text-slate-500 font-mono">ID: {task.id.slice(0, 8)}...</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {task.participants.length} Participants
                    </span>
                  </div>
                </div>
              </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Progress</p>
                  <p className="text-sm text-indigo-400 font-bold font-mono">
                    {task.milestones?.filter(m => m.completed).length || 0}/{(task as any).milestones?.length || 0}
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Responsible</p>
                  <p className="text-sm text-slate-300 font-medium">
                    {task.participants.find(p => p.role.includes("Owner") || p.role === "CONTRIBUTOR")?.name || "Unassigned"}
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div className="flex -space-x-2">
                  {task.participants.slice(0, 4).map((p, i) => (
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
          ))
        )}
      </div>
    </div>
  );
}
