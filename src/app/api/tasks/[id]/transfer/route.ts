import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { socketEmitter } from "@/lib/socket-emitter";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const body = await req.json();
    const { action } = body as { action: "INITIATE" | "ACCEPT" | "REJECT" };

    if (action === "INITIATE") {
      const { fromUserId, toUserId, note } = body as any;
      if (!fromUserId || !toUserId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

      const transfer = await prisma.responsibilityTransfer.create({
        data: {
          taskId,
          fromUserId,
          toUserId,
          status: "PENDING"
        }
      });

      // Emit pending notification to target user
      socketEmitter.to(`user:${toUserId}`).emit("transfer_pending", {
        transferId: transfer.id,
        taskId,
        fromUserId,
        toUserId
      });

      return NextResponse.json({ success: true, transfer });
    }

    if (action === "ACCEPT" || action === "REJECT") {
      const { transferId, userId } = body as any;
      if (!transferId || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

      const result = await prisma.$transaction(async (tx) => {
        const transfer = await tx.responsibilityTransfer.findUnique({ where: { id: transferId } });
        if (!transfer || transfer.toUserId !== userId || transfer.status !== "PENDING") {
          throw new Error("Invalid transfer request");
        }

        // Update transfer status
        const resolved = await tx.responsibilityTransfer.update({
          where: { id: transferId },
          data: { status: action, resolvedAt: new Date() }
        });

        if (action === "ACCEPT") {
          // Change the actual task owner
          await tx.task.update({
            where: { id: taskId },
            data: { 
              ownerId: userId,
              ownerAcceptedAt: new Date()
            }
          });

          // Create a SyncLog event documenting the handover
          await tx.syncLog.create({
            data: {
              taskId,
              userId: transfer.fromUserId,
              logType: "RESPONSIBILITY_TRANSFER",
              content: `Responsibility passed to user ${userId}`
            }
          });
        }

        return resolved;
      });

      if (action === "ACCEPT") {
        const timestamp = new Date().toISOString();
        // Tell the room that the graph hierarchy must physically restructure
        socketEmitter.to(`task:${taskId}`).emit("graph_restructured", {
          taskId,
          newOwnerId: userId,
          oldOwnerId: result.fromUserId,
          timestamp
        });
      }

      return NextResponse.json({ success: true, transfer: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[TRANSFER_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
