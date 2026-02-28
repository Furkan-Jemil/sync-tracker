import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { addParticipantSchema } from "@/lib/validations";
import { socketEmitter } from "@/lib/socket-emitter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const body = await req.json();
    const result = addParticipantSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { identifier: targetIdentifier, role } = result.data;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const requesterParticipant = await prisma.taskParticipant.findUnique({
      where: { taskId_userId: { taskId, userId: user.userId } }
    });

    const isOwnerOrAssigner = task.ownerId === user.userId || task.assignerId === user.userId;
    const isLeadContibutor = requesterParticipant?.role === "CONTRIBUTOR";

    if (!isOwnerOrAssigner && !isLeadContibutor) {
       return NextResponse.json({ error: "Forbidden: only owner, assigner, or lead contributor can add participants" }, { status: 403 });
    }

    // Ensure user exists
    const targetUser = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { id: targetIdentifier },
          { email: targetIdentifier },
          { name: targetIdentifier }
        ]
      } 
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }
    const targetUserId = targetUser.id;

    const participant = await prisma.$transaction(async (tx) => {
      // Upsert participant to handle case where they might already exist and just need role change
      const newParticipant = await tx.taskParticipant.upsert({
        where: {
          taskId_userId: { taskId, userId: targetUserId }
        },
        update: {
          role,
        },
        create: {
          taskId,
          userId: targetUserId,
          role,
          syncStatus: "IN_SYNC"
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        }
      });

      // Log the participant join
      await tx.syncLog.create({
        data: {
          taskId,
          userId: targetUserId,
          logType: "PARTICIPANT_JOINED",
          content: `Added as ${role} by ${user.email}`,
          newStatus: "IN_SYNC"
        }
      });

      return newParticipant;
    });

    // Fire socket events
    socketEmitter.to(`task:${taskId}`).emit("participant_joined", { participant });
    socketEmitter.to(`user:${targetUserId}`).emit("task_assigned", { task }); // alert them

    return NextResponse.json({ success: true, participant }, { status: 201 });
  } catch (error: unknown) {
    console.error("[PARTICIPANTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isOwnerOrAssigner = task.ownerId === user.userId || task.assignerId === user.userId;
    if (!isOwnerOrAssigner) {
       return NextResponse.json({ error: "Forbidden: only owner or assigner can remove participants" }, { status: 403 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Use deleteMany to avoid throwing P2025 if already deleted
        await tx.taskParticipant.deleteMany({
          where: {
            taskId,
            userId: targetUserId
          }
        });

        await tx.syncLog.create({
          data: {
            taskId,
            userId: targetUserId,
            logType: "PARTICIPANT_REMOVED",
            content: `Removed from task by ${user.email}`,
          }
        });
      });
    } catch (dbError) {
      console.error("[PARTICIPANTS_DELETE_DB_ERROR]", dbError);
      throw dbError; // rethrow to be caught by outer catch
    }

    // Best-effort socket emission
    try {
      socketEmitter.to(`task:${taskId}`).emit("participant_removed", { taskId, userId: targetUserId });
    } catch (socketError) {
      console.warn("[SOCKET_EMIT_WARNING] Failed to emit participant_removed event:", socketError);
      // We don't fail the request if only the socket emission fails
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PARTICIPANTS_DELETE_ERROR]", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined 
    }, { status: 500 });
  }
}
