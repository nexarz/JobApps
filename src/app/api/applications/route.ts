import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { lastActivityAt: "desc" },
    select: {
      id: true,
      jobTitle: true,
      company: true,
      jobUrl: true,
      status: true,
      currentStage: true,
      location: true,
      remote: true,
      appliedAt: true,
      lastActivityAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json(applications);
}
