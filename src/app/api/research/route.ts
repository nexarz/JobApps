import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { researchCompany } from "@/lib/research";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, forceRefresh } = await req.json();
  if (!company || typeof company !== "string") {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  try {
    const research = await researchCompany(company, { forceRefresh: !!forceRefresh });
    return NextResponse.json(research);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Research failed" }, { status: 500 });
  }
}
