import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { improveDocument } from "@/lib/claude";
import type { AnalysisResult } from "@/lib/claude";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id, userId } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { type, text, analysis } = await req.json() as {
    type: "resume" | "cover_letter";
    text: string;
    analysis: AnalysisResult;
  };

  if (type !== "resume" && type !== "cover_letter") {
    return NextResponse.json({ error: "type must be resume or cover_letter" }, { status: 400 });
  }
  if (!text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (!analysis) {
    return NextResponse.json({ error: "analysis required" }, { status: 400 });
  }

  try {
    const improved = await improveDocument({
      text,
      type,
      analysis,
      jobDesc: app.jobDesc,
      jobTitle: app.jobTitle,
      company: app.company,
    });
    return NextResponse.json({ improved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Improvement failed" },
      { status: 500 }
    );
  }
}
