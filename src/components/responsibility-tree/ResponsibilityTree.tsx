"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  ChevronRight,
  ChevronDown,
  Crown,
  User,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Task, Participant, SyncStatus } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";

// ─── Status Visual Config ────────────────────────────────────────────────────

const statusConfig: Record<
  SyncStatus,
  { bg: string; text: string; border: string; badge: string; icon: React.ElementType; label: string }
> = {
  IN_SYNC: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
    label: "In Sync",
  },
  NEEDS_UPDATE: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Clock,
    label: "Needs Update",
  },
  BLOCKED: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    icon: AlertCircle,
    label: "Blocked",
  },
  HELP_REQUESTED: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: HelpCircle,
    label: "Help Requested",
  },
};

const roleIcons: Record<string, React.ElementType> = {
  "Responsible Owner": Crown,
  Reviewer: Eye,
};

// ─── Participant Node ────────────────────────────────────────────────────────

function ParticipantNode({ participant, taskId }: { participant: Participant; taskId: string }) {
  const { openSidePanel, selectedNodeId } = useUIStore();
  const cfg = statusConfig[participant.syncStatus];
  const StatusIcon = cfg.icon;
  const RoleIcon = roleIcons[participant.role] ?? User;
  const compositeId = `${taskId}-${participant.userId}`;
  const isSelected = selectedNodeId === compositeId;

  return (
    <button
      onClick={() => openSidePanel(compositeId)}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left group",
        cfg.bg,
        cfg.border,
        isSelected
          ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.01]"
          : "hover:brightness-125 hover:shadow-md",
        participant.syncStatus === "BLOCKED" && "animate-pulse"
      )}
    >
      {/* Role icon */}
      <div className={clsx("p-1.5 rounded-lg bg-white/5", cfg.text)}>
        <RoleIcon className="w-4 h-4" />
      </div>

      {/* Name & Role */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {participant.role}
        </div>
        <div className="text-sm font-bold text-slate-200 truncate">
          {participant.name}
        </div>
      </div>

      {/* Status Badge */}
      <div
        className={clsx(
          "shrink-0 flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border",
          cfg.badge
        )}
      >
        <StatusIcon className="w-3 h-3" />
        {cfg.label}
      </div>
    </button>
  );
}

// ─── Task Branch ─────────────────────────────────────────────────────────────

function TaskBranch({ task }: { task: Task }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group participants by role tier
  const owner = task.participants.find((p) => p.role === "Responsible Owner");
  const contributors = task.participants.filter((p) =>
    ["Contributor", "Helper"].includes(p.role)
  );
  const reviewers = task.participants.filter((p) => p.role === "Reviewer");

  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div className="mb-4">
      {/* Task Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all group"
      >
        <Chevron className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        <div className="flex-1 text-left">
          <div className="text-sm font-extrabold text-white">{task.title}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {task.participants.length} participant{task.participants.length !== 1 && "s"}
          </div>
        </div>
        {/* Summary dots */}
        <div className="flex gap-1">
          {task.participants.map((p) => (
            <div
              key={p.userId}
              className={clsx(
                "w-2 h-2 rounded-full",
                statusConfig[p.syncStatus].text.replace("text-", "bg-")
              )}
              title={`${p.name}: ${p.syncStatus}`}
            />
          ))}
        </div>
      </button>

      {/* Expanded Tree */}
      {isExpanded && (
        <div className="relative ml-5 mt-2 pl-4 border-l border-slate-800">
          {/* Tier 1: Owner */}
          {owner && (
            <div className="mb-2 relative">
              <div className="absolute -left-4 top-5 w-4 h-px bg-slate-800" />
              <ParticipantNode participant={owner} taskId={task.id} />
            </div>
          )}

          {/* Tier 2: Contributors / Helpers */}
          {contributors.length > 0 && (
            <div className="ml-4 pl-4 border-l border-slate-800/60 space-y-2 mb-2">
              {contributors.map((p) => (
                <div key={p.userId} className="relative">
                  <div className="absolute -left-4 top-5 w-4 h-px bg-slate-800/60" />
                  <ParticipantNode participant={p} taskId={task.id} />
                </div>
              ))}
            </div>
          )}

          {/* Tier 3: Reviewers */}
          {reviewers.length > 0 && (
            <div className="space-y-2">
              {reviewers.map((p) => (
                <div key={p.userId} className="relative">
                  <div className="absolute -left-4 top-5 w-4 h-px bg-slate-800" />
                  <ParticipantNode participant={p} taskId={task.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ResponsibilityTreeProps {
  tasks: Task[];
}

export const ResponsibilityTree = ({ tasks }: ResponsibilityTreeProps) => {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50">
        <p className="text-slate-500 text-sm font-medium">No tasks to display.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-0 pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Responsibility Tree
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Task → Owner → Contributors → Reviewers
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskBranch key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default ResponsibilityTree;
