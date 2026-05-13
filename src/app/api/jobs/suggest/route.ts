import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { suggestJobsFromVault } from "@/lib/claude";
import type { AdzunaJob } from "../search/route";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function searchAdzuna(query: string, country: string): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "8",
    what: query,
    "content-type": "application/json",
  });

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    title: r.title as string,
    company: (r.company as { display_name: string })?.display_name ?? "Unknown",
    location: (r.location as { display_name: string })?.display_name ?? "",
    description: stripHtml((r.description as string) ?? ""),
    url: r.redirect_url as string,
    salaryMin: r.salary_min as number | undefined,
    salaryMax: r.salary_max as number | undefined,
    postedAt: r.created as string,
  }));
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const country = new URL(req.url).searchParams.get("country") ?? "ca";

  const documents = await prisma.document.findMany({ where: { userId } });

  if (documents.length === 0) {
    return NextResponse.json({ suggestions: [], groups: [] });
  }

  // Get 4 role suggestions from Gemini based on vault
  const suggestions = await suggestJobsFromVault(documents);

  // Search Adzuna for each suggestion in parallel
  const groups = await Promise.all(
    suggestions.map(async (s) => ({
      suggestion: s,
      jobs: await searchAdzuna(s.query, country),
    }))
  );

  // Only return groups that have results
  const filtered = groups.filter((g) => g.jobs.length > 0);

  return NextResponse.json({ suggestions, groups: filtered });
}
