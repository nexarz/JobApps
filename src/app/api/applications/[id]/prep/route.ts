import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { generateInterviewPrep } from "@/lib/claude";
import { formatResearchForPrompt } from "@/lib/research";

const VALID_STAGES = new Set([
  "recruiter_screen", "hiring_manager", "technical", "onsite", "exec", "behavioral",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { stage } = await req.json();

  if (!stage || !VALID_STAGES.has(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const app = await prisma.application.findUnique({
    where: { id, userId },
    include: { companyProfile: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const documents = await prisma.document.findMany({ where: { userId } });
  const vaultSample = documents
    .slice(0, 8)
    .map((d) => `[${d.type}] ${d.content.slice(0, 600)}`)
    .join("\n\n---\n\n");

  const companyContext = app.companyProfile
    ? formatResearchForPrompt({
        name: app.companyProfile.name,
        website: app.companyProfile.website,
        summary: app.companyProfile.summary,
        mission: app.companyProfile.mission,
        products: app.companyProfile.products,
        techStack: app.companyProfile.techStack,
        values: app.companyProfile.values,
        culture: app.companyProfile.culture,
        recentNews: app.companyProfile.recentNews,
        sources: [],
      })
    : "";

  try {
    const content = await generateInterviewPrep({
      stage,
      jobTitle: app.jobTitle,
      company: app.company,
      jobDesc: app.jobDesc,
      vaultSample,
      companyContext: companyContext || undefined,
    });

    const prep = await prisma.interviewPrep.create({
      data: {
        applicationId: id,
        stage,
        content: JSON.stringify(content),
      },
    });

    return NextResponse.json({ ...prep, content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prep generation failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id, userId } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const preps = await prisma.interviewPrep.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(preps.map((p) => ({ ...p, content: JSON.parse(p.content) })));
}
