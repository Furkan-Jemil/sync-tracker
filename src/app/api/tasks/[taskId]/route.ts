import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { updateTaskSchema } from "@/lib/validations";
import { socketEmitter } from "@/lib/socket-emitter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assigner: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        syncLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        milestones: {
          orderBy: { order: "asc" },
        },
        transfers: {
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Access control: only participants/owner/assigner can view
    const isParticipant = task.participants.some(p => p.userId === user.userId);
    if (task.ownerId !== user.userId && task.assignerId !== user.userId && !isParticipant) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("[TASK_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    // Check ownership or assignment to allow patch
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.ownerId !== user.userId && task.assignerId !== user.userId) {
       return NextResponse.json({ error: "Forbidden: only owner or assigner can update task details" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: result.data,
    });

    // Fire socket event to the task room
    socketEmitter.to(`task:${taskId}`).emit("task_updated", { task: updatedTask });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error("[TASK_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
