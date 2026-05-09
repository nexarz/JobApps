"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

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
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-16 animate-slide-up">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-pink-100 text-pink-600 text-sm font-medium">
          AI-Powered Job Applications
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-rose-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
          Land Your Dream Job
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto">
          Generate perfectly tailored cover letters, resumes, and personal application sites — all in your voice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard label="Documents in Vault" value={stats.documents} color="rose" />
        <StatCard label="Applications Created" value={stats.applications} color="pink" />
        <StatCard label="Voice Trained" value={stats.documents > 0 ? "Yes" : "No"} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard
          href="/vault"
          title="Document Vault"
          desc="Upload your past cover letters and resumes so the AI can learn your voice and experience."
          icon="🗄️"
          color="from-rose-400 to-pink-400"
        />
        <ActionCard
          href="/generate"
          title="Generate Application"
          desc="Paste a job posting and get a tailored cover letter, resume, and personal website instantly."
          icon="✨"
          color="from-pink-400 to-purple-400"
          primary
        />
        <ActionCard
          href="/applications"
          title="Past Applications"
          desc="Browse all your previously generated applications and download any materials."
          icon="📁"
          color="from-purple-400 to-rose-400"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    rose: "from-rose-50 to-pink-50 border-rose-100 text-rose-500",
    pink: "from-pink-50 to-purple-50 border-pink-100 text-pink-500",
    purple: "from-purple-50 to-rose-50 border-purple-100 text-purple-500",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 ${colors[color]}`}>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </div>
  );
}

function ActionCard({
  href, title, desc, icon, color, primary,
}: {
  href: string; title: string; desc: string; icon: string; color: string; primary?: boolean;
}) {
  return (
    <Link href={href} className={`group block rounded-2xl p-6 border transition-all hover:shadow-lg hover:-translate-y-1 ${
      primary
        ? `bg-gradient-to-br ${color} text-white border-transparent shadow-md`
        : "bg-white border-pink-100 hover:border-pink-200"
    }`}>
      <div className="text-3xl mb-3">{icon}</div>
      <h2 className={`font-semibold text-lg mb-2 ${primary ? "text-white" : "text-slate-800"}`}>{title}</h2>
      <p className={`text-sm ${primary ? "text-white/80" : "text-slate-500"}`}>{desc}</p>
    </Link>
  );
}
