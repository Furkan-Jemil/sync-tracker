"use client";

import React, { useState } from 'react';
import clsx from 'clsx';
import { ChevronRight, ChevronDown, User, CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { useTaskStore, TreeNodeData, SyncStatus } from '@/store/useTaskStore';
import { useUIStore } from '@/store/useUIStore';

const statusStyles: Record<SyncStatus, { bg: string, text: string, border: string, icon: React.ElementType, badgeBg: string }> = {
  IN_SYNC: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-100', icon: CheckCircle2 },
  NEEDS_UPDATE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badgeBg: 'bg-amber-100', icon: Clock },
  BLOCKED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-100', icon: AlertCircle },
  HELP_REQUESTED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-100', icon: HelpCircle },
};

const TreeNode = ({ node, level = 0 }: { node: TreeNodeData, level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { openSidePanel, selectedNodeId } = useUIStore();
  
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isRoot = level === 0;
  
  const style = statusStyles[node.status];
  const Icon = style.icon;

  return (
    <div className="flex flex-col">
      <div 
        className={clsx(
          "flex items-center gap-3 py-3 px-4 rounded-xl border mb-3 cursor-pointer transition-all duration-200 hover:shadow-md",
          isRoot ? "bg-slate-800 text-white border-slate-700 shadow-sm" : clsx(style.bg, style.border),
          isSelected && !isRoot ? "ring-2 ring-indigo-500 shadow-md scale-[1.01]" : "hover:border-slate-300",
          isSelected && isRoot ? "ring-2 ring-indigo-400 scale-[1.01]" : ""
        )}
        onClick={() => openSidePanel(node.id)}
      >
        {/* Expand/Collapse Toggle */}
        <div 
          className={clsx(
            "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
            isRoot ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
          ) : (
            <div className="w-4" /> // Spacing for leaf nodes
          )}
        </div>

        {/* Node Icon */}
        <div className={clsx("p-1.5 rounded-lg", isRoot ? "bg-slate-700 text-slate-300" : clsx(style.badgeBg, style.text))}>
          {isRoot ? <User size={20} /> : <Icon size={20} />}
        </div>

        {/* Node Details */}
        <div className="flex flex-col flex-1">
          <span className={clsx("text-[10px] font-bold uppercase tracking-widest opacity-80", isRoot ? "text-slate-400" : "text-slate-500")}>
            {node.role}
          </span>
          <span className={clsx("font-bold text-base", isRoot ? "text-white" : "text-slate-800")}>
            {node.name}
          </span>
        </div>
        
        {/* Status Badge */}
        {!isRoot && (
          <div className={clsx("ml-auto text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border", style.badgeBg, style.text, style.border)}>
            <div className={clsx("w-1.5 h-1.5 rounded-full bg-current", node.status === 'BLOCKED' && 'animate-pulse')} />
            {node.status.replace('_', ' ')}
          </div>
        )}
      </div>

      {/* Children Recursion (Drawing Tree Lines) */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col relative pl-6 ml-4">
          {/* Vertical left bounding line */}
          <div className="absolute top-0 bottom-6 left-0 w-px bg-slate-200" />
          
          {node.children!.map((child, index) => (
            <div key={child.id} className="relative">
              {/* Horizontal line attaching child to vertical line */}
              <div className="absolute top-7 -left-6 w-6 h-px bg-slate-200" />
              <TreeNode node={child} level={level + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ResponsibilityTree = () => {
  const { treeData } = useTaskStore();

  if (!treeData) return (
    <div className="p-8 w-full max-w-4xl mx-auto flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl border-dashed">
      <p className="text-slate-400 font-medium">Loading Responsibility Tree...</p>
    </div>
  );

  return (
    <div className="p-8 bg-white/50 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Responsibility Tree</h2>
          <p className="text-slate-500 text-sm mt-1">Hierarchical breakdown of task execution and real-time sync statuses.</p>
        </div>
      </div>
      
      <div className="pr-4">
        <TreeNode node={treeData} />
      </div>
    </div>
  );
};

export default ResponsibilityTree;
