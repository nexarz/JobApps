"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--paper)" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: "var(--ink)" }}>StgyJobz</h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>This is a private tool. Who are you? 👀</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border p-8 space-y-4" style={{ backgroundColor: "var(--paper-2)", borderColor: "var(--border)" }}>
          <input
            type="password" autoFocus required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-all"
            style={{ backgroundColor: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
          />
          {error && (
            <p className="text-xs font-semibold" style={{ color: "var(--pink)" }}>{error}</p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: "var(--ink)", color: "#fff" }}
          >
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
