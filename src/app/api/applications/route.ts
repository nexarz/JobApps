import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      jobTitle: true,
      company: true,
      jobUrl: true,
      createdAt: true,
    },
  });
  return NextResponse.json(applications);
}
