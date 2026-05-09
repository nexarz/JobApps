import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "JobApps",
  description: "AI-powered job application generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="font-sans antialiased" style={{ backgroundColor: "var(--paper)", color: "var(--ink)" }}>
        <Nav />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
