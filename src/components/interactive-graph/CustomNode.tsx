import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import { User, AlertCircle, CheckCircle2, HelpCircle, Clock } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

// Assuming SyncStatus enum maps to these string literals
type SyncStatus = 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED';

export type SyncNodeData = {
  id: string; // the TaskParticipant ID or User ID
  name: string;
  role: string;
  status: SyncStatus;
  isTaskNode?: boolean;
};

const statusColors: Record<SyncStatus, string> = {
  IN_SYNC: 'bg-emerald-500 text-white border-emerald-600',
  NEEDS_UPDATE: 'bg-amber-400 text-amber-950 border-amber-500',
  BLOCKED: 'bg-rose-500 text-white border-rose-600 animate-pulse',
  HELP_REQUESTED: 'bg-blue-500 text-white border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]',
};

const statusIcons: Record<SyncStatus, React.ElementType> = {
  IN_SYNC: CheckCircle2,
  NEEDS_UPDATE: Clock,
  BLOCKED: AlertCircle,
  HELP_REQUESTED: HelpCircle,
};

const CustomNode = ({ id, data }: NodeProps<SyncNodeData>) => {
  const { openSidePanel } = useUIStore();
  const Icon = data.isTaskNode ? User : statusIcons[data.status];

  return (
    <div 
      className={clsx(
        "px-4 py-3 shadow-lg rounded-xl border-2 min-w-[180px] cursor-pointer transition-transform hover:scale-105",
        data.isTaskNode ? "bg-slate-800 text-white border-slate-600" : statusColors[data.status],
        data.isTaskNode && "text-center"
      )}
      onClick={() => openSidePanel(id)}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      
      <div className="flex items-center gap-3">
        {!data.isTaskNode && <Icon className="w-5 h-5 flex-shrink-0" />}
        <div className="flex flex-col">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {data.role}
          </div>
          <div className="font-bold text-sm">
            {data.name}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
};

export default memo(CustomNode);
