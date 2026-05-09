"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FadeIn, FadeUpList, FadeUpItem } from "@/components/FadeUp";

export default function Home() {
  const [stats, setStats] = useState({ documents: 0, applications: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/api/documents").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
    ]).then(([docs, apps]) => {
      setStats({ documents: docs.length ?? 0, applications: apps.length ?? 0 });
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <FadeIn>
        <div className="mb-12">
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--purple)" }}>
            your job hunt, but make it iconic
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: "var(--ink)", lineHeight: 1.15 }}>
            Stop sending<br />copy-paste apps.
          </h1>
          <p className="text-base" style={{ color: "var(--ink-3)" }}>
            Drop in a job posting. Get a cover letter, resume, and personal site — written exactly like you, every time.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="flex gap-4 mb-10">
          <Stat value={stats.documents} label="Docs teaching your voice" color="var(--purple)" bg="var(--purple-light)" />
          <Stat value={stats.applications} label="Apps sent into the wild" color="var(--pink)" bg="var(--pink-light)" />
          <Stat value={stats.documents > 0 ? "Locked in 🔥" : "Feed me docs"} label="Voice status" color="var(--mint)" bg="var(--mint-light)" />
        </div>
      </FadeIn>

      <FadeUpList className="space-y-3">
        <FadeUpItem>
          <ActionCard
            href="/generate"
            icon="✦"
            title="Generate application →"
            desc="Paste a job posting, hit go. Cover letter, resume, and a personal site — all sounding like you."
            primary
          />
        </FadeUpItem>
        <FadeUpItem>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard href="/vault" icon="◈" title="Feed the vault" desc="The more past letters you add, the more it sounds like you." />
            <ActionCard href="/applications" icon="◎" title="Past apps" desc="Everything you've fired off — copy, download, revisit." />
          </div>
        </FadeUpItem>
      </FadeUpList>
    </div>
  );
}

function Stat({ value, label, color, bg }: { value: number | string; label: string; color: string; bg: string }) {
  return (
    <div className="flex-1 rounded-2xl px-5 py-4 border" style={{ backgroundColor: bg, borderColor: "var(--border)" }}>
      <div className="text-2xl font-extrabold mb-0.5" style={{ color }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>{label}</div>
    </div>
  );
}

function ActionCard({ href, icon, title, desc, primary }: { href: string; icon: string; title: string; desc: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className="card-hover block rounded-2xl border p-6 transition-all"
      style={{
        backgroundColor: primary ? "var(--ink)" : "var(--paper-2)",
        borderColor: primary ? "var(--ink)" : "var(--border)",
      }}
    >
      <div className="text-2xl mb-3" style={{ color: primary ? "var(--purple-light)" : "var(--purple)" }}>{icon}</div>
      <h2 className="font-bold text-base mb-1.5" style={{ color: primary ? "#fff" : "var(--ink)" }}>{title}</h2>
      <p className="text-sm leading-relaxed" style={{ color: primary ? "rgba(255,255,255,0.6)" : "var(--ink-3)" }}>{desc}</p>
    </Link>
  );
}
