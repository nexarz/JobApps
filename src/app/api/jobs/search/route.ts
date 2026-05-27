import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Shape exposed to the UI — kept stable across providers.
export type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt: string;
  remote?: boolean;
  employerLogo?: string;
  appliedAs?: { id: string; status: string } | null;
};

// Normalize for de-dupe: lowercased, stripped of punctuation/whitespace
export function dedupeKey(company: string, title: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${norm(company)}::${norm(title)}`;
}

export type AppliedMap = Map<string, { id: string; status: string }>;

export async function buildAppliedMap(userId: string): Promise<AppliedMap> {
  const apps = await prisma.application.findMany({
    where: { userId },
    select: { id: true, jobTitle: true, company: true, status: true },
  });
  const map: AppliedMap = new Map();
  for (const a of apps) {
    map.set(dedupeKey(a.company, a.jobTitle), { id: a.id, status: a.status });
  }
  return map;
}

export function decorateWithApplied(jobs: JobListing[], applied: AppliedMap): JobListing[] {
  return jobs.map((j) => ({
    ...j,
    appliedAs: applied.get(dedupeKey(j.company, j.title)) ?? null,
  }));
}

// Back-compat alias for any older imports
export type AdzunaJob = JobListing;

type JSearchResult = {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  employer_logo?: string;
  job_apply_link?: string;
  job_description?: string;
  job_is_remote?: boolean;
  job_posted_at_datetime_utc?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_min_salary?: number;
  job_max_salary?: number;
};

function locationOf(j: JSearchResult): string {
  return [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ");
}

function mapJob(j: JSearchResult): JobListing {
  return {
    id: j.job_id ?? `${j.employer_name}-${j.job_title}-${j.job_posted_at_datetime_utc}`,
    title: j.job_title ?? "",
    company: j.employer_name ?? "Unknown",
    location: locationOf(j),
    description: (j.job_description ?? "").trim(),
    url: j.job_apply_link ?? "",
    salaryMin: j.job_min_salary,
    salaryMax: j.job_max_salary,
    postedAt: j.job_posted_at_datetime_utc ?? new Date().toISOString(),
    remote: j.job_is_remote === true,
    employerLogo: j.employer_logo,
  };
}

export async function searchJSearch(opts: {
  query: string;
  country?: string;
  remoteOnly?: boolean;
  where?: string;
  limit?: number;
}): Promise<JobListing[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("RAPIDAPI_KEY not configured");

  let query = opts.query;
  if (opts.where) query = `${query} in ${opts.where}`;

  const params = new URLSearchParams({
    query,
    page: "1",
    num_pages: "1",
    country: opts.country ?? "ca",
    date_posted: "month",
  });
  if (opts.remoteOnly) params.set("work_from_home", "true");

  const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JSearch error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const results: JSearchResult[] = data.data ?? [];
  const limit = opts.limit ?? results.length;
  return results.slice(0, limit).map(mapJob);
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const what = searchParams.get("q") ?? "";
  const whereParam = searchParams.get("where");
  const country = searchParams.get("country") ?? "ca";
  const remoteOnly = searchParams.get("remote") === "1";

  if (!what.trim()) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const where = whereParam ?? user?.location ?? "";

  try {
    const [jobs, applied] = await Promise.all([
      searchJSearch({ query: what, country, remoteOnly, where, limit: 20 }),
      buildAppliedMap(userId),
    ]);
    return NextResponse.json({ jobs: decorateWithApplied(jobs, applied), total: jobs.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 502 }
    );
  }
}
