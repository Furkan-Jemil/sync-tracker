"use client";

import React, { useState } from "react";
import { X, Loader2, Target, Users, Layout } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTaskModal = ({ isOpen, onClose }: CreateTaskModalProps) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState(""); // Currently would need a user search, simplifying for UX

  const mutation = useMutation({
    mutationFn: async (vars: { title: string; description: string; ownerId: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
      setTitle("");
      setDescription("");
      setOwnerId("");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layout size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Initialize New Task</h2>
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
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={12} className="text-indigo-400" /> Task Designation
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Overload Stabilization"
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layout size={12} className="text-indigo-400" /> Operational Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the objective and success criteria..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[120px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-indigo-400" /> Assign Responsible Owner (ID)
            </label>
            <input
              required
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="Paste User UUID..."
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500 italic mt-1 px-1">Initial responsibility must be assigned to an active user.</p>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
            >
              ABORT
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-[2] h-11 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 size={20} className="animate-spin" /> : "DEPLOY TASK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
