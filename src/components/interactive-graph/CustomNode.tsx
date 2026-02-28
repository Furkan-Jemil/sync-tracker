import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import clsx from 'clsx';
import { User, AlertCircle, CheckCircle2, HelpCircle, Clock, Calendar } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { formatDistanceToNow } from 'date-fns';

const truncateId = (id: string | null) => {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
};

export type SyncStatus = 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED';

export type SyncNodeData = {
  id: string; 
  name: string;
  role: string;
  status: SyncStatus;
  isTaskNode?: boolean;
  lastSyncedAt?: string;
  summary?: string;
};

export type SyncNode = Node<SyncNodeData, 'customTaskNode'>;

const statusColors: Record<SyncStatus, string> = {
  IN_SYNC: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 backdrop-blur-md',
  NEEDS_UPDATE: 'bg-amber-400/20 text-amber-500 border-amber-400/40 backdrop-blur-md',
  BLOCKED: 'bg-rose-500/20 text-rose-400 border-rose-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.3)]',
  HELP_REQUESTED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.4)]',
};

const statusIcons: Record<SyncStatus, React.ElementType> = {
  IN_SYNC: CheckCircle2,
  NEEDS_UPDATE: Clock,
  BLOCKED: AlertCircle,
  HELP_REQUESTED: HelpCircle,
};

const CustomNode = ({ id, data }: NodeProps<SyncNode>) => {
  const { openSidePanel } = useUIStore();
  const Icon = data.isTaskNode ? User : statusIcons[data.status];

  const timeAgo = data.lastSyncedAt 
    ? formatDistanceToNow(new Date(data.lastSyncedAt), { addSuffix: true })
    : 'Never';

  return (
    <div className="relative group">
      {/* Quick Summary Tooltip (Visible on Hover) */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-1 text-slate-400 font-bold uppercase tracking-tighter">
          <Calendar size={10} />
          Last Sync: {timeAgo}
        </div>
        <p className="line-clamp-3 text-slate-200">
          {data.summary || "No recent updates logged for this participant."}
        </p>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700" />
      </div>

      <div 
        className={clsx(
          "px-5 py-4 shadow-2xl rounded-2xl border-2 min-w-[220px] cursor-pointer transition-all hover:scale-105 active:scale-95 group/node",
          data.isTaskNode ? "bg-slate-950 text-cyan-400 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.15)]" : statusColors[data.status],
          data.status === 'BLOCKED' && "animate-pulse",
          data.isTaskNode && "text-center ring-4 ring-cyan-500/10 ring-offset-4 ring-offset-slate-950"
        )}
        onClick={() => openSidePanel(id)}
      >
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400 border-none" />
        
        <div className="flex items-center gap-3">
          <div className={clsx(
            "p-1.5 rounded-lg",
            data.isTaskNode ? "bg-slate-700" : "bg-white/20"
          )}>
            <Icon className="w-4 h-4 flex-shrink-0" />
          </div>
          <div className="flex flex-col text-left">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 font-mono">
              {data.role}
            </div>
            <div className="text-[9px] font-mono opacity-40 uppercase tracking-tighter mt-0.5">
              [{truncateId(id)}]
            </div>
            <div className="font-black text-sm leading-tight mt-1 tracking-tight">
              {data.name}
            </div>
          </div>
        </div>
        
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400 border-none" />
      </div>
    </div>
  );
};

export default memo(CustomNode);

