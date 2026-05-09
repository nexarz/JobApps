"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/FadeUp";
import type { AnalysisResult } from "@/lib/claude";

type Application = {
  id: string; jobTitle: string; company: string; jobUrl?: string;
  coverLetter: string; resume: string; websiteHtml: string; createdAt: string;
  jobDesc: string;
};
type Tab = "cover_letter" | "resume" | "website" | "analyze";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [tab, setTab] = useState<Tab>("cover_letter");
  const [toast, setToast] = useState("");

  // analyze state
  const [analyzeType, setAnalyzeType] = useState<"resume" | "cover_letter">("cover_letter");
  const [analyzeText, setAnalyzeText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  useEffect(() => {
    fetch(`/api/applications/${id}`).then((r) => r.json()).then((data) => {
      setApp(data);
      setAnalyzeText(data.coverLetter ?? "");
    });
  }, [id]);

  // sync textarea when type changes
  useEffect(() => {
    if (!app) return;
    setAnalyzeText(analyzeType === "resume" ? app.resume : app.coverLetter);
    setAnalysis(null);
    setAnalyzeError("");
  }, [analyzeType, app]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  };

  const download = (filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded");
  };

  const del = async () => {
    if (!confirm("Delete this application?")) return;
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    router.push("/applications");
  };

  const runAnalysis = async () => {
    if (!app || !analyzeText.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: analyzeText,
          type: analyzeType,
          jobDesc: app.jobDesc,
          jobTitle: app.jobTitle,
          company: app.company,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnalysis(await res.json());
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!app) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--purple)" }} />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "cover_letter", label: "Cover Letter" },
    { key: "resume", label: "Resume" },
    { key: "website", label: "Personal Site" },
    { key: "analyze", label: "ATS Check" },
  ];

  const activeContent = tab === "cover_letter" ? app.coverLetter : app.resume;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-bold shadow-lg"
            style={{ backgroundColor: "var(--ink)", color: "#fff" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <FadeIn>
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/applications" className="text-xs font-semibold mb-3 inline-flex items-center gap-1 transition-all"
              style={{ color: "var(--ink-3)" }}>
              ← Applications
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{app.jobTitle}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>{app.company}</p>
              <span style={{ color: "var(--border)" }}>·</span>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                {new Date(app.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              {app.jobUrl && (
                <>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="text-sm transition-all" style={{ color: "var(--purple)" }}>
                    Job posting ↗
                  </a>
                </>
              )}
            </div>
          </div>
          <button onClick={del} className="text-xs font-semibold transition-all" style={{ color: "var(--ink-3)" }}>
            Delete
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl border inline-flex" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.key} onClick={() => setTab(t.key)}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 relative"
              style={{ color: tab === t.key ? "var(--ink)" : "var(--ink-3)" }}
            >
              {tab === t.key && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: "var(--paper)" }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {tab === "website" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => download(`${app.company}-site.html`, app.websiteHtml, "text/html")}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ backgroundColor: "var(--ink)", color: "#fff" }}
                >Download HTML</button>
                <button
                  onClick={() => copy(app.websiteHtml)}
                  className="px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95"
                  style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
                >Copy HTML</button>
              </div>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <iframe srcDoc={app.websiteHtml} className="w-full" style={{ height: 580, border: "none" }} title="Application website" />
              </div>
            </div>

          ) : tab === "analyze" ? (
            <div className="space-y-5">
              {/* Type selector */}
              <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
                {(["cover_letter", "resume"] as const).map((t) => (
                  <button
                    key={t} onClick={() => setAnalyzeType(t)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                    style={{
                      backgroundColor: analyzeType === t ? "var(--paper)" : "transparent",
                      color: analyzeType === t ? "var(--ink)" : "var(--ink-3)",
                      boxShadow: analyzeType === t ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                    }}
                  >
                    {t === "cover_letter" ? "Cover Letter" : "Resume"}
                  </button>
                ))}
              </div>

              {/* Editable textarea */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--ink-2)" }}>
                    Paste your edited version here
                  </p>
                  <button
                    onClick={() => setAnalyzeText(analyzeType === "resume" ? app.resume : app.coverLetter)}
                    className="text-xs font-semibold transition-all"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Reset to generated
                  </button>
                </div>
                <textarea
                  value={analyzeText}
                  onChange={(e) => { setAnalyzeText(e.target.value); setAnalysis(null); }}
                  rows={14}
                  className="w-full px-6 py-4 text-sm leading-relaxed resize-none outline-none font-sans"
                  style={{ color: "var(--ink-2)", backgroundColor: "var(--paper)" }}
                  placeholder="Paste your edited text here..."
                />
              </div>

              <button
                onClick={runAnalysis}
                disabled={analyzing || !analyzeText.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: "var(--ink)", color: "#fff" }}
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "#fff" }} />
                    Analyzing against 2026 ATS standards...
                  </span>
                ) : "Run ATS Check →"}
              </button>

              {analyzeError && (
                <p className="text-xs font-semibold px-4 py-3 rounded-xl border" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>
                  {analyzeError}
                </p>
              )}

              {/* Results */}
              <AnimatePresence>
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Overall score */}
                    <div className="rounded-2xl border p-6 flex items-center gap-6" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                      <div className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: scoreColor(analysis.score).bg }}>
                        <span className="text-3xl font-extrabold" style={{ color: scoreColor(analysis.score).text }}>
                          {analysis.score}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ink-3)" }}>ATS Score</p>
                        <p className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>{analysis.summary}</p>
                      </div>
                    </div>

                    {/* Section scores */}
                    <div className="space-y-3">
                      {analysis.sections.map((section) => (
                        <div key={section.name} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: statusDot(section.status).color }}>
                                {statusDot(section.status).icon}
                              </span>
                              <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{section.name}</p>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: scoreColor(section.score).bg, color: scoreColor(section.score).text }}>
                              {section.score}/100
                            </span>
                          </div>
                          {/* Score bar */}
                          <div className="w-full h-1.5 rounded-full mb-3" style={{ backgroundColor: "var(--border)" }}>
                            <div className="h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${section.score}%`, backgroundColor: scoreColor(section.score).text }} />
                          </div>
                          <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--ink-3)" }}>{section.feedback}</p>
                          {section.suggestions.length > 0 && (
                            <ul className="space-y-1">
                              {section.suggestions.map((s, i) => (
                                <li key={i} className="text-xs flex gap-2" style={{ color: "var(--ink-2)" }}>
                                  <span style={{ color: "var(--purple)" }}>→</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Critical fixes + quick wins */}
                    <div className="grid grid-cols-2 gap-3">
                      {analysis.criticalFixes.length > 0 && (
                        <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>
                          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--pink)" }}>Critical fixes</p>
                          <ul className="space-y-2">
                            {analysis.criticalFixes.map((f, i) => (
                              <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: "var(--ink-2)" }}>
                                <span style={{ color: "var(--pink)" }}>!</span>{f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.quickWins.length > 0 && (
                        <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--mint-light)", borderColor: "rgba(100,200,150,0.3)" }}>
                          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--mint)" }}>Quick wins</p>
                          <ul className="space-y-2">
                            {analysis.quickWins.map((w, i) => (
                              <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: "var(--ink-2)" }}>
                                <span style={{ color: "var(--mint)" }}>✓</span>{w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-2 px-5 py-3 border-b" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                <button
                  onClick={() => copy(activeContent)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ backgroundColor: "var(--ink)", color: "#fff" }}
                >Copy</button>
                <button
                  onClick={() => download(`${app.company}-${tab}.txt`, activeContent)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                  style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
                >Download</button>
              </div>
              <pre className="p-6 text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "var(--ink-2)", backgroundColor: "var(--paper)" }}>
                {activeContent}
              </pre>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return { bg: "var(--mint-light)", text: "var(--mint)" };
  if (score >= 50) return { bg: "var(--peach-light)", text: "var(--peach)" };
  return { bg: "var(--pink-light)", text: "var(--pink)" };
}

function statusDot(status: "pass" | "warn" | "fail") {
  if (status === "pass") return { icon: "●", color: "var(--mint)" };
  if (status === "warn") return { icon: "●", color: "var(--peach)" };
  return { icon: "●", color: "var(--pink)" };
}
