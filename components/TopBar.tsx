import Link from "next/link";

export default function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="top">
      <Link href="/" className="brand">ASK<span>/</span>HUB</Link>
      <div className="crumbs">{children}</div>
      <span className="top-meta">Moodboard · Refs · Storyboard</span>
    </header>
  );
}
