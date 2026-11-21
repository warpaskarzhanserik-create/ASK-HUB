import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = { title: "ASK", description: "ASK — Ambition · Strategy · Knowledge. Амбиции, стратегия, знания: мудборды, рефы, заметки и раскадровка" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d0d0d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${mono.variable}`}>
      <body>
        {children}
        <footer className="foot">
          <span>ASK — Ambition · Strategy · Knowledge</span>
          <span className="muted">Амбиции, стратегия, знания</span>
        </footer>
      </body>
    </html>
  );
}
