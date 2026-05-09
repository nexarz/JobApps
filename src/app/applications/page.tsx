"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn, FadeUpList, FadeUpItem } from "@/components/FadeUp";

type App = { id: string; jobTitle: string; company: string; jobUrl?: string; createdAt: string };

function groupByMonth(apps: App[]) {
  const groups: Record<string, App[]> = {};
  for (const app of apps) {
    const key = new Date(app.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(app);
  }
  return groups;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);

  useEffect(() => {
    fetch("/api/applications").then((r) => r.json()).then(setApps);
  }, []);

  const groups = groupByMonth(apps);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <FadeIn>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--purple)" }}>Applications</p>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
              Past applications
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
      </FadeIn>

      {apps.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="text-center py-20 rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            <div className="text-4xl mb-3">◎</div>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--ink-3)" }}>No applications yet</p>
            <Link
              href="/generate"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ backgroundColor: "var(--ink)", color: "#fff" }}
            >
              Generate your first →
            </Link>
          </div>
        </FadeIn>
      ) : (
        <FadeUpList className="space-y-8">
          {Object.entries(groups).map(([month, monthApps]) => (
            <FadeUpItem key={month}>
              <div>
                <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>{month}</p>
                <div className="space-y-2">
                  {monthApps.map((app) => (
                    <Link
                      key={app.id}
                      href={`/applications/${app.id}`}
                      className="card-hover flex items-center justify-between rounded-2xl border px-5 py-4 transition-all"
                      style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}
                    >
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--ink)" }}>{app.jobTitle}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{app.company}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                          {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <span style={{ color: "var(--ink-3)" }}>→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUpItem>
          ))}
        </FadeUpList>
      )}
    </div>
  );
}
