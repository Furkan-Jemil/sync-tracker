import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { socketEmitter } from "@/lib/socket-emitter";
import { SyncStatus } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await req.json();
    const { userId, status, note } = body as {
      userId: string;
      status: SyncStatus;
      note?: string;
    };

    if (!userId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Transaction to guarantee state atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Find current participant state
      const participant = await tx.taskParticipant.findUnique({
        where: { taskId_userId: { taskId, userId } },
      });

      if (!participant) {
        throw new Error("User is not a participant in this task.");
      }

      const oldStatus = participant.syncStatus;

      // Update participant sync status
      const updatedParticipant = await tx.taskParticipant.update({
        where: { id: participant.id },
        data: {
          syncStatus: status,
          lastSyncedAt: new Date(),
        },
      });

      // Insert Immutable SyncLog
      const log = await tx.syncLog.create({
        data: {
          taskId,
          userId,
          logType: status === "HELP_REQUESTED" ? "HELP_REQUEST" : "STATUS_UPDATE",
          content: note,
          oldStatus,
          newStatus: status,
        },
      });

      // Find task to get Assigner and Owner for notifications
      const task = await tx.task.findUnique({ where: { id: taskId } });

      return { updatedParticipant, log, task };
    });

    // 2. Broadcast via Redis Adapter/Emitter
    const timestamp = new Date().toISOString();

    // Standard sync update broadcast
    socketEmitter.to(`task:${taskId}`).emit("sync_updated", {
      taskId,
      userId,
      status,
      oldStatus: result.log.oldStatus,
      logId: result.log.id,
      timestamp,
    });

    // Specific behavior for HELP_REQUESTED
    if (status === "HELP_REQUESTED") {
      const helpPayload = {
        taskId,
        requestorId: userId,
        note,
        timestamp,
      };

      // Broadcast to task room (turns node blue)
      socketEmitter.to(`task:${taskId}`).emit("help_requested", helpPayload);

      // Broadcast to specific users globally (Toast notifications)
      if (result.task) {
        const { assignerId, ownerId } = result.task;
        socketEmitter.to(`user:${assignerId}`).emit("help_requested", helpPayload);
        if (ownerId !== assignerId) {
          socketEmitter.to(`user:${ownerId}`).emit("help_requested", helpPayload);
        }
      }
    }

    return NextResponse.json({ success: true, log: result.log });
  } catch (error: any) {
    console.error("[SYNC_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
