import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { createTaskSchema } from "@/lib/validations";
import { socketEmitter } from "@/lib/socket-emitter";

export const GET = withAuth(async (req, user) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { assignerId: user.userId },
          { ownerId: user.userId },
          { participants: { some: { userId: user.userId } } },
        ],
      },
      include: {
        assigner: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        syncLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        milestones: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error("[TASKS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const result = createTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { title, description, ownerId } = result.data;
    const effectiveOwnerId = ownerId ?? user.userId;

    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          title,
          description,
          assignerId: user.userId,
          ownerId: effectiveOwnerId,
        },
        include: {
          assigner: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        }
      });

      // Log task creation
      await tx.syncLog.create({
        data: {
          taskId: newTask.id,
          userId: user.userId,
          logType: "TASK_CREATED",
          content: `Task "${title}" created by ${user.email}`,
        }
      });

      return newTask;
    });

    // Fire socket event
    socketEmitter.emit("task_created", { task });
    
    // Also emit to the specific user's room to notify them of assignment
    if (effectiveOwnerId !== user.userId) {
      socketEmitter.to(`user:${effectiveOwnerId}`).emit("task_assigned", { task });
    }

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: any) {
    console.error("[TASKS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
