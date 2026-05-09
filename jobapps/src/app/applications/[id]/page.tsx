"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetch(`/api/applications/${id}`).then((r) => r.json()).then(setApp);
  }, [id]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  const download = (filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const del = async () => {
    if (!confirm("Delete this application?")) return;
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    router.push("/applications");
  };

  if (!app) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-2 border-pink-200 border-t-pink-400 rounded-full" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "cover_letter", label: "Cover Letter" },
    { key: "resume", label: "Resume" },
    { key: "website", label: "Personal Site" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{app.jobTitle}</h1>
          <p className="text-slate-500 mt-1">
            {app.company} · {new Date(app.createdAt).toLocaleDateString()}
            {app.jobUrl && (
              <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-pink-400 hover:underline text-sm">
                View posting ↗
              </a>
            )}
          </p>
        </div>
        <button onClick={del} className="text-sm text-slate-400 hover:text-rose-400 transition-colors">
          Delete
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow"
                : "bg-white border border-pink-100 text-slate-600 hover:border-pink-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "website" ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => download(`${app.company}-${app.jobTitle}-site.html`, app.websiteHtml, "text/html")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-400 to-pink-400 text-white text-sm font-medium hover:from-rose-500 hover:to-pink-500"
            >
              Download HTML
            </button>
            <button
              onClick={() => copy(app.websiteHtml)}
              className="px-4 py-2 rounded-xl border border-pink-100 text-sm text-slate-600 hover:border-pink-300"
            >
              {copying ? "Copied!" : "Copy HTML"}
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden border border-pink-100 shadow-lg">
            <iframe
              srcDoc={app.websiteHtml}
              className="w-full"
              style={{ height: "600px", border: "none" }}
              title="Application Website Preview"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm">
          <div className="flex gap-2 p-4 border-b border-pink-50">
            <button
              onClick={() => copy(tab === "cover_letter" ? app.coverLetter : app.resume)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-400 to-pink-400 text-white text-sm font-medium hover:from-rose-500 hover:to-pink-500"
            >
              {copying ? "Copied!" : "Copy Text"}
            </button>
            <button
              onClick={() => download(
                `${app.company}-${tab === "cover_letter" ? "cover-letter" : "resume"}.txt`,
                tab === "cover_letter" ? app.coverLetter : app.resume
              )}
              className="px-4 py-2 rounded-xl border border-pink-100 text-sm text-slate-600 hover:border-pink-300"
            >
              Download
            </button>
          </div>
          <pre className="p-6 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
            {tab === "cover_letter" ? app.coverLetter : app.resume}
          </pre>
        </div>
      )}
    </div>
  );
}
