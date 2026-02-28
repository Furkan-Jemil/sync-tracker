import React from "react";
import Image from "next/image";
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useTaskStore, SyncStatus } from "@/store/useTaskStore";
import clsx from "clsx";

export type ProfileNodeData = {
  taskId: string;
  userId: string;
  name: string;
  role: string;
  status: SyncStatus;
  avatarUrl?: string;
  isTaskNode?: boolean;
};

export type ProfileNodeType = Node<ProfileNodeData, 'profileNode'>;

const truncateId = (id: string | null) => {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
};

/**
 * Circular profile node displaying avatar (or initials), name, role badge, and a status aura.
 * Uses Tailwind CSS for styling and lightweight CSS keyframe animations.
 */
const ProfileNode = ({ data }: NodeProps<ProfileNodeType>) => {
  const { name, role, avatarUrl, taskId, userId, isTaskNode } = data;
  
  const tasks = useTaskStore(state => state.tasks);
  const task = tasks.find(t => t.id === taskId);
  const participant = task?.participants.find(p => p.userId === userId);
  const status = participant?.syncStatus || data.status;

  // Compute initials fallback
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Tailwind classes for role badge colors (Standardized for Service Map)
  const roleColors: Record<string, string> = {
    "RESPONSIBLE OWNER": "bg-indigo-600 border-indigo-400/50 shadow-indigo-500/30 text-white font-black",
    "OWNER": "bg-indigo-600 border-indigo-400/50 shadow-indigo-500/30 text-white font-black",
    "CONTRIBUTOR": "bg-emerald-600 border-emerald-400/50 shadow-emerald-500/30 text-emerald-50 font-black",
    "HELPER": "bg-amber-600 border-amber-400/50 shadow-amber-500/30 text-amber-50 font-black",
    "REVIEWER": "bg-purple-600 border-purple-400/50 shadow-purple-500/30 text-purple-50 font-black",
  };

  // Status aura classes (Refined for Service Map)
  const auraClasses: Record<string, string> = {
    IN_SYNC: "animate-pulse opacity-40 ring-4 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]",
    BLOCKED: "animate-[ping_2s_linear_infinite] opacity-60 ring-4 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]",
    NEEDS_UPDATE: "animate-pulse opacity-50 ring-4 ring-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]",
    HELP_REQUESTED: "animate-[pulse_1s_ease-in-out_infinite] opacity-60 ring-4 ring-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)]",
  };

  return (
    <div className="relative flex flex-col items-center w-24 h-24 group">
      <Handle type="target" position={Position.Top} className="opacity-0 w-1 h-1" />
      
      {/* Aura */}
      <div className="absolute inset-0 flex items-center justify-center top-0">
        <div
          className={`w-16 h-16 rounded-full ${auraClasses[status] || ""}`}
          aria-label={`status-${status}`}
        />
      </div>
      
      {/* Avatar */}
      <div className="absolute top-0 flex flex-col items-center">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={64}
            height={64}
            className="rounded-full border-2 border-slate-900 shadow-lg relative z-10"
          />
        ) : (
          <div className="flex items-center justify-center w-16 h-16 bg-slate-800 border-2 border-slate-700 rounded-full text-xl font-medium text-slate-300 relative z-10 shadow-lg">
            {initials}
          </div>
        )}
        
        {/* Name */}
        <span className="mt-2 text-xs font-bold text-slate-200 truncate max-w-[120px] bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm" title={name}>
          {name}
        </span>
        
        {/* Short ID */}
        {!isTaskNode && (
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter mt-1 bg-slate-950/40 px-1.5 py-0.5 rounded border border-slate-800/50 shadow-inner">
            [{truncateId(userId)}]
          </span>
        )}
        
        {/* Role badge */}
        {!isTaskNode && (
          <div
            className={clsx(
              "mt-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-md border shadow-lg backdrop-blur-md transition-all group-hover:scale-110",
              roleColors[role] || "bg-slate-700 border-slate-500 text-slate-100"
            )}
            title={role}
          >
            {role}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-1 h-1" />
    </div>
  );
};

export default React.memo(ProfileNode);
