"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useTaskStore, SyncStatus } from "@/store/useTaskStore";

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

  useEffect(() => {
    // Connect the singleton socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // ── sync_updated ────────────────────────────────────────────
    const onSyncUpdated = (payload: SyncUpdatedPayload) => {
      console.log(
        `[sync_updated] Task ${payload.taskId} — user ${payload.userId}: ` +
        `${payload.oldStatus} → ${payload.status}`
      );
      updateSyncStatus(payload.taskId, payload.userId, payload.status);
    };

    // ── help_requested ──────────────────────────────────────────
    const onHelpRequested = (payload: HelpRequestedPayload) => {
      console.log(
        `[help_requested] User ${payload.requestorId} needs help on task ${payload.taskId}`
      );

      // TODO: replace with a toast library (e.g. react-hot-toast / sonner)
      if (typeof window !== "undefined") {
        // Browser-only fallback alert; swap for a proper toast in production
        console.warn(
          `🆘 Help requested by ${payload.requestorId}: ${payload.note ?? "No details provided"}`
        );
      }
    };

    // ── milestone_updated ───────────────────────────────────────
    const onMilestoneUpdated = (payload: MilestoneUpdatedPayload) => {
      console.log(
        `[milestone_updated] Task ${payload.taskId} — milestone ${payload.milestoneId}: ` +
        `${payload.isCompleted ? "✅ completed" : "⬜ unchecked"} by ${payload.completedById}`
      );
    };

    // Subscribe
    socket.on("sync_updated", onSyncUpdated);
    socket.on("help_requested", onHelpRequested);
    socket.on("milestone_updated", onMilestoneUpdated);

    // Cleanup on unmount
    return () => {
      socket.off("sync_updated", onSyncUpdated);
      socket.off("help_requested", onHelpRequested);
      socket.off("milestone_updated", onMilestoneUpdated);
    };
  }, [updateSyncStatus]);

  // Renders nothing — this is a pure side-effect component
  return null;
};

export default SocketListener;
