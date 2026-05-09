"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneratePage() {
  const router = useRouter();
  const [form, setForm] = useState({ jobTitle: "", company: "", jobUrl: "", jobDesc: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
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
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-purple-500 bg-clip-text text-transparent mb-1">
          Generate Application
        </h1>
        <p className="text-slate-500">Paste a job posting and we&apos;ll create a tailored cover letter, resume, and personal site in your voice.</p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-pink-100 p-8 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Title *</label>
            <input
              required
              value={form.jobTitle}
              onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              placeholder="e.g. Senior Product Manager"
              className="w-full border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company *</label>
            <input
              required
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="e.g. Acme Corp"
              className="w-full border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Posting URL (optional)</label>
          <input
            value={form.jobUrl}
            onChange={(e) => setForm((f) => ({ ...f, jobUrl: e.target.value }))}
            placeholder="https://..."
            type="url"
            className="w-full border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Description *</label>
          <textarea
            required
            value={form.jobDesc}
            onChange={(e) => setForm((f) => ({ ...f, jobDesc: e.target.value }))}
            placeholder="Paste the full job description here..."
            rows={12}
            className="w-full border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
          />
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-400 to-purple-400 text-white font-semibold text-lg hover:from-rose-500 hover:to-purple-500 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Generating your materials...
            </span>
          ) : (
            "✨ Generate Application Materials"
          )}
        </button>

        {loading && (
          <p className="text-center text-sm text-slate-400">
            This takes about 30 seconds. Claude is reading your vault and writing in your voice...
          </p>
        )}
      </form>
    </div>
  );
}
