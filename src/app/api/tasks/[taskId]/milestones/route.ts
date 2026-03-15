import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { createMilestoneSchema } from "@/lib/validations";

export const GET = withAuth(async (req, user, paramsPromise) => {
  try {
    const { taskId } = await paramsPromise;

    const milestones = await prisma.milestone.findMany({
      where: { taskId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, milestones });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req, user, paramsPromise) => {
  try {
    const { taskId } = await paramsPromise;

    const body = await req.json();
    const result = createMilestoneSchema.safeParse(body);
    if (!result.success)
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const milestone = await prisma.milestone.create({
      data: {
        ...result.data,
        taskId,
      },
    });

    return NextResponse.json({ success: true, milestone }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
