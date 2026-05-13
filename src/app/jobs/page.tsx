"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, FadeUpList, FadeUpItem } from "@/components/FadeUp";
import type { AdzunaJob } from "@/app/api/jobs/search/route";

const COUNTRIES = [
  { value: "ca", label: "🇨🇦 Canada" },
  { value: "us", label: "🇺🇸 USA" },
  { value: "gb", label: "🇬🇧 UK" },
  { value: "au", label: "🇦🇺 Australia" },
];

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
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

export default function JobsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ q: "", where: "", country: "ca" });
  const [jobs, setJobs] = useState<AdzunaJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setJobs([]);
    try {
      const params = new URLSearchParams({ q: form.q, where: form.where, country: form.country });
      const res = await fetch(`/api/jobs/search?${params}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
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
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--purple)" }}>Find your next role</p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>Job search</h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Find a posting you like, hit Generate — we'll do the rest.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <form onSubmit={search} className="space-y-3 mb-8">
          <div className="flex gap-3">
            <input
              required value={form.q}
              onChange={(e) => setForm(f => ({ ...f, q: e.target.value }))}
              placeholder="Job title or keywords..."
              className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm outline-none border transition-all"
              style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
            <input
              value={form.where}
              onChange={(e) => setForm(f => ({ ...f, where: e.target.value }))}
              placeholder="Location (optional)"
              className="w-44 rounded-xl px-4 py-3 text-sm outline-none border transition-all"
              style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
              {COUNTRIES.map((c) => (
                <button
                  key={c.value} type="button"
                  onClick={() => setForm(f => ({ ...f, country: c.value }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: form.country === c.value ? "var(--paper)" : "transparent",
                    color: form.country === c.value ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: form.country === c.value ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="submit" disabled={loading}
              className="ml-auto px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--ink)", color: "#fff" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "#fff" }} />
                  Searching...
                </span>
              ) : "Search →"}
            </button>
          </div>
        </form>
      </FadeIn>

      {error && (
        <FadeIn>
          <p className="text-sm px-4 py-3 rounded-xl border mb-6" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>
            {error}
          </p>
        </FadeIn>
      )}

      <AnimatePresence mode="wait">
        {searched && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {jobs.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                <div className="text-3xl mb-3">◎</div>
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>No results found. Try broader keywords.</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--ink-3)" }}>
                  {total.toLocaleString()} results — showing {jobs.length}
                </p>
                <FadeUpList className="space-y-3">
                  {jobs.map((job) => (
                    <FadeUpItem key={job.id}>
                      <div
                        className="rounded-2xl border p-5 transition-all"
                        style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>{job.title}</h2>
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
                            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--ink-3)" }}>
                              {job.description.slice(0, 200)}…
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => generate(job)}
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
                              View post ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    </FadeUpItem>
                  ))}
                </FadeUpList>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
