"use client";
import { useEffect, useState } from "react";
import { FadeIn } from "@/components/FadeUp";

type Prefs = {
  location: string | null;
  remotePref: string | null;
  experienceYears: number | null;
};

const REMOTE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "remote_only", label: "Remote only" },
  { value: "hybrid_ok", label: "Hybrid ok" },
  { value: "onsite_only", label: "Onsite only" },
];

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>({ location: "", remotePref: "any", experienceYears: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        setPrefs({
          location: data.location ?? "",
          remotePref: data.remotePref ?? "any",
          experienceYears: data.experienceYears ?? null,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: prefs.location || null,
          remotePref: prefs.remotePref,
          experienceYears: prefs.experienceYears,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--purple)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <FadeIn>
        <div className="mb-8">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--purple)" }}>Settings</p>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Search preferences</h1>
          <p className="text-sm mt-2" style={{ color: "var(--ink-3)" }}>
            Used to tailor job suggestions on the Jobs page.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border p-6" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--ink-3)" }}>Location</label>
            <input
              value={prefs.location ?? ""}
              onChange={(e) => setPrefs({ ...prefs, location: e.target.value })}
              placeholder="e.g. Toronto, Vancouver, Remote"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
              style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--ink-3)" }}>Remote preference</label>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--paper-3)" }}>
              {REMOTE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrefs({ ...prefs, remotePref: opt.value })}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: prefs.remotePref === opt.value ? "var(--paper)" : "transparent",
                    color: prefs.remotePref === opt.value ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: prefs.remotePref === opt.value ? "0 1px 4px rgba(26,26,24,0.1)" : "none",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--ink-3)" }}>Years of experience</label>
            <input
              type="number"
              min={0}
              max={50}
              value={prefs.experienceYears ?? ""}
              onChange={(e) => setPrefs({ ...prefs, experienceYears: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="e.g. 5"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
              style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
            <p className="text-xs mt-2" style={{ color: "var(--ink-3)" }}>Used to calibrate seniority of suggested roles.</p>
          </div>

          {error && (
            <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: "var(--pink)", backgroundColor: "var(--pink-light)" }}>
              {error}
            </p>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: "var(--ink)", color: "#fff" }}
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save preferences"}
          </button>
        </div>
      </FadeIn>
    </div>
  );
}
