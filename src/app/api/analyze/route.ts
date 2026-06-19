import { NextRequest, NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/claude";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { text, type, jobDesc, jobTitle, company } = body;

  if (!text || !type || !jobDesc || !jobTitle || !company) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (type !== "resume" && type !== "cover_letter") {
    return NextResponse.json({ error: "type must be resume or cover_letter" }, { status: 400 });
  }

  const result = await analyzeDocument({ text, type, jobDesc, jobTitle, company });
  return NextResponse.json(result);
}
