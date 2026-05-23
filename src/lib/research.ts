import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./db";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Cache TTL — re-research a company if the cached profile is older than this
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export type CompanyResearch = {
  name: string;
  website: string | null;
  summary: string | null;
  mission: string | null;
  products: string | null;
  techStack: string | null;
  values: string | null;
  culture: string | null;
  recentNews: string | null;
  sources: string[];
};

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(inc|llc|ltd|co|corp|corporation|company|gmbh)\.?$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

async function tavilySearch(query: string, maxResults = 5): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []) as TavilyResult[];
}

async function summarizeCompany(company: string, results: TavilyResult[]): Promise<CompanyResearch> {
  const corpus = results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n---\n\n");

  const sources = results.map((r) => r.url);

  if (!corpus.trim()) {
    return {
      name: company,
      website: null,
      summary: null,
      mission: null,
      products: null,
      techStack: null,
      values: null,
      culture: null,
      recentNews: null,
      sources: [],
    };
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
  });

  const prompt = `You are a research analyst. Synthesize the search results below into a structured profile of ${company}.

SEARCH RESULTS:
${corpus}

Extract the following. If a field is not clearly supported by the results, return null for that field — do NOT invent details.

Return JSON with exactly these keys:
{
  "website": "primary company website URL or null",
  "summary": "2-3 sentence neutral overview of what the company does and who they serve",
  "mission": "their stated mission or purpose, in their own words if quoted, otherwise null",
  "products": "what they make, sell, or provide — concrete products/services",
  "techStack": "technologies, tools, or platforms they use or are known for (especially for engineering roles), or null",
  "values": "stated company values or cultural principles, or null",
  "culture": "what employees / public sources say about working there (tone, pace, hybrid/remote, etc.), or null",
  "recentNews": "notable recent events: funding, launches, leadership changes, acquisitions, layoffs, awards — only if clearly recent (last ~12 months)"
}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: Record<string, string | null> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  }

  return {
    name: company,
    website: parsed.website ?? null,
    summary: parsed.summary ?? null,
    mission: parsed.mission ?? null,
    products: parsed.products ?? null,
    techStack: parsed.techStack ?? null,
    values: parsed.values ?? null,
    culture: parsed.culture ?? null,
    recentNews: parsed.recentNews ?? null,
    sources,
  };
}

export async function researchCompany(company: string, options: { forceRefresh?: boolean } = {}): Promise<CompanyResearch> {
  const normalizedName = normalize(company);
  if (!normalizedName) {
    return {
      name: company,
      website: null, summary: null, mission: null, products: null,
      techStack: null, values: null, culture: null, recentNews: null, sources: [],
    };
  }

  // Check cache
  const cached = await prisma.companyProfile.findUnique({ where: { normalizedName } });
  const fresh = cached && (Date.now() - cached.researchedAt.getTime() < CACHE_TTL_MS);

  if (cached && fresh && !options.forceRefresh) {
    return {
      name: cached.name,
      website: cached.website,
      summary: cached.summary,
      mission: cached.mission,
      products: cached.products,
      techStack: cached.techStack,
      values: cached.values,
      culture: cached.culture,
      recentNews: cached.recentNews,
      sources: cached.sources ? JSON.parse(cached.sources) : [],
    };
  }

  // Run searches in parallel — overview, mission, recent news
  const [overview, recent, culture] = await Promise.all([
    tavilySearch(`${company} company overview products mission`, 5),
    tavilySearch(`${company} news 2025 2026 funding launch`, 3),
    tavilySearch(`${company} company culture values employees`, 3),
  ]);

  const merged: TavilyResult[] = [...overview, ...recent, ...culture];
  // Dedupe by URL
  const seen = new Set<string>();
  const unique = merged.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  const research = await summarizeCompany(company, unique);

  // Upsert cache
  await prisma.companyProfile.upsert({
    where: { normalizedName },
    create: {
      name: company,
      normalizedName,
      website: research.website,
      summary: research.summary,
      mission: research.mission,
      products: research.products,
      techStack: research.techStack,
      values: research.values,
      culture: research.culture,
      recentNews: research.recentNews,
      sources: JSON.stringify(research.sources),
    },
    update: {
      name: company,
      website: research.website,
      summary: research.summary,
      mission: research.mission,
      products: research.products,
      techStack: research.techStack,
      values: research.values,
      culture: research.culture,
      recentNews: research.recentNews,
      sources: JSON.stringify(research.sources),
      researchedAt: new Date(),
    },
  });

  return research;
}

export async function getCompanyProfileId(company: string): Promise<string | null> {
  const normalizedName = normalize(company);
  if (!normalizedName) return null;
  const profile = await prisma.companyProfile.findUnique({ where: { normalizedName } });
  return profile?.id ?? null;
}

export function formatResearchForPrompt(research: CompanyResearch): string {
  const parts: string[] = [];
  if (research.summary) parts.push(`Overview: ${research.summary}`);
  if (research.mission) parts.push(`Mission: ${research.mission}`);
  if (research.products) parts.push(`Products/Services: ${research.products}`);
  if (research.values) parts.push(`Values: ${research.values}`);
  if (research.culture) parts.push(`Culture: ${research.culture}`);
  if (research.techStack) parts.push(`Tech/Tools: ${research.techStack}`);
  if (research.recentNews) parts.push(`Recent News: ${research.recentNews}`);
  if (parts.length === 0) return "";
  return parts.join("\n");
}
