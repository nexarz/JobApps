"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/FadeUp";
import { motion } from "framer-motion";

export default function GeneratePage() {
  const router = useRouter();
  const [form, setForm] = useState({ jobTitle: "", company: "", jobUrl: "", jobDesc: "", tone: "professional" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);

  const steps = ["Digging through your vault...", "Picking your best work...", "Writing like you...", "Almost there..."];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const interval = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 4000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const app = await res.json();
      router.push(`/applications/${app.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setStep(0);
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <FadeIn>
        <div className="mb-8">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--purple)" }}>Let&apos;s get this job</p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>New application</h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Paste the posting, hit generate. We do the rest — sounding exactly like you.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink-2)" }}>Job title *</label>
              <input
                required value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. Program Manager"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink-2)" }}>Company *</label>
              <input
                required value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="e.g. City of Vancouver"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink-2)" }}>Job posting URL (optional)</label>
            <input
              value={form.jobUrl} type="url"
              onChange={(e) => setForm((f) => ({ ...f, jobUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
              style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink-2)" }}>Cover letter &amp; site tone</label>
            <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
              {([
                { value: "professional", label: "Professional", sub: "sharp & credible" },
                { value: "playful", label: "Playful", sub: "fun & personality-forward" },
              ] as const).map((t) => (
                <button
                  key={t.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, tone: t.value }))}
                  className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-left"
                  style={{
                    backgroundColor: form.tone === t.value ? "var(--paper)" : "transparent",
                    color: form.tone === t.value ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: form.tone === t.value ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                  }}
                >
                  {t.label}
                  <span className="block font-medium opacity-60 mt-0.5">{t.sub}</span>
                </button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>Resume is always ATS-optimized regardless of tone.</p>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink-2)" }}>Job description *</label>
            <textarea
              required rows={13} value={form.jobDesc}
              onChange={(e) => setForm((f) => ({ ...f, jobDesc: e.target.value }))}
              placeholder="Paste the full job description here..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border resize-none leading-relaxed transition-all"
              style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm border" style={{ backgroundColor: "var(--pink-light)", borderColor: "rgba(240,140,136,0.3)", color: "var(--pink)" }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
            style={{ backgroundColor: "var(--ink)", color: "#fff" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "#fff" }} />
                {steps[step]}
              </span>
            ) : (
              "Make it happen →"
            )}
          </button>

          {loading && (
            <motion.div
              className="rounded-xl px-4 py-3 border"
              style={{ backgroundColor: "var(--purple-light)", borderColor: "rgba(184,146,212,0.3)" }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex gap-1 mb-2">
                {steps.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all duration-700"
                    style={{ backgroundColor: i <= step ? "var(--purple)" : "rgba(184,146,212,0.25)" }} />
                ))}
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--purple)" }}>
                Good things take ~20 seconds ✨
              </p>
            </motion.div>
          )}
        </form>
      </FadeIn>
    </div>
  );
}
