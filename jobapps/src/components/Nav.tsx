"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/vault", label: "Vault" },
  { href: "/generate", label: "Generate" },
  { href: "/applications", label: "Applications" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="border-b border-pink-100 bg-white/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl bg-gradient-to-r from-rose-400 to-purple-500 bg-clip-text text-transparent">
          JobApps
        </Link>
        <div className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                path === l.href
                  ? "bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow-md"
                  : "text-slate-600 hover:text-pink-500 hover:bg-pink-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
