"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FadeIn, FadeUpList, FadeUpItem } from "@/components/FadeUp";

type App = {
  id: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  status: string;
  currentStage?: string | null;
  location?: string | null;
  remote?: boolean | null;
  appliedAt?: string | null;
  lastActivityAt: string;
  createdAt: string;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  saved:      { label: "Saved",      color: "var(--ink-3)", bg: "var(--paper-3)" },
  applied:    { label: "Applied",    color: "var(--purple)", bg: "var(--purple-light, rgba(192,132,252,0.15))" },
  screening:  { label: "Screening",  color: "var(--peach)", bg: "var(--peach-light)" },
  interview:  { label: "Interview",  color: "var(--mint)", bg: "var(--mint-light)" },
  offer:      { label: "Offer",      color: "var(--mint)", bg: "var(--mint-light)" },
  rejected:   { label: "Rejected",   color: "var(--pink)", bg: "var(--pink-light)" },
  ghosted:    { label: "Ghosted",    color: "var(--ink-3)", bg: "var(--paper-3)" },
  withdrawn:  { label: "Withdrawn",  color: "var(--ink-3)", bg: "var(--paper-3)" },
};

const STATUS_ORDER = ["saved", "applied", "screening", "interview", "offer", "rejected", "ghosted", "withdrawn"];
const FILTERS: { value: string | "all" | "active"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "all", label: "All" },
  ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label })),
];

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.saved;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState<string>("active");

  useEffect(() => {
    fetch("/api/applications").then((r) => r.json()).then(setApps);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return apps;
    if (filter === "active") {
      return apps.filter((a) => !["rejected", "ghosted", "withdrawn"].includes(a.status));
    }
    return apps.filter((a) => a.status === filter);
  }, [apps, filter]);

  // Counts for filter badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length, active: 0 };
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const a of apps) {
      c[a.status] = (c[a.status] ?? 0) + 1;
      if (!["rejected", "ghosted", "withdrawn"].includes(a.status)) c.active++;
    }
    return c;
  }, [apps]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <FadeIn>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--purple)" }}>Applications</p>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
              Shot your shot
            </h1>
          </div>
          {apps.length > 0 && (
            <Link
              href="/generate"
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ backgroundColor: "var(--ink)", color: "#fff" }}
            >
              + New
            </Link>
          )}
        </div>

        {apps.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-8 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: filter === f.value ? "var(--paper)" : "transparent",
                  color: filter === f.value ? "var(--ink)" : "var(--ink-3)",
                  boxShadow: filter === f.value ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                }}
              >
                {f.label}
                {counts[f.value] > 0 && (
                  <span className="text-[10px] opacity-60">{counts[f.value]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </FadeIn>

      {filtered.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="text-center py-20 rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            <div className="text-4xl mb-3">◎</div>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--ink-3)" }}>
              {apps.length === 0 ? "Nothing here yet — go get that bag" : "No applications match this filter"}
            </p>
            {apps.length === 0 && (
              <Link
                href="/generate"
                className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ backgroundColor: "var(--ink)", color: "#fff" }}
              >
                Fire off your first one →
              </Link>
            )}
          </div>
        </FadeIn>
      ) : (
        <FadeUpList className="space-y-2">
          {filtered.map((app) => (
            <FadeUpItem key={app.id}>
              <Link
                href={`/applications/${app.id}`}
                className="card-hover flex items-center justify-between rounded-2xl border px-5 py-4 transition-all"
                style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm truncate" style={{ color: "var(--ink)" }}>{app.jobTitle}</p>
                    <StatusPill status={app.status} />
                  </div>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    {app.company}
                    {app.currentStage && <> · {app.currentStage}</>}
                    {app.location && <> · {app.location}</>}
                    {app.remote && <> · Remote</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    {new Date(app.lastActivityAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <span style={{ color: "var(--ink-3)" }}>→</span>
                </div>
              </Link>
            </FadeUpItem>
          ))}
        </FadeUpList>
      )}
    </div>
  );
}
