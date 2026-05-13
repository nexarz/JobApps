import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

export type AdzunaJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const what = searchParams.get("q") ?? "";
  const where = searchParams.get("where") ?? "";
  const country = searchParams.get("country") ?? "ca";

  if (!what.trim()) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json({ error: "Adzuna API credentials not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "20",
    what,
    ...(where ? { where } : {}),
    "content-type": "application/json",
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Adzuna error: ${text}` }, { status: 502 });
  }

  const data = await res.json();

  const jobs: AdzunaJob[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
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

  return NextResponse.json({ jobs, total: data.count ?? 0 });
}
