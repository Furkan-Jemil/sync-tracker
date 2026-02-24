"use client";

import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import '@xyflow/react/dist/style.css';

import CustomNode from './CustomNode';
import { getLayoutedElements } from './layout';
import { useGraphStore } from '@/store/useGraphStore';
import { useSocketGraph } from '@/hooks/useSocketGraph';
import { useStaleSync } from '@/hooks/useStaleSync';


// Pre-defined Node types
const nodeTypes = {
  customTaskNode: CustomNode,
};

const now = new Date().toISOString();

// Example mock data matching the `system.md` structure Requirements
const initialNodes: any[] = [
  {
    id: 'task-1',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'task-1', name: 'Refactor Core Engine', role: 'Task', status: 'IN_SYNC', isTaskNode: true, lastSyncedAt: now },
    draggable: false,
  },
  {
    id: 'owner',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'owner', name: 'Sarah Chen', role: 'Responsible Owner', status: 'IN_SYNC', lastSyncedAt: now },
    draggable: false,
  },
  {
    id: 'contrib-1',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'contrib-1', name: 'Alex Doe', role: 'Contributor', status: 'NEEDS_UPDATE', lastSyncedAt: now },
    draggable: false,
  },
  {
    id: 'contrib-2',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'contrib-2', name: 'Jamie Smith', role: 'Helper', status: 'HELP_REQUESTED', lastSyncedAt: now },
    draggable: false,
  },
  {
    id: 'reviewer',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'reviewer', name: 'Dr. Review', role: 'Reviewer', status: 'BLOCKED', lastSyncedAt: now },
    draggable: false,
  },
];

const initialEdges: Edge[] = [
  { id: 'e-task-owner', source: 'task-1', target: 'owner', type: 'smoothstep', animated: true },
  { id: 'e-owner-c1', source: 'owner', target: 'contrib-1', type: 'smoothstep' },
  { id: 'e-owner-c2', source: 'owner', target: 'contrib-2', type: 'smoothstep' },
  { id: 'e-task-reviewer', source: 'task-1', target: 'reviewer', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
];

export const SyncGraph = ({ taskId }: { taskId: string }) => {
  // Bind real-time socket listeners
  useSocketGraph(taskId);

  // Background check for stale syncs
  useStaleSync();
  
  // Pull centralized React Flow state manipulated by those sockets
  const { nodes, edges, initializeGraph } = useGraphStore();

  useEffect(() => {
    // Initial Hydration
    initializeGraph(initialNodes as any, initialEdges);
  }, [initializeGraph]);

  const onNodesChange = useCallback(
    (changes: any) => {
      // In a real app we'd handle changes via applyNodeChanges,
      // but here we keep the graph immutable/driven by store.
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
    },
    []
  );

  return (
    <div className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes as any}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        elementsSelectable={true}
        nodesConnectable={false}
        nodesDraggable={false}
        fitView
        attributionPosition="bottom-right"
        className="sync-tracker-graph"
      >
        <Controls className="!bg-slate-800 !border-slate-700 !text-white [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700" />
        <Background gap={20} size={1} color="#1e293b" />
      </ReactFlow>
    </div>
  );
};

