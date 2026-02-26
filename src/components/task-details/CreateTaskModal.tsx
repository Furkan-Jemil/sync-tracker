"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Target, Users, Layout, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTaskModal = ({ isOpen, onClose }: CreateTaskModalProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-populate ownerId when modal opens or user changes
  useEffect(() => {
    if (isOpen && user?.id) {
      setOwnerId(user.id);
    }
  }, [isOpen, user?.id]);

  const mutation = useMutation({
    mutationFn: async (vars: { title: string; description: string; ownerId: string }) => {
      setErrorMsg(null);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deploy task");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
      setTitle("");
      setDescription("");
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layout size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase italic">Initialize Node</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form 
          className="p-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ title, description, ownerId });
          }}
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Target size={12} className="text-indigo-400" /> Designation
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PROJECT_OMEGA_STABILIZATION"
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Layout size={12} className="text-indigo-400" /> Operational Context
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Define responsibility boundary and sync expectations..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[100px] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users size={12} className="text-indigo-400" /> Responsible Agent ID
            </label>
            <div className="relative">
              <input
                required
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                placeholder="USER_UUID_REQUIRED"
                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-[10px]"
              />
              {ownerId === user?.id && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">
                  Self
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-600 italic mt-1 px-1">Defaults to your active session identity.</p>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-[2] h-11 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-sm uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 size={20} className="animate-spin" /> : "Deploy Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
