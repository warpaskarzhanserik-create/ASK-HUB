"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";

export type Row = { id: number; name: string; description: string; n: number; thumb: string | null; created: string };

export default function ProjectIndex({ rows }: { rows: Row[] }) {
  const [peek, setPeek] = useState<{ src: string; x: number; y: number } | null>(null);
  return (
    <div className="index" onMouseLeave={() => setPeek(null)}>
      <div className="index-head">
        <span>№</span><span>Проект</span><span className="desc">Описание</span><span>Рефы</span><span className="date">Дата</span>
      </div>
      {rows.map((r, i) => (
        <Link
          key={r.id}
          href={`/p/${r.id}`}
          className="index-row"
          onMouseMove={(e) => setPeek(r.thumb ? { src: r.thumb, x: e.clientX, y: e.clientY } : null)}
          onMouseLeave={() => setPeek(null)}
        >
          <span className="n">{String(i + 1).padStart(2, "0")}</span>
          <span className="name">{r.name}</span>
          <span className="desc muted">{r.description || "—"}</span>
          <span className="muted">{r.n}</span>
          <span className="date muted">{r.created}</span>
        </Link>
      ))}
      {peek && (
        <div className="peek" style={{ left: peek.x, top: peek.y }}>
          <img src={peek.src} alt="" referrerPolicy="no-referrer" />
        </div>
      )}
    </div>
  );
}
