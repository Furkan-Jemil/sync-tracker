import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
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
    const { targetUserId, message } = body;

    if (!targetUserId || !message) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const log = await prisma.syncLog.create({
      data: {
        taskId,
        userId: user.userId,
        logType: "GENERAL_NOTE",
        content: `Message to <@${targetUser.name}>: ${message}`,
      }
    });

    socketEmitter.to(`task:${taskId}`).emit("task_updated", { task: { id: taskId } });

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error: unknown) {
    console.error("[MESSAGE_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
