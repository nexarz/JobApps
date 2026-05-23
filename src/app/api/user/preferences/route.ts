import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const REMOTE_PREFS = new Set(["any", "remote_only", "hybrid_ok", "onsite_only"]);

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { location: true, remotePref: true, experienceYears: true },
  });
  return NextResponse.json(user ?? {});
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { location, remotePref, experienceYears } = body;

  if (remotePref && !REMOTE_PREFS.has(remotePref)) {
    return NextResponse.json({ error: "Invalid remotePref" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      location: typeof location === "string" ? location.trim() || null : undefined,
      remotePref: remotePref ?? undefined,
      experienceYears: typeof experienceYears === "number" ? experienceYears : (experienceYears === null ? null : undefined),
    },
    select: { location: true, remotePref: true, experienceYears: true },
  });

  return NextResponse.json(user);
}
