import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { suggestJobsFromVault } from "@/lib/claude";
import { searchJSearch, buildAppliedMap, decorateWithApplied } from "../search/route";

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

  let suggestions: Awaited<ReturnType<typeof suggestJobsFromVault>> = [];
  try {
    suggestions = await suggestJobsFromVault(documents, {
      location: where || null,
      remotePref: remoteParam === "1" ? "remote_only" : user?.remotePref ?? null,
      experienceYears: user?.experienceYears ?? null,
    });
  } catch (err) {
    console.error("[/api/jobs/suggest] suggestJobsFromVault failed:", err);
  }

  // Build the applied-jobs lookup once, then decorate each group
  const applied = await buildAppliedMap(userId);

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
        return { suggestion: s, jobs: decorateWithApplied(jobs, applied) };
      } catch (err) {
        console.error(`[/api/jobs/suggest] JSearch failed for "${s.query}":`, err);
        return { suggestion: s, jobs: [] };
      }
    })
  );

  const filtered = groups.filter((g) => g.jobs.length > 0);

  return NextResponse.json({
    suggestions,
    groups: filtered,
    appliedPrefs: { where, remoteOnly, experienceYears: user?.experienceYears ?? null },
  });
}
