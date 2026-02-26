"use client";

import React, { useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore, SyncStatus } from '@/store/useTaskStore';
import { 
  X, Clock, HelpCircle, AlertCircle, FileText, 
  Send, Loader2, History, User, Target, MessageSquare, 
  ArrowLeftRight, ShieldCheck, ShieldAlert, ShieldQuestion
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export const SidePanel = () => {
  const queryClient = useQueryClient();
  const { isSidePanelOpen, selectedNodeId, closeSidePanel } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const { updateSyncStatus: updateStoreStatus } = useTaskStore();
  
  const [note, setNote] = useState("");
  const [statusUpdate, setStatusUpdate] = useState<SyncStatus>("IN_SYNC");

  // Parse ID: taskId or taskId-userId
  const isTaskNode = selectedNodeId && !selectedNodeId.includes("-");
  const taskId = isTaskNode ? selectedNodeId : selectedNodeId?.split("-")[0];
  const participantUserId = isTaskNode ? null : selectedNodeId?.split("-")[1];

  const { data, isLoading, error } = useQuery({
    queryKey: ['task-details', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task details");
      const json = await res.json();
      return json.task;
    },
    enabled: !!taskId && isSidePanelOpen,
  });

  const syncMutation = useMutation({
    mutationFn: async (vars: { status: SyncStatus; note: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          status: vars.status,
          note: vars.note
        })
      });
      if (!res.ok) throw new Error("Sync update failed");
      return res.json();
    },
    onSuccess: (data, vars) => {
      // Optismistically update store
      if (taskId && currentUser?.id) {
        updateStoreStatus(taskId, currentUser.id, vars.status);
      }
      // Refresh details to show new logs
      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
      setNote("");
    }
  });

  const transferMutation = useMutation({
    mutationFn: async (vars: { action: "INITIATE" | "ACCEPT" | "REJECT"; toUserId?: string; transferId?: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: vars.action,
          fromUserId: currentUser?.id,
          toUserId: vars.toUserId,
          transferId: vars.transferId,
          userId: currentUser?.id // for ACCEPT/REJECT
        })
      });
      if (!res.ok) throw new Error("Transfer action failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  if (!isSidePanelOpen) return null;

  const participant = participantUserId 
    ? data?.participants.find((p: any) => p.userId === participantUserId) || (data?.ownerId === participantUserId ? { user: data.owner, role: 'Responsible Owner', syncStatus: 'IN_SYNC' } : null)
    : null;

  const isMe = participantUserId === currentUser?.id;

  return (
    <div className="flex flex-col h-full bg-slate-900 shadow-2xl overflow-hidden border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            {isTaskNode ? <Target size={20} /> : <User size={20} />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {isTaskNode ? "Task Logistics" : "Participant Intel"}
            </h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none mt-1">
              {selectedNodeId}
            </p>
          </div>
        </div>
        <button 
          onClick={closeSidePanel}
          className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-500 animate-pulse font-mono tracking-tighter">RETRIEVING INTEL...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            Critical failure in data retrieval.
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Context Card */}
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 shadow-inner">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Target size={12} className="text-indigo-400" /> Current Context
              </h3>
              <p className="text-sm font-bold text-white leading-tight mb-1">{data.title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{data.description || "No tactical description provided."}</p>
            </div>

            {/* Target Details */}
            {participant && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-800">
                      {participant.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-none">{participant.user.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{participant.role}</div>
                    </div>
                  </div>
                  <SyncBadge status={participant.syncStatus} />
                </div>

                {/* Status Toggle if it's ME */}
                {isMe && (
                  <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Update Sync Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["IN_SYNC", "NEEDS_UPDATE", "BLOCKED", "HELP_REQUESTED"].map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatusUpdate(s as SyncStatus)}
                            className={clsx(
                              "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                              statusUpdate === s 
                                ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" 
                                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                            )}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Add Tactical Note</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Log progress or blockers..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                      />
                    </div>

                    <button
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate({ status: statusUpdate, note })}
                      className="w-full h-9 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {syncMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      TRANSMIT STATUS
                    </button>
                    {syncMutation.isError && (
                      <p className="text-[9px] text-red-400 text-center font-bold italic uppercase tracking-tighter">Broadcast Interrupted</p>
                    )}
                  </div>
                )}

            {/* Milestones Section */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} className="text-indigo-400" /> Tactical Milestones
              </h3>
              
              <div className="space-y-2">
                {data.milestones?.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No milestones defined for this node.</p>
                ) : (
                  data.milestones.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg border border-slate-800 group">
                      <input 
                        type="checkbox" 
                        checked={m.completed} 
                        readOnly
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <p className={clsx(
                          "text-[11px] font-bold tracking-tight",
                          m.completed ? "text-slate-500 line-through" : "text-slate-200"
                        )}>
                          {m.title}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Milestone Inline */}
              <div className="pt-2 border-t border-slate-800/50">
                <input 
                  placeholder="Add milestone..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      const title = e.currentTarget.value;
                      e.currentTarget.value = "";
                      await fetch(`/api/tasks/${taskId}/milestones`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title, order: data.milestones?.length || 0 })
                      });
                      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-dotted border-slate-700 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ArrowLeftRight size={12} className="text-amber-400" /> Responsibility Handover
              </h3>

                  {/* Pending Transfer Notice */}
                  {data.transfers?.filter((t: any) => t.status === "PENDING").map((t: any) => (
                    <div key={t.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-[10px] text-amber-200 font-bold uppercase tracking-tight">
                        <ShieldQuestion size={14} /> Transfer Requested
                      </div>
                      <p className="text-[10px] text-slate-300">
                        {t.fromUser.name} wants to transfer ownership to {t.toUser.name}.
                      </p>
                      
                      {t.toUserId === currentUser?.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => transferMutation.mutate({ action: "ACCEPT", transferId: t.id })}
                            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded"
                          >
                            ACCEPT
                          </button>
                          <button
                            onClick={() => transferMutation.mutate({ action: "REJECT", transferId: t.id })}
                            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded"
                          >
                            REJECT
                          </button>
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-500 italic text-center uppercase tracking-widest py-1 border-t border-amber-500/10">
                          Awaiting {t.toUser.name}'s response
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Initiate Transfer if I am Owner */}
                  {data.ownerId === currentUser?.id && !data.transfers?.some((t: any) => t.status === "PENDING") && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Hand over accountability to another agent. This requires their explicit acceptance.
                      </p>
                      <input 
                        placeholder="Target Agent User ID..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            transferMutation.mutate({ action: "INITIATE", toUserId: e.currentTarget.value });
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <div className="text-[9px] text-slate-600 italic">Press Enter to initiate handshake.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity History */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
                <History size={12} className="text-indigo-400" /> Activity Stream
              </h3>
              
              <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-slate-800">
                {(data.syncLogs || []).length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic px-6 py-2">No data logged yet.</p>
                ) : (
                  data.syncLogs.map((log: any) => (
                    <div key={log.id} className="relative pl-7 flex flex-col gap-1 group">
                      <div className={clsx(
                        "absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-4 border-slate-900 z-10 flex items-center justify-center",
                        log.logType === 'HELP_REQUEST' ? "bg-red-500" : "bg-slate-700"
                      )}>
                        {log.logType === 'HELP_REQUEST' ? <AlertCircle size={10} className="text-white" /> : <Clock size={10} className="text-slate-400" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-200">{log.user.name}</span>
                        <span className="text-[9px] text-slate-500 font-medium">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 group-hover:border-slate-600 transition-colors">
                        <div className="text-[10px] text-indigo-300 font-bold mb-1 uppercase tracking-tighter flex items-center gap-1">
                          <MessageSquare size={10} /> {log.logType.replace("_", " ")}
                        </div>
                        <p className="text-xs text-slate-300 break-words leading-snug">
                          {log.content || (log.newStatus ? `Status updated to ${log.newStatus}` : "Tactical update")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-30 px-10 text-center gap-4">
            <Target size={40} className="text-slate-600" />
            <p className="text-xs font-mono tracking-widest uppercase">SELECT A NODE TO VIEW DATA</p>
          </div>
        )}
      </div>
    </div>
  );
};

function SyncBadge({ status }: { status: SyncStatus }) {
  const styles: Record<SyncStatus, string> = {
    IN_SYNC: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    NEEDS_UPDATE: "bg-amber-400/10 text-amber-500 border-amber-400/20",
    BLOCKED: "bg-red-500/10 text-red-500 border-red-500/20",
    HELP_REQUESTED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border", styles[status])}>
      {status.replace("_", " ")}
    </span>
  );
}
