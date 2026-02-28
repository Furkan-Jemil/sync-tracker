"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  Edge,
  Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Task, SyncStatus } from "@/store/useTaskStore";
import { socket } from "@/lib/socket";
import { getLayoutedElements } from "./layout";
import CustomNode from "./CustomNode";
import ProfileNode from "./ProfileNode";

// ─── Constants ───────────────────────────────────────────────────────────────

const nodeTypes = { customTaskNode: CustomNode, profileNode: ProfileNode };

const EDGE_STYLES: Record<string, Partial<Edge>> = {
  assignment: {
    type: "smoothstep",
    style: { stroke: "#6366f1", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
    label: "assigns",
    labelStyle: { fill: "#6366f1", fontSize: 9, fontWeight: 700 },
  },
  responsibility: {
    type: "smoothstep",
    style: { stroke: "#10b981", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
  collaboration: {
    type: "smoothstep",
    style: { stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "6 3" },
  },
  review: {
    type: "smoothstep",
    style: { stroke: "#8b5cf6", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
    label: "reviews",
    labelStyle: { fill: "#8b5cf6", fontSize: 9, fontWeight: 700 },
  },
};

// ─── Graph Builder ───────────────────────────────────────────────────────────

function buildGraphFromTasks(tasks: Task[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  tasks.forEach((task) => {
    // Task node (center root)
    nodes.push({
      id: task.id,
      type: "customTaskNode",
      position: { x: 0, y: 0 },
      data: {
        id: task.id,
        name: task.title,
        role: "Task",
        status: "IN_SYNC" as SyncStatus,
        isTaskNode: true,
      },
      draggable: false,
    });

    // Categorise participants
    const owner = task.participants.find((p) => p.role === "Responsible Owner");
    const contributors = task.participants.filter((p) =>
      ["Contributor", "Helper"].includes(p.role)
    );
    const reviewers = task.participants.filter((p) => p.role === "Reviewer");

    // ── Owner node + Assignment edge (Task → Owner) ──────────────────────
    if (owner) {
      const ownerId = `${task.id}-${owner.userId}`;
      nodes.push({
        id: ownerId,
        type: "profileNode",
        position: { x: 0, y: 0 },
        data: {
          taskId: task.id,
          userId: owner.userId,
          name: owner.name,
          role: owner.role,
          status: owner.syncStatus,
        },
        draggable: false,
      });
      edges.push({
        id: `e-assign-${task.id}-${ownerId}`,
        source: task.id,
        target: ownerId,
        ...EDGE_STYLES.assignment,
        animated: owner.syncStatus === "IN_SYNC",
      } as Edge);

      // ── Contributor/Helper nodes + Responsibility edges (Owner → Contrib) ─
      contributors.forEach((c) => {
        const cId = `${task.id}-${c.userId}`;
        nodes.push({
          id: cId,
          type: "profileNode",
          position: { x: 0, y: 0 },
          data: {
            taskId: task.id,
            userId: c.userId,
            name: c.name,
            role: c.role,
            status: c.syncStatus,
          },
          draggable: false,
        });
        edges.push({
          id: `e-resp-${ownerId}-${cId}`,
          source: ownerId,
          target: cId,
          ...EDGE_STYLES.responsibility,
          animated: owner.syncStatus === "IN_SYNC",
        } as Edge);
      });

      // ── Collaboration edges (Contributor ↔ Helper) ─────────────────────
      const contribs = contributors.filter((c) => c.role === "Contributor");
      const helpers = contributors.filter((c) => c.role === "Helper");
      contribs.forEach((c) => {
        helpers.forEach((h) => {
          edges.push({
            id: `e-collab-${task.id}-${c.userId}-${h.userId}`,
            source: `${task.id}-${c.userId}`,
            target: `${task.id}-${h.userId}`,
            ...EDGE_STYLES.collaboration,
            animated: c.syncStatus === "IN_SYNC",
          } as Edge);
        });
      });

      // ── Reviewer nodes + Review edges (Owner → Reviewer) ───────────────
      reviewers.forEach((r) => {
        const rId = `${task.id}-${r.userId}`;
        nodes.push({
          id: rId,
          type: "profileNode",
          position: { x: 0, y: 0 },
          data: {
            taskId: task.id,
            userId: r.userId,
            name: r.name,
            role: r.role,
            status: r.syncStatus,
          },
          draggable: false,
        });
        edges.push({
          id: `e-review-${ownerId}-${rId}`,
          source: ownerId,
          target: rId,
          ...EDGE_STYLES.review,
          animated: owner.syncStatus === "IN_SYNC",
        } as Edge);
      });
    }
  });

  return getLayoutedElements(nodes, edges, "TB");
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SyncGraphProps {
  tasks: Task[];
}

export const SyncGraph = ({ tasks }: SyncGraphProps) => {
  const { nodes, edges } = useMemo(() => buildGraphFromTasks(tasks), [tasks]);

  // ── Socket.IO real-time subscriptions ──────────────────────────────────

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onSyncUpdated = (payload: { taskId: string; userId: string; status: SyncStatus }) => {
      // The SocketListener component handles store updates;
      // since `tasks` is reactive, the graph re-derives automatically.
      console.log("[SyncGraph] sync_updated →", payload);
    };

    const onParticipantJoined = (payload: { taskId: string; userId: string }) => {
      console.log("[SyncGraph] participant_joined →", payload);
      // Store is updated upstream; graph re-renders via new `tasks` prop
    };

    socket.on("sync_updated", onSyncUpdated);
    socket.on("participant_joined", onParticipantJoined);

    return () => {
      socket.off("sync_updated", onSyncUpdated);
      socket.off("participant_joined", onParticipantJoined);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  const onNodesChange = useCallback(() => {}, []);
  const onEdgesChange = useCallback(() => {}, []);

  // ── Context Menu State ──
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    taskId: string;
    top: number;
    left: number;
  } | null>(null);

  const [addHelperModal, setAddHelperModal] = useState<string | null>(null); // taskId

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      // Only show context menu for profile nodes
      if (node.type === "profileNode") {
        setContextMenu({
          nodeId: node.id,
          taskId: node.data.taskId as string,
          top: event.clientY,
          left: event.clientX,
        });
      }
    },
    []
  );

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  return (
    <div className="w-full h-full bg-slate-950 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeTypes={nodeTypes as any}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        elementsSelectable
        nodesConnectable={false}
        nodesDraggable={false}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        attributionPosition="bottom-right"
        className="sync-tracker-graph"
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="!bg-slate-800 !border-slate-700 [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700" />
        <Background gap={20} size={1} color="#1e293b" />
      </ReactFlow>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="absolute z-50 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 transform scale-in-center animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.top, left: contextMenu.left }}
        >
          <div className="px-3 py-2 border-b border-slate-800 mb-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Node Actions</span>
          </div>
          <button 
            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-indigo-500 hover:bg-opacity-20 transition-colors"
            onClick={() => {
              setAddHelperModal(contextMenu.taskId);
              setContextMenu(null);
            }}
          >
            Add Helper
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-indigo-500 hover:bg-opacity-20 transition-colors"
            onClick={() => {
              alert("Role assignment requires elevated permissions.");
              setContextMenu(null);
            }}
          >
            Assign Role
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-indigo-500 hover:bg-opacity-20 transition-colors"
            onClick={() => {
              alert("Messaging protocol engaged.");
              setContextMenu(null);
            }}
          >
            Message User
          </button>
        </div>
      )}

      {/* Add Helper Modal (Reusing existing modal style) */}
      {addHelperModal && (
        <AddHelperModal 
          taskId={addHelperModal} 
          onClose={() => setAddHelperModal(null)} 
        />
      )}
    </div>
  );
};

// ── Add Helper Modal Component (Shadcn-style) ──
function AddHelperModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("HELPER");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add helper");
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-sm font-bold text-white tracking-tight uppercase italic">Append Node Link</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Target User Email..."
              className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all uppercase"
            >
              <option value="HELPER">Helper</option>
              <option value="CONTRIBUTOR">Contributor</option>
              <option value="REVIEWER">Reviewer</option>
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-[1] h-10 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : "Establish Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SyncGraph;
