import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateApplicationMaterials } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobTitle, company, jobUrl, jobDesc } = body;

  if (!jobTitle || !company || !jobDesc) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const documents = await prisma.document.findMany();

  const result = await generateApplicationMaterials({
    jobDesc,
    jobTitle,
    company,
    documents,
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
    },
  });

  return NextResponse.json(application);
}
