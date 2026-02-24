"use client";

import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  Connection,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNode from './CustomNode';
import { getLayoutedElements } from './layout';
import { useGraphStore } from '@/store/useGraphStore';
import { useSocketGraph } from '@/hooks/useSocketGraph';
import '@xyflow/react/dist/style.css';

import CustomNode from './CustomNode';
import { getLayoutedElements } from './layout';

// Pre-defined Node types
const nodeTypes = {
  customTaskNode: CustomNode,
};

// Example mock data matching the `system.md` structure Requirements
const initialNodes = [
  {
    id: 'task-1',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'task-1', name: 'Refactor Core Engine', role: 'Task', status: 'IN_SYNC', isTaskNode: true },
    draggable: false,
  },
  {
    id: 'owner',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'owner', name: 'Sarah Chen', role: 'Responsible Owner', status: 'IN_SYNC' },
    draggable: false,
  },
  {
    id: 'contrib-1',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'contrib-1', name: 'Alex Doe', role: 'Contributor', status: 'NEEDS_UPDATE' },
    draggable: false,
  },
  {
    id: 'contrib-2',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'contrib-2', name: 'Jamie Smith', role: 'Helper', status: 'HELP_REQUESTED' },
    draggable: false,
  },
  {
    id: 'reviewer',
    type: 'customTaskNode',
    position: { x: 0, y: 0 },
    data: { id: 'reviewer', name: 'Dr. Review', role: 'Reviewer', status: 'BLOCKED' },
    draggable: false,
  },
];

const initialEdges: Edge[] = [
  { id: 'e-task-owner', source: 'task-1', target: 'owner', type: 'smoothstep', animated: true },
  { id: 'e-owner-c1', source: 'owner', target: 'contrib-1', type: 'smoothstep' },
  { id: 'e-owner-c2', source: 'owner', target: 'contrib-2', type: 'smoothstep' },
  { id: 'e-task-reviewer', source: 'task-1', target: 'reviewer', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
];

// Layout the nodes before initializing the state
const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges
);

export const SyncGraph = ({ taskId }: { taskId: string }) => {
  // Bind real-time socket listeners
  useSocketGraph(taskId);
  
  // Pull centralized React Flow state manipulated by those sockets
  const { nodes, edges, setNodes, setEdges, initializeGraph } = useGraphStore();

  useEffect(() => {
    // Initial Hydration
    // In production, you would fetch these from TanStack query here.
    initializeGraph(initialNodes, initialEdges);
  }, [initializeGraph]);

  const onNodesChange = useCallback(
    (changes: any) => {
      // Typically xyflow handles this internally via useNodesState,
      // but manually applying changes securely protects structure while allowing selection.
      setNodes(nodes); 
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      setEdges(edges);
    },
    [edges, setEdges]
  );

  return (
    <div style={{ width: '100%', height: '100vh', background: '#f8fafc' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        elementsSelectable={true}
        nodesConnectable={false} // Enforcing strict structural requirements
        nodesDraggable={false}   // Enforcing strict requirement: "Nodes are NOT draggable"
        fitView
        attributionPosition="bottom-right"
        className="sync-tracker-graph"
      >
        <Controls />
        <Background gap={16} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  );
};
