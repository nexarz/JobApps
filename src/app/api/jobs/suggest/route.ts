import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { suggestJobsFromVault } from "@/lib/claude";
import { searchJSearch } from "../search/route";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") ?? "ca";
  const whereParam = searchParams.get("where");
  const remoteParam = searchParams.get("remote");

  const [documents, user] = await Promise.all([
    prisma.document.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (documents.length === 0) {
    return NextResponse.json({ suggestions: [], groups: [] });
  }

  const where = whereParam ?? user?.location ?? "";
  const remoteOnly = remoteParam === "1" || user?.remotePref === "remote_only";

  const suggestions = await suggestJobsFromVault(documents, {
    location: where || null,
    remotePref: remoteParam === "1" ? "remote_only" : user?.remotePref ?? null,
    experienceYears: user?.experienceYears ?? null,
  });

  // Run JSearch in parallel for each suggested query
  const debugErrors: string[] = [];
  const groups = await Promise.all(
    suggestions.map(async (s) => {
      try {
        const jobs = await searchJSearch({
          query: s.query,
          country,
          remoteOnly,
          where: where || undefined,
          limit: 8,
        });
        return { suggestion: s, jobs };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        debugErrors.push(`${s.query}: ${msg}`);
        return { suggestion: s, jobs: [] };
      }
    })
  );

  const filtered = groups.filter((g) => g.jobs.length > 0);

  return NextResponse.json({
    suggestions,
    groups: filtered,
    appliedPrefs: { where, remoteOnly, experienceYears: user?.experienceYears ?? null },
    _debug: {
      hasRapidKey: !!process.env.RAPIDAPI_KEY,
      rapidKeyPreview: process.env.RAPIDAPI_KEY ? `${process.env.RAPIDAPI_KEY.slice(0, 6)}...${process.env.RAPIDAPI_KEY.slice(-4)}` : null,
      errors: debugErrors,
      suggestionsCount: suggestions.length,
      docCount: documents.length,
      docTypes: documents.map((d) => d.type),
      suggestions,
    },
  });
}
