"use client";
import { useEffect, useState } from "react";

type Doc = { id: string; type: string; title: string; company?: string; role?: string; createdAt: string };

export default function VaultPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [form, setForm] = useState({ type: "cover_letter", title: "", content: "", company: "", role: "" });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "cover_letter" | "resume">("all");

  const refresh = () =>
    fetch("/api/documents").then((r) => r.json()).then(setDocs);

  useEffect(() => { refresh(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ type: "cover_letter", title: "", content: "", company: "", role: "" });
    await refresh();
    setLoading(false);
  };

  const del = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    await refresh();
  };

  const filtered = tab === "all" ? docs : docs.filter((d) => d.type === tab);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-purple-500 bg-clip-text text-transparent mb-1">
          Document Vault
        </h1>
        <p className="text-slate-500">Upload your past cover letters and resumes. The more you add, the better the AI learns your voice.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-pink-100 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Add Document</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-2">
              {["cover_letter", "resume"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    form.type === t
                      ? "bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow"
                      : "bg-pink-50 text-slate-600 hover:bg-pink-100"
                  }`}
                >
                  {t === "cover_letter" ? "Cover Letter" : "Resume"}
                </button>
              ))}
            </div>
            <input
              required
              placeholder="Title (e.g. 'Product Manager @ Acme')"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <div className="flex gap-2">
              <input
                placeholder="Company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="flex-1 border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              <input
                placeholder="Role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="flex-1 border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <textarea
              required
              placeholder="Paste the full text of your cover letter or resume here..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={10}
              className="w-full border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-400 to-pink-400 text-white font-medium hover:from-rose-500 hover:to-pink-500 transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add to Vault"}
            </button>
          </form>
        </div>

        <div>
          <div className="flex gap-2 mb-4">
            {(["all", "cover_letter", "resume"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  tab === t ? "bg-pink-100 text-pink-600" : "text-slate-500 hover:text-pink-500"
                }`}
              >
                {t === "all" ? "All" : t === "cover_letter" ? "Cover Letters" : "Resumes"}
                <span className="ml-1.5 text-xs opacity-60">
                  {t === "all" ? docs.length : docs.filter((d) => d.type === t).length}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-2xl border border-pink-100">
                No documents yet. Add one to start training your voice model.
              </div>
            )}
            {filtered.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl border border-pink-100 p-4 flex items-start justify-between group hover:border-pink-200 transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      doc.type === "cover_letter" ? "bg-rose-100 text-rose-500" : "bg-purple-100 text-purple-500"
                    }`}>
                      {doc.type === "cover_letter" ? "Cover Letter" : "Resume"}
                    </span>
                    {doc.company && <span className="text-xs text-slate-400">{doc.company}</span>}
                  </div>
                  <p className="font-medium text-slate-700 text-sm">{doc.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => del(doc.id)}
                  className="text-slate-300 hover:text-rose-400 transition-colors text-lg leading-none opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
