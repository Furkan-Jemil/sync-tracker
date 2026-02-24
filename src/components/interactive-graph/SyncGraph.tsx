"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  Edge,
  Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import clsx from "clsx";
import { Task, Participant, SyncStatus } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";
import { socket } from "@/lib/socket";
import { getLayoutedElements } from "./layout";
import CustomNode from "./CustomNode";

// ─── Constants ───────────────────────────────────────────────────────────────

const nodeTypes = { customTaskNode: CustomNode };

const EDGE_STYLES: Record<string, Partial<Edge>> = {
  assignment: {
    type: "smoothstep",
    animated: true,
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
        type: "customTaskNode",
        position: { x: 0, y: 0 },
        data: {
          id: ownerId,
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
      } as Edge);

      // ── Contributor/Helper nodes + Responsibility edges (Owner → Contrib) ─
      contributors.forEach((c) => {
        const cId = `${task.id}-${c.userId}`;
        nodes.push({
          id: cId,
          type: "customTaskNode",
          position: { x: 0, y: 0 },
          data: {
            id: cId,
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
          } as Edge);
        });
      });

      // ── Reviewer nodes + Review edges (Owner → Reviewer) ───────────────
      reviewers.forEach((r) => {
        const rId = `${task.id}-${r.userId}`;
        nodes.push({
          id: rId,
          type: "customTaskNode",
          position: { x: 0, y: 0 },
          data: {
            id: rId,
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

  return (
    <div className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes as any}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
    </div>
  );
};

export default SyncGraph;
