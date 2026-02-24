import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { X, Clock, HelpCircle, AlertCircle, FileText } from 'lucide-react';

export const SidePanel = () => {
  const { isSidePanelOpen, selectedNodeId, closeSidePanel } = useUIStore();

  if (!isSidePanelOpen) return null;

  // In a real implementation, you would use TanStack Query here to fetch the node details
  // const { data, isLoading } = useQuery(['participant', selectedNodeId], fetchDetails);

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-200 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800">Details Panel</h2>
          <button 
            onClick={closeSidePanel}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Placeholder Content - To be hooked up with TanStack query */}
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="text-sm text-slate-500">
            Viewing details for internal ID: <code className="bg-slate-100 px-1 rounded">{selectedNodeId}</code>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock size={16} /> Status & Time
            </h3>
            <div className="text-sm space-y-1">
              <p><span className="text-slate-500">Sync Status:</span> <span className="font-medium text-emerald-600">IN_SYNC</span></p>
              <p><span className="text-slate-500">Last Update:</span> 10 mins ago</p>
              <p><span className="text-slate-500">Time Logged:</span> 4h 30m</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={16} /> Recent Notes
            </h3>
            <p className="text-sm italic text-slate-600">"Finished setting up the backend schema, moving to the UI graph visualization now."</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <HelpCircle size={16} /> Help Requests
            </h3>
            <p className="text-sm text-slate-500">0 active requests</p>
          </div>
        </div>

      </div>
    </div>
  );
};
