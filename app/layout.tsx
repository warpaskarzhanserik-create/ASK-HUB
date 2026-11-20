import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Refs", description: "Мудборды, рефы, заметки и раскадровка" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111111" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
