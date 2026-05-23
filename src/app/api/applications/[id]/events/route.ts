import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const VALID_EVENT_TYPES = new Set([
  "note", "interview_scheduled", "interview_completed", "offer", "rejection", "status_change",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id, userId } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { type, title, notes, occurredAt } = await req.json();

  if (!type || !VALID_EVENT_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const event = await prisma.applicationEvent.create({
    data: {
      applicationId: id,
      type,
      title,
      notes: notes ?? null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
  });

  await prisma.application.update({
    where: { id },
    data: { lastActivityAt: new Date() },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const app = await prisma.application.findUnique({ where: { id, userId } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.applicationEvent.delete({ where: { id: eventId, applicationId: id } });
  return NextResponse.json({ success: true });
}
