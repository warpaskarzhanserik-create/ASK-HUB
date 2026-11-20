import Link from "next/link";

export default function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="top">
      <div className="row grow">
        <Link href="/" className="brand">Refs<span>.</span></Link>
        {children}
      </div>
      <form action="/api/logout" method="post">
        <button className="ghost small muted">Выйти</button>
      </form>
    </header>
  );
}
