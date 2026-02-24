import { create } from 'zustand';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { SyncNodeData } from '@/components/interactive-graph/CustomNode';
import { getLayoutedElements } from '@/components/interactive-graph/layout';

interface GraphStore {
  nodes: Node<SyncNodeData>[];
  edges: Edge[];
  setNodes: (nodes: Node<SyncNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  
  // Real-time operations
  addParticipantNode: (newNode: Node<SyncNodeData>, parentId: string) => void;
  updateNodeStatus: (nodeId: string, status: SyncNodeData['status']) => void;
  initializeGraph: (initialNodes: Node<SyncNodeData>[], initialEdges: Edge[]) => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  initializeGraph: (initialNodes, initialEdges) => {
    // Run Dagre layout immediately on initial load
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );
    // Explicitly cast to Node<SyncNodeData>[] to satisfy the store contract
    set({ nodes: layoutedNodes as Node<SyncNodeData>[], edges: layoutedEdges });
  },

  addParticipantNode: (newNode, parentId) => {
    const { nodes, edges } = get();
    
    // Prevent duplicates
    if (nodes.find(n => n.id === newNode.id)) return;

    // Add animating class to the new node for visual flair
    const nodeWithEnterAnim: Node<SyncNodeData> = {
      ...newNode,
      className: 'animate-in fade-in zoom-in duration-500' 
    };

    const newEdge: Edge = {
      id: `e-${parentId}-${newNode.id}`,
      source: parentId,
      target: newNode.id,
      type: 'smoothstep',
      animated: true, 
      markerEnd: { type: MarkerType.ArrowClosed },
    };

    // Recalculate layout structurally with new node
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      [...nodes, nodeWithEnterAnim],
      [...edges, newEdge]
    );

    set({ nodes: layoutedNodes as Node<SyncNodeData>[], edges: layoutedEdges });
  },

  updateNodeStatus: (nodeId, newStatus) => {
    const { nodes } = get();
    
    const updatedNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            status: newStatus,
            lastSyncedAt: new Date().toISOString()
          }
        };
      }
      return node;
    });

    set({ nodes: updatedNodes });
  }
}));

