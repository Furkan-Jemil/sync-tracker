"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useTaskStore, SyncStatus } from "@/store/useTaskStore";
import { useQueryClient } from "@tanstack/react-query";

// ─── Event Payload Types ─────────────────────────────────────────────────────

interface SyncUpdatedPayload {
  taskId: string;
  userId: string;
  status: SyncStatus;
  oldStatus: SyncStatus;
  logId: string;
  timestamp: string;
}

interface HelpRequestedPayload {
  taskId: string;
  requestorId: string;
  note?: string;
  timestamp: string;
}

interface MilestoneUpdatedPayload {
  taskId: string;
  milestoneId: string;
  isCompleted: boolean;
  completedById: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Invisible component that subscribes to Socket.IO events and
 * bridges them into the Zustand task store.
 *
 * Mount once near the root of your app (e.g. inside `page.tsx`).
 *
 *   <SocketListener />
 */
export const SocketListener = () => {
  const updateSyncStatus = useTaskStore((s) => s.updateSyncStatus);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Connect the singleton socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // ── sync_updated ────────────────────────────────────────────
    const onSyncUpdated = (payload: SyncUpdatedPayload) => {
      console.log(`[sync_updated] Task ${payload.taskId} — user ${payload.userId}: ${payload.oldStatus} → ${payload.status}`);
      updateSyncStatus(payload.taskId, payload.userId, payload.status);
      queryClient.invalidateQueries({ queryKey: ['task-details', payload.taskId] });
    };

    // ── help_requested ──────────────────────────────────────────
    const onHelpRequested = (payload: HelpRequestedPayload) => {
      console.log(`[help_requested] User ${payload.requestorId} needs help on task ${payload.taskId}`);
      queryClient.invalidateQueries({ queryKey: ['task-details', payload.taskId] });
    };

    // ── task_lifecycle ──────────────────────────────────────────
    const onTaskLifecycle = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const onTaskUpdated = (payload: { task: any }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-details', payload.task.id] });
    };

    const onTransferEvent = (payload: any) => {
      console.log("[transfer_event]", payload);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (payload.taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-details', payload.taskId] });
      }
    };

    // Subscribe
    socket.on("sync_updated", onSyncUpdated);
    socket.on("help_requested", onHelpRequested);
    socket.on("task_created", onTaskLifecycle);
    socket.on("task_updated", onTaskUpdated);
    socket.on("transfer_requested", onTransferEvent);
    socket.on("transfer_resolved", onTransferEvent);

    // Cleanup on unmount
    return () => {
      socket.off("sync_updated", onSyncUpdated);
      socket.off("help_requested", onHelpRequested);
      socket.off("task_created", onTaskLifecycle);
      socket.off("task_updated", onTaskUpdated);
      socket.off("transfer_requested", onTransferEvent);
      socket.off("transfer_resolved", onTransferEvent);
    };
  }, [updateSyncStatus, queryClient]);

  // Renders nothing — this is a pure side-effect component
  return null;
};

export default SocketListener;
