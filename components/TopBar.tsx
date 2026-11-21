import Link from "next/link";
import { Logo } from "./Logo";

export default function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="top">
      <Link href="/" className="brand" aria-label="ASK — на главную" title="На главную"><Logo variant="star" size={24} /></Link>
      <div className="crumbs">{children}</div>
      <span className="top-meta">Ambition · Strategy · Knowledge</span>
    </header>
  );
}
