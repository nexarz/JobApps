"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, FadeUpList, FadeUpItem } from "@/components/FadeUp";
import type { AdzunaJob } from "@/app/api/jobs/search/route";
import type { JobSuggestion } from "@/lib/claude";

const COUNTRIES = [
  { value: "ca", label: "🇨🇦 Canada" },
  { value: "us", label: "🇺🇸 USA" },
  { value: "gb", label: "🇬🇧 UK" },
  { value: "au", label: "🇦🇺 Australia" },
];

type SuggestedGroup = { suggestion: JobSuggestion; jobs: AdzunaJob[] };

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function JobCard({ job, onGenerate }: { job: AdzunaJob; onGenerate: (job: AdzunaJob) => void }) {
  return (
    <div className="rounded-2xl border p-5 transition-all" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-bold" style={{ color: "var(--ink)" }}>{job.title}</h3>
            {formatSalary(job.salaryMin, job.salaryMax) && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--mint-light)", color: "var(--mint)" }}>
                {formatSalary(job.salaryMin, job.salaryMax)}
              </span>
            )}
          </div>
          <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>
            {job.company}
            {job.location && <> · {job.location}</>}
            <> · {timeAgo(job.postedAt)}</>
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
            {job.description.slice(0, 180)}…
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onGenerate(job)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
            style={{ backgroundColor: "var(--ink)", color: "#fff" }}
          >
            Generate →
          </button>
          <a
            href={job.url} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold border text-center transition-all active:scale-95"
            style={{ borderColor: "var(--border)", color: "var(--ink-3)" }}
          >
            View ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [country, setCountry] = useState("ca");

  // Suggested (vault-based) state
  const [groups, setGroups] = useState<SuggestedGroup[]>([]);
  const [suggesting, setSuggesting] = useState(true);
  const [suggestError, setSuggestError] = useState("");

  // Manual search state
  const [searchForm, setSearchForm] = useState({ q: "", where: "" });
  const [searchResults, setSearchResults] = useState<AdzunaJob[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);

  // Load vault-based suggestions on mount
  useEffect(() => {
    loadSuggestions("ca");
  }, []);

  const loadSuggestions = async (c: string) => {
    setSuggesting(true);
    setSuggestError("");
    try {
      const res = await fetch(`/api/jobs/suggest?country=${c}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setGroups(data.groups);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setSuggesting(false);
    }
  };

  const handleCountryChange = (c: string) => {
    setCountry(c);
    setSearched(false);
    setSearchResults([]);
    loadSuggestions(c);
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const params = new URLSearchParams({ q: searchForm.q, where: searchForm.where, country });
      const res = await fetch(`/api/jobs/search?${params}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setSearchResults(data.jobs);
      setSearchTotal(data.total);
      setSearched(true);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const generate = (job: AdzunaJob) => {
    sessionStorage.setItem("pendingJob", JSON.stringify({
      jobTitle: job.title,
      company: job.company,
      jobUrl: job.url,
      jobDesc: job.description,
    }));
    router.push("/generate");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <FadeIn>
        <div className="mb-8">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--purple)" }}>Based on your vault</p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>Jobs for you</h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Roles that match your background — click Generate to apply in seconds.
          </p>
        </div>

        {/* Country selector */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
            {COUNTRIES.map((c) => (
              <button
                key={c.value}
                onClick={() => handleCountryChange(c.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  backgroundColor: country === c.value ? "var(--paper)" : "transparent",
                  color: country === c.value ? "var(--ink)" : "var(--ink-3)",
                  boxShadow: country === c.value ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Vault-based suggestions */}
      {suggesting ? (
        <FadeIn>
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: "var(--border)", borderTopColor: "var(--purple)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--ink-3)" }}>Reading your vault and finding matches...</p>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl border animate-pulse" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }} />
            ))}
          </div>
        </FadeIn>
      ) : suggestError ? (
        <FadeIn>
          <p className="text-sm px-4 py-3 rounded-xl border mb-8" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>
            {suggestError}
          </p>
        </FadeIn>
      ) : groups.length === 0 ? (
        <FadeIn>
          <div className="text-center py-10 rounded-2xl border mb-8" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>Add documents to your vault to get personalised suggestions.</p>
          </div>
        </FadeIn>
      ) : (
        <FadeUpList className="space-y-8 mb-10">
          {groups.map(({ suggestion, jobs }) => (
            <FadeUpItem key={suggestion.query}>
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--purple)" }}>
                      {suggestion.label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>{suggestion.rationale}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} onGenerate={generate} />
                  ))}
                </div>
              </div>
            </FadeUpItem>
          ))}
        </FadeUpList>
      )}

      {/* Manual search */}
      <FadeIn delay={0.1}>
        <div className="border-t pt-8" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--ink-3)" }}>Search manually</p>
          <form onSubmit={search} className="flex gap-3 mb-4">
            <input
              required value={searchForm.q}
              onChange={(e) => setSearchForm(f => ({ ...f, q: e.target.value }))}
              placeholder="Job title or keywords..."
              className="flex-1 min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
              style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
            <input
              value={searchForm.where}
              onChange={(e) => setSearchForm(f => ({ ...f, where: e.target.value }))}
              placeholder="Location"
              className="w-36 rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
              style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
            <button
              type="submit" disabled={searching}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60 flex-shrink-0"
              style={{ backgroundColor: "var(--ink)", color: "#fff" }}
            >
              {searching ? "..." : "Search →"}
            </button>
          </form>

          {searchError && (
            <p className="text-sm px-4 py-3 rounded-xl border mb-4" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>
              {searchError}
            </p>
          )}

          <AnimatePresence>
            {searched && !searching && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {searchResults.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "var(--ink-3)" }}>No results — try broader keywords.</p>
                ) : (
                  <>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-3)" }}>
                      {searchTotal.toLocaleString()} results — showing {searchResults.length}
                    </p>
                    <div className="space-y-3">
                      {searchResults.map((job) => (
                        <JobCard key={job.id} job={job} onGenerate={generate} />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </FadeIn>
    </div>
  );
}
