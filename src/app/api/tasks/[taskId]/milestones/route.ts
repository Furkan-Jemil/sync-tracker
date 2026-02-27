import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createMilestoneSchema } from "@/lib/validations";

type MilestoneRouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(req: NextRequest, context: MilestoneRouteContext) {
  try {
    const user = getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = await context.params;

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
}

export async function POST(req: NextRequest, context: MilestoneRouteContext) {
  try {
    const user = getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = await context.params;

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
}
