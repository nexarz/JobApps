import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateApplicationMaterials } from "@/lib/claude";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobTitle, company, jobUrl, jobDesc, tone } = body;

  if (!jobTitle || !company || !jobDesc) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({ where: { userId } });

  const result = await generateApplicationMaterials({
    jobDesc,
    jobTitle,
    company,
    documents,
    tone: tone === "playful" ? "playful" : "professional",
  });

  const application = await prisma.application.create({
    data: {
      jobTitle,
      company,
      jobUrl: jobUrl || null,
      jobDesc,
      coverLetter: result.coverLetter,
      resume: result.resume,
      websiteHtml: result.websiteHtml,
      userId,
    },
  });

  return NextResponse.json(application);
}
