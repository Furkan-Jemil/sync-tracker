"use client";

import React from "react";
import { Activity, Clock, User, Zap, MessageSquare, AlertCircle, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";
import { useTaskStore } from "@/store/useTaskStore";

export function LogsView() {
  const { tasks } = useTaskStore();
  
  const allLogs = React.useMemo(() => {
    const logs: any[] = [];
    tasks.forEach((t) => {
      if ((t as any).syncLogs) {
        (t as any).syncLogs.forEach((l: any) => {
          logs.push({ ...l, taskTitle: t.title });
        });
      }
    });
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks]);

  const isLoading = false; // Data is pushed from store
  const logs = allLogs;

  const getLogIcon = (type: string) => {
    switch (type) {
      case "HELP_REQUEST": return <HelpCircle size={16} className="text-blue-400" />;
      case "BLOCKED": return <AlertCircle size={16} className="text-red-400" />;
      case "SYNC_ACKNOWLEDGED": return <Zap size={16} className="text-emerald-400" />;
      case "TASK_CREATED": return <Activity size={16} className="text-indigo-400" />;
      case "STATUS_UPDATE": return <MessageSquare size={16} className="text-amber-400" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-950">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight text-glow">Activity Intelligence</h2>
        <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-mono text-[10px]">Real-time execution log audit</p>
      </div>

      <div className="relative space-y-4">
        {/* Timeline Path */}
        <div className="absolute left-[21px] top-2 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/50 via-slate-800 to-transparent" />

        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse ml-10" />
          ))
        ) : logs?.length === 0 ? (
          <div className="ml-10 py-10 text-slate-500 italic text-sm">No activity recorded for active tasks.</div>
        ) : (
          logs?.map((log) => (
            <div key={log.id} className="relative flex gap-6 items-start group">
              {/* Indicator Node */}
              <div className="relative z-10 p-2.5 rounded-full bg-slate-900 border-2 border-slate-800 shadow-xl group-hover:border-indigo-500 transition-colors">
                {getLogIcon(log.logType)}
              </div>

              {/* Log Card */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg group-hover:translate-x-1 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {log.logType.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <User size={12} className="text-slate-500" />
                      {log.user?.name || "System"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatDistanceToNow(new Date(log.createdAt))} ago
                  </span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {log.content}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Context:</span>
                  <span className="text-[10px] text-indigo-400 font-black tracking-widest hover:underline cursor-pointer">
                    {log.taskTitle}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
