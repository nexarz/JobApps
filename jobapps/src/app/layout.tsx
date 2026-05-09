import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "JobApps — AI Application Generator",
  description: "Generate tailored cover letters, resumes, and application sites",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-to-br from-white via-pink-50 to-purple-50">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
