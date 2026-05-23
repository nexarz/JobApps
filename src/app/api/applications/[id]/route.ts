import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const VALID_STATUSES = new Set([
  "saved", "applied", "screening", "interview", "offer", "rejected", "ghosted", "withdrawn",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id, userId },
    include: {
      companyProfile: true,
      events: { orderBy: { occurredAt: "desc" } },
      interviewPreps: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(application);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.application.findUnique({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { status, currentStage, notes, appliedAt, location, remote, salaryMin, salaryMax } = body;

  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const data: Record<string, unknown> = { lastActivityAt: new Date() };
  if (status !== undefined) data.status = status;
  if (currentStage !== undefined) data.currentStage = currentStage;
  if (notes !== undefined) data.notes = notes;
  if (location !== undefined) data.location = location;
  if (remote !== undefined) data.remote = remote;
  if (salaryMin !== undefined) data.salaryMin = salaryMin;
  if (salaryMax !== undefined) data.salaryMax = salaryMax;
  if (appliedAt !== undefined) data.appliedAt = appliedAt ? new Date(appliedAt) : null;

  // Auto-set appliedAt the first time status moves off "saved"
  if (status && status !== "saved" && !existing.appliedAt && appliedAt === undefined) {
    data.appliedAt = new Date();
  }

  const updated = await prisma.application.update({ where: { id }, data });

  // Log a status_change event when status changes
  if (status && status !== existing.status) {
    await prisma.applicationEvent.create({
      data: {
        applicationId: id,
        type: "status_change",
        title: `Status changed: ${existing.status} → ${status}`,
        fromStatus: existing.status,
        toStatus: status,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.application.delete({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
