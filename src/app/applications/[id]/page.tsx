"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/FadeUp";

type Application = {
  id: string; jobTitle: string; company: string; jobUrl?: string;
  coverLetter: string; resume: string; websiteHtml: string; createdAt: string;
};
type Tab = "cover_letter" | "resume" | "website";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [tab, setTab] = useState<Tab>("cover_letter");
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch(`/api/applications/${id}`).then((r) => r.json()).then(setApp);
  }, [id]);

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
