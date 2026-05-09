"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/vault", label: "Vault" },
  { href: "/generate", label: "Generate" },
  { href: "/applications", label: "Applications" },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 border-b transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(255,252,248,0.88)" : "var(--paper)",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
        borderColor: "var(--border)",
        boxShadow: scrolled ? "0 2px 20px rgba(26,26,24,0.06)" : "none",
      }}
    >
      <div className="flex items-center justify-between w-full max-w-3xl mx-auto">
        <Link href="/" className="font-extrabold text-lg tracking-tight" style={{ color: "var(--ink)" }}>
          JobApps
        </Link>

        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                color: path === l.href ? "var(--ink)" : "var(--ink-3)",
                backgroundColor: path === l.href ? "var(--paper-3)" : "transparent",
              }}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="ml-2 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{ color: "var(--ink-3)" }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
