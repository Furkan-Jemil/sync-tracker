import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    // Check Database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    const redisStatus = await redis.ping();
    
    if (redisStatus !== "PONG") {
      throw new Error("Redis unhealthy");
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "up",
        redis: "up"
      }
    });
  } catch (error: any) {
    console.error("[HEALTH_CHECK_ERROR]", error);
    return NextResponse.json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
