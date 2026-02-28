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
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";

import { Task, SyncStatus } from "@/store/useTaskStore";
import { socket } from "@/lib/socket";
import { getLayoutedElements } from "./layout";
import CustomNode from "./CustomNode";
import ProfileNode from "./ProfileNode";

// ─── Constants ───────────────────────────────────────────────────────────────

const nodeTypes = { customTaskNode: CustomNode, profileNode: ProfileNode };

const EDGE_STYLES: Record<string, Partial<Edge>> = {
  assignment: {
    type: "default", // Bezier
    style: { stroke: "#0ea5e9", strokeWidth: 2, strokeDasharray: "4 4" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
    label: "LINK",
    labelStyle: { fill: "#0ea5e9", fontSize: 8, fontWeight: 900, fontFamily: "monospace" },
    animated: true,
  },
  responsibility: {
    type: "default",
    style: { stroke: "#10b981", strokeWidth: 2, strokeDasharray: "4 4" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
    animated: true,
  },
  collaboration: {
    type: "default",
    style: { stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "10 5" },
    animated: true,
  },
  review: {
    type: "default",
    style: { stroke: "#a855f7", strokeWidth: 1.5, strokeDasharray: "4 4" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7" },
    label: "AUDIT",
    labelStyle: { fill: "#a855f7", fontSize: 8, fontWeight: 900, fontFamily: "monospace" },
    animated: true,
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
        role: "TASK",
        status: "IN_SYNC" as SyncStatus,
        isTaskNode: true,
      },
      draggable: false,
    });

    // Categorise participants (Case-insensitive)
    const owner = task.participants.find((p) => p.role.toUpperCase() === "RESPONSIBLE OWNER" || p.role.toUpperCase() === "OWNER");
    const contributors = task.participants.filter((p) =>
      ["CONTRIBUTOR", "HELPER"].includes(p.role.toUpperCase())
    );
    const reviewers = task.participants.filter((p) => p.role.toUpperCase() === "REVIEWER");

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
          role: owner.role.toUpperCase(),
          status: owner.syncStatus,
        },
        draggable: false,
      });
      edges.push({
        id: `e-assign-${task.id}-${ownerId}`,
        source: task.id,
        target: ownerId,
        ...EDGE_STYLES.assignment,
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
            role: c.role.toUpperCase(),
            status: c.syncStatus,
          },
          draggable: false,
        });
        edges.push({
          id: `e-resp-${ownerId}-${cId}`,
          source: ownerId,
          target: cId,
          ...EDGE_STYLES.responsibility,
        } as Edge);
      });

      // ── Collaboration edges (Contributor ↔ Helper) (Case-insensitive) ──
      const contribs = contributors.filter((c) => c.role.toUpperCase() === "CONTRIBUTOR");
      const helpers = contributors.filter((c) => c.role.toUpperCase() === "HELPER");
      contribs.forEach((c) => {
        helpers.forEach((h) => {
          edges.push({
            id: `e-collab-${task.id}-${c.userId}-${h.userId}`,
            source: `${task.id}-${c.userId}`,
            target: `${task.id}-${h.userId}`,
            ...EDGE_STYLES.collaboration,
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
            role: r.role.toUpperCase(),
            status: r.syncStatus,
          },
          draggable: false,
        });
        edges.push({
          id: `e-review-${ownerId}-${rId}`,
          source: ownerId,
          target: rId,
          ...EDGE_STYLES.review,
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
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { nodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraphFromTasks(tasks);
    return { nodes, initialEdges: edges };
  }, [tasks]);

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const edges = useMemo(() => {
    return initialEdges.map((edge) => ({
      ...edge,
      animated: edge.id === hoveredEdgeId ? false : (edge.animated ?? true),
    }));
  }, [initialEdges, hoveredEdgeId]);

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
    userId: string;
    name: string;
    role: string;
    top: number;
    left: number;
  } | null>(null);

  const [addHelperModal, setAddHelperModal] = useState<string | null>(null);
  const [removeParticipantModal, setRemoveParticipantModal] = useState<{ taskId: string; userId: string; name: string } | null>(null);
  const [assignRoleModal, setAssignRoleModal] = useState<{ taskId: string; userId: string; name: string; currentRole: string } | null>(null);
  const [messageUserModal, setMessageUserModal] = useState<{ taskId: string; targetUserId: string; name: string } | null>(null);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      // Only show context menu for profile nodes
      if (node.type === "profileNode") {
        const menuWidth = 160; // w-40
        const menuHeight = 180; // Compact height
        
        let top = event.clientY;
        let left = event.clientX;

        // Boundary detection (relative to viewport)
        if (left + menuWidth > window.innerWidth) {
          left = window.innerWidth - menuWidth - 12;
        }
        if (top + menuHeight > window.innerHeight) {
          top = window.innerHeight - menuHeight - 12;
        }

        setContextMenu({
          nodeId: node.id,
          taskId: node.data.taskId as string,
          userId: node.data.userId as string,
          name: node.data.name as string,
          role: node.data.role as string,
          top,
          left,
        });
      }
    },
    []
  );

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

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
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
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
          className="fixed z-[100] w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] py-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: contextMenu.top, 
            left: contextMenu.left,
          }}
        >
          <div className="px-3 py-1.5 border-b border-slate-800/50 mb-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter leading-tight opacity-70">{contextMenu.role}</p>
            <p className="text-[11px] font-bold text-white truncate">{contextMenu.name}</p>
          </div>
          
          {/* General Actions */}
          <button 
            className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => {
              setMessageUserModal({
                taskId: contextMenu.taskId,
                targetUserId: contextMenu.userId,
                name: contextMenu.name,
              });
              setContextMenu(null);
            }}
          >
            Message User
          </button>

          {/* Actions Section */}
          <div className="h-px bg-slate-800/50 my-1 mx-1.5" />
          
          <button 
            className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => {
              setAddHelperModal(contextMenu.taskId);
              setContextMenu(null);
            }}
          >
            Add Helper
          </button>
          
          <button 
            className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => {
              setAssignRoleModal({
                taskId: contextMenu.taskId,
                userId: contextMenu.userId,
                name: contextMenu.name,
                currentRole: contextMenu.role,
              });
              setContextMenu(null);
            }}
          >
            Assign Role
          </button>

          {/* Only show remove for non-owners (owner protection) */}
          {(() => {
            const task = tasks.find(t => t.id === contextMenu.taskId);
            const isOwnerNode = task?.ownerId === contextMenu.userId;
            
            if (isOwnerNode) return null;

            return (
              <button 
                className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                onClick={() => {
                  setRemoveParticipantModal({
                    taskId: contextMenu.taskId,
                    userId: contextMenu.userId,
                    name: contextMenu.name,
                  });
                  setContextMenu(null);
                }}
              >
                Remove Participant
              </button>
            );
          })()}
        </div>
      )}

      {/* Modals */}
      {addHelperModal && (
        <AddHelperModal taskId={addHelperModal} onClose={() => setAddHelperModal(null)} />
      )}
      {assignRoleModal && (
        <AssignRoleModal
          data={assignRoleModal}
          onClose={() => setAssignRoleModal(null)}
        />
      )}
      {removeParticipantModal && (
        <RemoveParticipantModal
          data={removeParticipantModal}
          onClose={() => setRemoveParticipantModal(null)}
        />
      )}
      {messageUserModal && (
        <MessageUserModal
          data={messageUserModal}
          onClose={() => setMessageUserModal(null)}
        />
      )}
    </div>
  );
};

// ── Add Helper Modal Component (Shadcn-style) ──
function AddHelperModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("HELPER");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add helper");
      
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
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

          {showSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Participant Successfully Coupled
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Email / ID</label>
            <input
              required
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Target User Identifier..."
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
            <button type="button" onClick={onClose} className="flex-[1] h-10 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-[2] h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
              {loading ? "Processing..." : "Establish Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignRoleModal({ data, onClose }: { data: { taskId: string; userId: string; name: string; currentRole: string }; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState(data.currentRole);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${data.taskId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.userId, role }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to assign role");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
          <h2 className="text-sm font-bold text-white tracking-tight uppercase italic">Modify Role: <span className="text-indigo-400 font-mono">{data.name}</span></h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">{errorMsg}</div>}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select New Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all uppercase">
              <option value="HELPER">Helper</option>
              <option value="CONTRIBUTOR">Contributor</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="OBSERVER">Observer</option>
            </select>
          </div>
          <div className="pt-2 flex gap-2">
            <button type="button" onClick={onClose} className="flex-[1] h-10 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-[2] h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
              {loading ? "Processing..." : "Assign Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageUserModal({ data, onClose }: { data: { taskId: string; targetUserId: string; name: string }; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${data.taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: data.targetUserId, message }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to dispatch message");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-details", data.taskId] });
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
          <h2 className="text-sm font-bold text-white tracking-tight uppercase italic">Transmit to: <span className="text-indigo-400 font-mono">{data.name}</span></h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">{errorMsg}</div>}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message Payload</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter direct message..."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono align-top resize-none"
            />
          </div>
          <div className="pt-2 flex gap-2">
            <button type="button" onClick={onClose} className="flex-[1] h-10 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-[2] h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
              {loading ? "Transmitting..." : "Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RemoveParticipantModal({ data, onClose }: { data: { taskId: string; userId: string; name: string }; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${data.taskId}/participants?userId=${data.userId}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to remove participant");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
          <h2 className="text-sm font-bold text-white tracking-tight uppercase italic">Sever Connection: <span className="text-red-400 font-mono">{data.name}</span></h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        <div className="p-5 space-y-4">
          {errorMsg && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">{errorMsg}</div>}
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to decouple <span className="text-white font-bold">{data.name}</span> from this task? This action will terminate their access and visibility for this execution node.
          </p>
          <div className="pt-2 flex gap-2">
            <button type="button" onClick={onClose} className="flex-[1] h-10 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">Abort</button>
            <button onClick={handleDelete} disabled={loading} className="flex-[2] h-10 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-red-500/20 transition-all">
              {loading ? "Decrypting..." : "Confirm Removal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SyncGraph;
