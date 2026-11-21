import Link from "next/link";
import { Star } from "./Logo";

export default function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="top">
      <Link href="/" className="brand"><Star size={18} />ASK</Link>
      <div className="crumbs">{children}</div>
      <span className="top-meta">Ambition · Strategy · Knowledge</span>
    </header>
  );
}
