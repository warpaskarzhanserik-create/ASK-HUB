"use client";
import { useRef, useState } from "react";
import { addClientFile, deleteClientFile } from "@/app/actions";
import { uploadFile } from "@/lib/upload-client";
import type { ClientFile } from "@/lib/db";
import { formatSize } from "@/lib/format";

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

export default function ClientFiles({ projectId, files }: { projectId: number; files: ClientFile[] }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = async (list: FileList | File[]) => {
    const all = Array.from(list);
    const pdfs = all.filter(isPdf);
    setMsg(pdfs.length < all.length ? "Сюда можно только PDF — остальные файлы пропущены" : null);
    if (!pdfs.length) return;
    setBusy((b) => b + pdfs.length);
    await Promise.all(
      pdfs.map(async (f) => {
        try {
          const pdf = f.type === "application/pdf" ? f : new File([f], f.name, { type: "application/pdf" });
          const r = await uploadFile(pdf, `p${projectId}/client`);
          await addClientFile(projectId, r.url, f.name.replace(/\.pdf$/i, ""), f.size);
        } catch (e) {
          setMsg(`Не загрузилось: ${f.name} (${(e as Error).message})`);
        } finally {
          setBusy((b) => b - 1);
        }
      }),
    );
  };

  const copy = async (f: ClientFile) => {
    const link = `${window.location.origin}/f/${f.token}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Ссылка для клиента:", link);
    }
    setCopied(f.id);
    setTimeout(() => setCopied((c) => (c === f.id ? null : c)), 1800);
  };

  return (
    <div className="stack">
      <div
        className={`drop stack ${over ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) send(e.dataTransfer.files); }}
      >
        <div className="row">
          <button className="primary" onClick={() => fileRef.current?.click()} disabled={busy > 0}>
            {busy > 0 ? `Загружается: ${busy}…` : "Загрузить PDF"}
          </button>
          <span className="small">или перетащи PDF сюда. После загрузки нажми «Ссылка для клиента» и отправь её.</span>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple hidden
            onChange={(e) => { if (e.target.files) send(e.target.files); e.target.value = ""; }} />
        </div>
        {msg && <div className="small danger">{msg}</div>}
      </div>

      {files.length === 0 ? (
        <p className="empty">PDF для клиента пока нет.</p>
      ) : (
        <div className="cfiles">
          {files.map((f, i) => (
            <div key={f.id} className="cfile" style={{ "--i": i } as React.CSSProperties}>
              <span className="cfile-ico">PDF</span>
              <div className="cfile-main">
                <a href={`/f/${f.token}`} target="_blank" rel="noreferrer" className="cfile-name">{f.name}</a>
                <span className="muted small">
                  {[formatSize(Number(f.size)), new Date(f.created_at).toLocaleDateString("ru-RU")].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="row cfile-acts">
                <button className={copied === f.id ? "primary" : ""} onClick={() => copy(f)}>
                  {copied === f.id ? "Скопировано ✓" : "Ссылка для клиента"}
                </button>
                <a className="btn" href={`/f/${f.token}`} target="_blank" rel="noreferrer">Открыть</a>
                <button className="ghost danger" title="Удалить"
                  onClick={() => { if (confirm(`Удалить «${f.name}»? Ссылка у клиента перестанет работать.`)) deleteClientFile(f.id, projectId); }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
