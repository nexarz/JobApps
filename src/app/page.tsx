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
            AI-powered applications
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: "var(--ink)", lineHeight: 1.15 }}>
            Land your<br />dream role.
          </h1>
          <p className="text-base" style={{ color: "var(--ink-3)" }}>
            Generate perfectly tailored cover letters, resumes, and personal sites — all in your voice.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="flex gap-4 mb-10">
          <Stat value={stats.documents} label="Documents in vault" color="var(--purple)" bg="var(--purple-light)" />
          <Stat value={stats.applications} label="Applications created" color="var(--pink)" bg="var(--pink-light)" />
          <Stat value={stats.documents > 0 ? "Ready" : "Empty"} label="Voice model" color="var(--mint)" bg="var(--mint-light)" />
        </div>
      </FadeIn>

      <FadeUpList className="space-y-3">
        <FadeUpItem>
          <ActionCard
            href="/generate"
            icon="✦"
            title="Generate application"
            desc="Paste a job description and get a tailored cover letter, resume, and personal site in seconds."
            primary
          />
        </FadeUpItem>
        <FadeUpItem>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard href="/vault" icon="◈" title="Document vault" desc="Upload past cover letters so the AI learns your voice." />
            <ActionCard href="/applications" icon="◎" title="Past applications" desc="Browse and download everything you've generated." />
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
