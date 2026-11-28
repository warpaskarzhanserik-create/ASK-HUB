import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, type ClientFile } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { formatSize } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ASK — документ", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

export default async function ClientFilePage({ params }: Props) {
  const { token } = await params;
  if (!/^[\w-]{6,40}$/.test(token)) notFound();
  const sql = await db();
  const [f] = await sql<ClientFile[]>`select * from files where token = ${token}`;
  if (!f) notFound();
  const download = `${f.url}${f.url.includes("?") ? "&" : "?"}download=1`;
  const meta = [formatSize(Number(f.size)), new Date(f.created_at).toLocaleDateString("ru-RU")].filter(Boolean).join(" · ");

  return (
    <>
      <header className="top">
        <span className="brand" aria-label="ASK"><Logo variant="star" size={24} /></span>
        <div className="crumbs"><strong>{f.name}</strong></div>
        <span className="top-meta">Ambition · Strategy · Knowledge</span>
      </header>
      <main className="wrap">
        <section className="page-title">
          <span className="label">Документ · PDF{meta && ` · ${meta}`}</span>
          <h1>{f.name}</h1>
          <div className="row">
            <a className="btn primary" href={download}>Скачать PDF</a>
            <a className="btn" href={f.url} target="_blank" rel="noreferrer">Открыть на весь экран</a>
          </div>
        </section>
        <div className="pdf-view">
          <iframe src={`${f.url}#view=FitH`} title={f.name} />
        </div>
        <p className="muted small pdf-hint">Если документ не отображается, нажмите «Скачать PDF».</p>
      </main>
    </>
  );
}
