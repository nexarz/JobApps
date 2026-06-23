"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/FadeUp";
import type { AnalysisResult, InterviewPrepContent } from "@/lib/claude";

type Event = {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  occurredAt: string;
};

type CompanyProfile = {
  id: string;
  name: string;
  website: string | null;
  summary: string | null;
  mission: string | null;
  products: string | null;
  techStack: string | null;
  values: string | null;
  culture: string | null;
  recentNews: string | null;
  sources: string | null;
  researchedAt: string;
};

type Prep = {
  id: string;
  stage: string;
  createdAt: string;
  content: InterviewPrepContent;
};

type Application = {
  id: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  jobDesc: string;
  coverLetter: string;
  resume: string;
  websiteHtml: string;
  status: string;
  currentStage: string | null;
  location: string | null;
  remote: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  notes: string | null;
  appliedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  companyProfile: CompanyProfile | null;
  events: Event[];
  interviewPreps: { id: string; stage: string; content: string; createdAt: string }[];
};

type Tab = "tracker" | "company" | "prep" | "cover_letter" | "resume" | "website" | "analyze";

const STATUS_OPTIONS = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "ghosted", label: "Ghosted" },
  { value: "withdrawn", label: "Withdrawn" },
];

const STAGE_OPTIONS = [
  { value: "recruiter_screen", label: "Recruiter screen" },
  { value: "hiring_manager", label: "Hiring manager" },
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "onsite", label: "Onsite / panel" },
  { value: "exec", label: "Executive / final" },
];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [tab, setTab] = useState<Tab>("tracker");
  const [toast, setToast] = useState("");

  // Analyze
  const [analyzeType, setAnalyzeType] = useState<"resume" | "cover_letter">("cover_letter");
  const [analyzeText, setAnalyzeText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");
  // Improve
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState("");
  const [hasUnsavedImprovement, setHasUnsavedImprovement] = useState(false);
  const [savingImprovement, setSavingImprovement] = useState(false);

  // Tracker editable state
  const [status, setStatus] = useState("saved");
  const [currentStage, setCurrentStage] = useState("");
  const [notes, setNotes] = useState("");
  const [savingTracker, setSavingTracker] = useState(false);

  // Note input
  const [newNote, setNewNote] = useState("");

  // Company research
  const [researching, setResearching] = useState(false);

  // Interview prep
  const [prepStage, setPrepStage] = useState<string>("hiring_manager");
  const [generatingPrep, setGeneratingPrep] = useState(false);
  const [prepError, setPrepError] = useState("");
  const [activePrep, setActivePrep] = useState<Prep | null>(null);

  const load = useCallback(async () => {
    const data: Application = await fetch(`/api/applications/${id}`).then((r) => r.json());
    setApp(data);
    setAnalyzeText(data.coverLetter ?? "");
    setStatus(data.status);
    setCurrentStage(data.currentStage ?? "");
    setNotes(data.notes ?? "");
    // Hydrate first prep if any
    if (data.interviewPreps.length > 0) {
      const latest = data.interviewPreps[0];
      setActivePrep({ id: latest.id, stage: latest.stage, createdAt: latest.createdAt, content: JSON.parse(latest.content) });
      setPrepStage(latest.stage);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!app) return;
    setAnalyzeText(analyzeType === "resume" ? app.resume : app.coverLetter);
    setAnalysis(null);
    setAnalyzeError("");
    setImproveError("");
    setHasUnsavedImprovement(false);
  }, [analyzeType, app]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    showToast("Copied");
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

  const saveTracker = async () => {
    setSavingTracker(true);
    try {
      await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, currentStage: currentStage || null, notes: notes || null }),
      });
      showToast("Saved");
      await load();
    } finally {
      setSavingTracker(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    await fetch(`/api/applications/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", title: newNote.trim() }),
    });
    setNewNote("");
    await load();
  };

  const logInterview = async (type: "interview_scheduled" | "interview_completed") => {
    const title = prompt(type === "interview_scheduled" ? "What's scheduled? (e.g. Recruiter screen on Tue)" : "How did it go? (one line)");
    if (!title) return;
    await fetch(`/api/applications/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title }),
    });
    await load();
  };

  const refreshResearch = async () => {
    if (!app) return;
    setResearching(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: app.company, forceRefresh: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Research failed");
      }
      await load();
      showToast("Research refreshed");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Research failed");
    } finally {
      setResearching(false);
    }
  };

  const generatePrep = async () => {
    setGeneratingPrep(true);
    setPrepError("");
    try {
      const res = await fetch(`/api/applications/${id}/prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: prepStage }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      setActivePrep({ id: data.id, stage: data.stage, createdAt: data.createdAt, content: data.content });
      await load();
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGeneratingPrep(false);
    }
  };

  const improveWithAnalysis = async () => {
    if (!app || !analysis) return;
    setImproving(true);
    setImproveError("");
    try {
      const res = await fetch(`/api/applications/${id}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: analyzeType, text: analyzeText, analysis }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Improvement failed");
      const { improved } = await res.json();
      setAnalyzeText(improved);
      setAnalysis(null);
      setHasUnsavedImprovement(true);
    } catch (e) {
      setImproveError(e instanceof Error ? e.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  };

  const saveImprovement = async () => {
    if (!app) return;
    setSavingImprovement(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          analyzeType === "cover_letter"
            ? { coverLetter: analyzeText }
            : { resume: analyzeText }
        ),
      });
      if (!res.ok) throw new Error("Save failed");
      await load();
      setHasUnsavedImprovement(false);
      showToast("Saved");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingImprovement(false);
    }
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
    { key: "tracker", label: "Tracker" },
    { key: "company", label: "Company" },
    { key: "prep", label: "Prep" },
    { key: "cover_letter", label: "Cover Letter" },
    { key: "resume", label: "Resume" },
    { key: "website", label: "Site" },
    { key: "analyze", label: "ATS" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
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
            <Link href="/applications" className="text-xs font-semibold mb-3 inline-flex items-center gap-1" style={{ color: "var(--ink-3)" }}>
              ← Applications
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{app.jobTitle}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>{app.company}</p>
              <span style={{ color: "var(--border)" }}>·</span>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                {new Date(app.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              {app.jobUrl && (
                <>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: "var(--purple)" }}>
                    Job posting ↗
                  </a>
                </>
              )}
            </div>
          </div>
          <button onClick={del} className="text-xs font-semibold" style={{ color: "var(--ink-3)" }}>
            Delete
          </button>
        </div>

        <div className="flex gap-1 mb-6 p-1 rounded-2xl border inline-flex flex-wrap" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 relative"
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
          transition={{ duration: 0.25 }}
        >
          {tab === "tracker" && (
            <div className="space-y-5">
              <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--ink-3)" }}>Status</label>
                  <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ backgroundColor: "var(--paper-3)" }}>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStatus(s.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          backgroundColor: status === s.value ? "var(--paper)" : "transparent",
                          color: status === s.value ? "var(--ink)" : "var(--ink-3)",
                          boxShadow: status === s.value ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--ink-3)" }}>Current stage</label>
                  <input
                    value={currentStage}
                    onChange={(e) => setCurrentStage(e.target.value)}
                    placeholder="e.g. Waiting on recruiter, Onsite scheduled..."
                    className="w-full rounded-xl px-4 py-2 text-sm outline-none border"
                    style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--ink-3)" }}>Private notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Salary range, points of contact, gut feel..."
                    className="w-full rounded-xl px-4 py-2 text-sm outline-none border resize-none"
                    style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
                  />
                </div>

                <button
                  onClick={saveTracker}
                  disabled={savingTracker}
                  className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: "var(--ink)", color: "#fff" }}
                >
                  {savingTracker ? "Saving..." : "Save"}
                </button>
              </div>

              <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Timeline</p>
                  <div className="flex gap-2">
                    <button onClick={() => logInterview("interview_scheduled")} className="text-xs font-bold px-3 py-1 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}>
                      + Interview scheduled
                    </button>
                    <button onClick={() => logInterview("interview_completed")} className="text-xs font-bold px-3 py-1 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}>
                      + Interview completed
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNote()}
                    placeholder="Quick note..."
                    className="flex-1 rounded-xl px-4 py-2 text-sm outline-none border"
                    style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
                  />
                  <button onClick={addNote} className="px-3 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: "var(--ink)", color: "#fff" }}>
                    Add
                  </button>
                </div>

                {app.events.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--ink-3)" }}>No events yet — log your first one above.</p>
                ) : (
                  <ul className="space-y-3">
                    {app.events.map((e) => (
                      <li key={e.id} className="flex gap-3 text-xs">
                        <span className="flex-shrink-0 mt-0.5" style={{ color: "var(--purple)" }}>●</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold" style={{ color: "var(--ink)" }}>{e.title}</p>
                          {e.notes && <p className="mt-0.5" style={{ color: "var(--ink-3)" }}>{e.notes}</p>}
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                            {new Date(e.occurredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "company" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>
                  Company research
                  {app.companyProfile && (
                    <span className="ml-2 font-normal lowercase" style={{ color: "var(--ink-3)" }}>
                      · researched {new Date(app.companyProfile.researchedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
                <button
                  onClick={refreshResearch}
                  disabled={researching}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-60"
                  style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
                >
                  {researching ? "Researching..." : app.companyProfile ? "Refresh" : "Run research"}
                </button>
              </div>

              {!app.companyProfile ? (
                <div className="text-center py-10 rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                    No research yet — click <span className="font-bold">Run research</span> to gather context on {app.company}.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                  {[
                    ["Overview", app.companyProfile.summary],
                    ["Mission", app.companyProfile.mission],
                    ["Products / Services", app.companyProfile.products],
                    ["Values", app.companyProfile.values],
                    ["Culture", app.companyProfile.culture],
                    ["Tech / Tools", app.companyProfile.techStack],
                    ["Recent News", app.companyProfile.recentNews],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--purple)" }}>{k}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{v}</p>
                    </div>
                  ))}
                  {app.companyProfile.sources && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>Sources</p>
                      <ul className="space-y-1">
                        {(JSON.parse(app.companyProfile.sources) as string[]).map((url, i) => (
                          <li key={i} className="text-xs truncate">
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--purple)" }}>
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "prep" && (
            <div className="space-y-5">
              <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--ink-3)" }}>Stage to prep for</label>
                  <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ backgroundColor: "var(--paper-3)" }}>
                    {STAGE_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setPrepStage(s.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          backgroundColor: prepStage === s.value ? "var(--paper)" : "transparent",
                          color: prepStage === s.value ? "var(--ink)" : "var(--ink-3)",
                          boxShadow: prepStage === s.value ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={generatePrep}
                  disabled={generatingPrep}
                  className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: "var(--ink)", color: "#fff" }}
                >
                  {generatingPrep ? "Generating prep guide..." : "Generate prep guide →"}
                </button>
                {prepError && (
                  <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)" }}>{prepError}</p>
                )}

                {app.interviewPreps.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>Saved preps</p>
                    <div className="flex flex-wrap gap-2">
                      {app.interviewPreps.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setActivePrep({ id: p.id, stage: p.stage, createdAt: p.createdAt, content: JSON.parse(p.content) })}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border"
                          style={{
                            borderColor: activePrep?.id === p.id ? "var(--ink)" : "var(--border)",
                            color: "var(--ink-2)",
                            backgroundColor: activePrep?.id === p.id ? "var(--paper-3)" : "transparent",
                          }}
                        >
                          {STAGE_OPTIONS.find((s) => s.value === p.stage)?.label ?? p.stage} · {new Date(p.createdAt).toLocaleDateString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activePrep && (
                <div className="space-y-4">
                  <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--purple)" }}>What to expect</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{activePrep.content.stageOverview}</p>
                  </div>

                  {activePrep.content.tips?.length > 0 && (
                    <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--purple)" }}>Tips</p>
                      <ul className="space-y-2">
                        {activePrep.content.tips.map((t, i) => (
                          <li key={i} className="text-sm flex gap-2" style={{ color: "var(--ink-2)" }}>
                            <span style={{ color: "var(--mint)" }}>✓</span>{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--purple)" }}>Mock questions</p>
                    <ul className="space-y-4">
                      {activePrep.content.questions.map((q, i) => (
                        <li key={i} className="border-l-2 pl-4" style={{ borderColor: "var(--border)" }}>
                          <p className="text-sm font-bold mb-1" style={{ color: "var(--ink)" }}>{q.question}</p>
                          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>{q.category}</p>
                          <p className="text-xs italic mb-2" style={{ color: "var(--ink-3)" }}>Why asked: {q.whyAsked}</p>
                          <p className="text-xs mb-2" style={{ color: "var(--ink-2)" }}><span className="font-bold">Approach:</span> {q.approach}</p>
                          {q.draftAnswer && (
                            <div className="rounded-lg p-3 mt-2" style={{ backgroundColor: "var(--paper-3)" }}>
                              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--purple)" }}>Draft answer</p>
                              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>{q.draftAnswer}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {activePrep.content.questionsToAsk?.length > 0 && (
                    <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--purple)" }}>Ask the interviewer</p>
                      <ul className="space-y-2">
                        {activePrep.content.questionsToAsk.map((q, i) => (
                          <li key={i} className="text-sm flex gap-2" style={{ color: "var(--ink-2)" }}>
                            <span style={{ color: "var(--purple)" }}>?</span>{q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {activePrep.content.redFlags?.length > 0 && (
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--pink)" }}>Red flags to watch</p>
                        <ul className="space-y-2">
                          {activePrep.content.redFlags.map((r, i) => (
                            <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: "var(--ink-2)" }}>
                              <span style={{ color: "var(--pink)" }}>!</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activePrep.content.preparation?.length > 0 && (
                      <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--mint-light)", borderColor: "rgba(100,200,150,0.3)" }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--mint)" }}>24h before</p>
                        <ul className="space-y-2">
                          {activePrep.content.preparation.map((p, i) => (
                            <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: "var(--ink-2)" }}>
                              <span style={{ color: "var(--mint)" }}>✓</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "website" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => download(`${app.company}-site.html`, app.websiteHtml, "text/html")}
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: "var(--ink)", color: "#fff" }}
                >Download HTML</button>
                <button
                  onClick={() => copy(app.websiteHtml)}
                  className="px-4 py-2 rounded-xl text-sm font-bold border"
                  style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
                >Copy HTML</button>
              </div>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <iframe srcDoc={app.websiteHtml} className="w-full" style={{ height: 580, border: "none" }} title="Application website" />
              </div>
            </div>
          )}

          {tab === "analyze" && (
            <div className="space-y-5">
              <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
                {(["cover_letter", "resume"] as const).map((t) => (
                  <button
                    key={t} onClick={() => setAnalyzeType(t)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
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

              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--ink-2)" }}>Paste your edited version</p>
                  <button
                    onClick={() => setAnalyzeText(analyzeType === "resume" ? app.resume : app.coverLetter)}
                    className="text-xs font-semibold"
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
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={runAnalysis}
                  disabled={analyzing || improving || !analyzeText.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: "var(--ink)", color: "#fff" }}
                >
                  {analyzing ? "Analyzing..." : "Run ATS Check →"}
                </button>
                {analysis && (
                  <button
                    onClick={improveWithAnalysis}
                    disabled={improving || analyzing}
                    className="flex-1 py-3 rounded-xl text-sm font-bold border disabled:opacity-60"
                    style={{ borderColor: "var(--purple)", color: "var(--purple)", backgroundColor: "rgba(192,132,252,0.08)" }}
                  >
                    {improving ? "Improving..." : `Auto-fix (score: ${analysis.score}) →`}
                  </button>
                )}
              </div>

              {hasUnsavedImprovement && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: "rgba(192,132,252,0.08)", borderColor: "var(--purple)" }}>
                  <p className="text-xs font-semibold flex-1" style={{ color: "var(--purple)" }}>
                    Improved version ready — review the text above, then save.
                  </p>
                  <button
                    onClick={() => { setAnalyzeText(analyzeType === "resume" ? app.resume : app.coverLetter); setHasUnsavedImprovement(false); }}
                    className="text-xs font-semibold"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={saveImprovement}
                    disabled={savingImprovement}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
                    style={{ backgroundColor: "var(--purple)", color: "#fff" }}
                  >
                    {savingImprovement ? "Saving..." : "Save changes"}
                  </button>
                </div>
              )}

              {analyzeError && (
                <p className="text-xs font-semibold px-4 py-3 rounded-xl border" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>{analyzeError}</p>
              )}
              {improveError && (
                <p className="text-xs font-semibold px-4 py-3 rounded-xl border" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)" }}>{improveError}</p>
              )}

              {analysis && (
                <div className="space-y-4">
                  <div className="rounded-2xl border p-6 flex items-center gap-6" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                    <div className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: scoreColor(analysis.score).bg }}>
                      <span className="text-3xl font-extrabold" style={{ color: scoreColor(analysis.score).text }}>{analysis.score}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ink-3)" }}>ATS Score</p>
                      <p className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>{analysis.summary}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {analysis.sections.map((section) => (
                      <div key={section.name} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{section.name}</p>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: scoreColor(section.score).bg, color: scoreColor(section.score).text }}>
                            {section.score}/100
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full mb-3" style={{ backgroundColor: "var(--border)" }}>
                          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${section.score}%`, backgroundColor: scoreColor(section.score).text }} />
                        </div>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--ink-3)" }}>{section.feedback}</p>
                        {section.suggestions.length > 0 && (
                          <ul className="space-y-1">
                            {section.suggestions.map((s, i) => (
                              <li key={i} className="text-xs flex gap-2" style={{ color: "var(--ink-2)" }}>
                                <span style={{ color: "var(--purple)" }}>→</span>{s}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(tab === "cover_letter" || tab === "resume") && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-2 px-5 py-3 border-b" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
                <button
                  onClick={() => copy(tab === "cover_letter" ? app.coverLetter : app.resume)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold"
                  style={{ backgroundColor: "var(--ink)", color: "#fff" }}
                >Copy</button>
                <button
                  onClick={() => download(`${app.company}-${tab}.txt`, tab === "cover_letter" ? app.coverLetter : app.resume)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
                >Download</button>
              </div>
              <pre className="p-6 text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "var(--ink-2)", backgroundColor: "var(--paper)" }}>
                {tab === "cover_letter" ? app.coverLetter : app.resume}
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
