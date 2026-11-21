import Link from "next/link";
import { Star } from "./Logo";

export default function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="top">
      <Link href="/" className="brand"><Star size={18} />ASK HUB</Link>
      <div className="crumbs">{children}</div>
      <span className="top-meta">Moodboard · Refs · Storyboard</span>
    </header>
  );
}
