import React from "react";
import Image from "next/image";
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useTaskStore, SyncStatus } from "@/store/useTaskStore";

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

  // Tailwind classes for role badge colors
  const roleColors: Record<string, string> = {
    "Responsible Owner": "bg-indigo-600",
    Owner: "bg-indigo-600",
    Contributor: "bg-green-600",
    Helper: "bg-yellow-600",
    Reviewer: "bg-purple-600",
  };

  // Status aura classes
  const auraClasses: Record<string, string> = {
    IN_SYNC: "animate-pulse opacity-80 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]",
    BLOCKED: "animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite] opacity-80 ring-2 ring-rose-500",
    NEEDS_UPDATE: "animate-[pulse_3s_ease-in-out_infinite] opacity-80 ring-2 ring-amber-400",
    HELP_REQUESTED: "animate-pulse opacity-80 ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
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
        
        {/* Role badge */}
        {!isTaskNode && (
          <span
            className={`mt-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full text-white shadow-md ${roleColors[role] || "bg-slate-600"}`}
            title={role}
          >
            {role}
          </span>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-1 h-1" />
    </div>
  );
};

export default React.memo(ProfileNode);
