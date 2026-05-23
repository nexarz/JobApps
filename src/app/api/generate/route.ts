import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateApplicationMaterials } from "@/lib/claude";
import { getCurrentUserId } from "@/lib/auth";
import { researchCompany, formatResearchForPrompt, getCompanyProfileId } from "@/lib/research";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobTitle, company, jobUrl, jobDesc, tone, location, remote, salaryMin, salaryMax } = body;

  if (!jobTitle || !company || !jobDesc) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [documents, research] = await Promise.all([
    prisma.document.findMany({ where: { userId } }),
    researchCompany(company).catch(() => null),
  ]);

  const companyContext = research ? formatResearchForPrompt(research) : "";

  const result = await generateApplicationMaterials({
    jobDesc,
    jobTitle,
    company,
    documents,
    tone: tone === "playful" ? "playful" : "professional",
    companyContext: companyContext || undefined,
  });

  const companyProfileId = await getCompanyProfileId(company);

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
      companyProfileId,
      location: location || null,
      remote: typeof remote === "boolean" ? remote : null,
      salaryMin: salaryMin || null,
      salaryMax: salaryMax || null,
      status: "saved",
    },
  });

  return NextResponse.json(application);
}
