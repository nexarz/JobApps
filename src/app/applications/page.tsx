"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type App = { id: string; jobTitle: string; company: string; jobUrl?: string; createdAt: string };

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);

  useEffect(() => {
    fetch("/api/applications").then((r) => r.json()).then(setApps);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-purple-500 bg-clip-text text-transparent mb-1">
          Past Applications
        </h1>
        <p className="text-slate-500">All your generated application materials.</p>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-pink-100">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-slate-400 mb-4">No applications yet.</p>
          <Link href="/generate" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-rose-400 to-pink-400 text-white font-medium hover:from-rose-500 hover:to-pink-500 transition-all">
            Generate your first application
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="block bg-white rounded-2xl border border-pink-100 p-5 hover:border-pink-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 group-hover:text-pink-500 transition-colors">
                    {app.jobTitle}
                  </h2>
                  <p className="text-slate-500 text-sm mt-0.5">{app.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</p>
                  <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-500 font-medium">View →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
