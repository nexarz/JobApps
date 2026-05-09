"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, FadeUpList, FadeUpItem } from "@/components/FadeUp";

type Doc = { id: string; type: string; title: string; company?: string; role?: string; createdAt: string };

export default function VaultPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [form, setForm] = useState({ type: "cover_letter", title: "", content: "", company: "", role: "" });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "cover_letter" | "resume">("all");
  const [saved, setSaved] = useState(false);

  const refresh = () => fetch("/api/documents").then((r) => r.json()).then(setDocs);

  useEffect(() => { refresh(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ type: "cover_letter", title: "", content: "", company: "", role: "" });
    await refresh();
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const del = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    await refresh();
  };

  const filtered = tab === "all" ? docs : docs.filter((d) => d.type === tab);
  const counts = { all: docs.length, cover_letter: docs.filter(d => d.type === "cover_letter").length, resume: docs.filter(d => d.type === "resume").length };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <FadeIn>
        <div className="mb-8">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--purple)" }}>Vault</p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>Document vault</h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            The more you add, the better the AI learns your voice. {docs.length > 0 && `${docs.length} documents loaded.`}
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.05}>
          <form onSubmit={submit} className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
            <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
              {(["cover_letter", "resume"] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                  style={{
                    backgroundColor: form.type === t ? "var(--paper)" : "transparent",
                    color: form.type === t ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: form.type === t ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                  }}
                >
                  {t === "cover_letter" ? "Cover Letter" : "Resume"}
                </button>
              ))}
            </div>

            <input
              required placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium outline-none border transition-all"
              style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
            />

            <div className="flex gap-2">
              <input
                placeholder="Company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
              />
              <input
                placeholder="Role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
              />
            </div>

            <textarea
              required rows={9}
              placeholder="Paste the full text here..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border resize-none transition-all leading-relaxed"
              style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
            />

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98]"
              style={{ backgroundColor: saved ? "var(--mint)" : "var(--ink)", color: saved ? "var(--ink)" : "#fff" }}
            >
              {loading ? "Saving..." : saved ? "✓ Saved" : "Add to vault"}
            </button>
          </form>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div>
            <div className="flex gap-1 mb-4">
              {(["all", "cover_letter", "resume"] as const).map((t) => (
                <button
                  key={t} onClick={() => setTab(t)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    backgroundColor: tab === t ? "var(--paper-3)" : "transparent",
                    color: tab === t ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  {t === "all" ? "All" : t === "cover_letter" ? "Cover Letters" : "Resumes"}
                  <span className="ml-1 opacity-50">{counts[t]}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              <AnimatePresence>
                {filtered.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center py-16 rounded-2xl border"
                    style={{ borderColor: "var(--border)", color: "var(--ink-3)" }}
                  >
                    <div className="text-3xl mb-2">◈</div>
                    <p className="text-sm">No documents yet</p>
                  </motion.div>
                )}
                {filtered.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="flex items-start justify-between rounded-xl border px-4 py-3 group transition-all"
                    style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: doc.type === "cover_letter" ? "var(--purple-light)" : "var(--peach-light)",
                            color: doc.type === "cover_letter" ? "var(--purple)" : "var(--peach)",
                          }}>
                          {doc.type === "cover_letter" ? "CL" : "CV"}
                        </span>
                        {doc.company && <span className="text-xs truncate" style={{ color: "var(--ink-3)" }}>{doc.company}</span>}
                      </div>
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>{doc.title}</p>
                    </div>
                    <button
                      onClick={() => del(doc.id)}
                      className="ml-3 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                      style={{ color: "var(--ink-3)" }}
                    >×</button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
