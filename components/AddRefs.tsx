"use client";
import { useRef, useState, useTransition } from "react";
import { addLink, addUpload } from "@/app/actions";
import { uploadFile } from "@/lib/upload-client";

export default function AddRefs({ projectId, section }: { projectId: number; section: "mood" | "video" }) {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const submitLink = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setMsg(null);
    start(async () => {
      const err = await addLink(projectId, section, v);
      if (err) setMsg(err);
      else setUrl("");
    });
  };

  const sendFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!list.length) return;
    setMsg(null);
    setBusy((b) => b + list.length);
    await Promise.all(
      list.map(async (f) => {
        try {
          const r = await uploadFile(f, `p${projectId}`);
          await addUpload(projectId, section, r.url, r.contentType, r.name);
        } catch (e) {
          setMsg(`Не загрузилось: ${f.name} (${(e as Error).message})`);
        } finally {
          setBusy((b) => b - 1);
        }
      }),
    );
  };

  return (
    <div
      className={`drop stack ${over ? "over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) sendFiles(e.dataTransfer.files);
        else submitLink(e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain"));
      }}
    >
      <form className="row" onSubmit={(e) => { e.preventDefault(); submitLink(url); }}>
        <input
          className="grow"
          style={{ flex: "1 1 220px" }}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            const files = e.clipboardData.files;
            if (files.length) { e.preventDefault(); sendFiles(files); }
          }}
          placeholder={section === "video" ? "Ссылка на Vimeo / Instagram / YouTube" : "Ссылка на картинку, Vimeo, Instagram, Pinterest…"}
        />
        <button className="primary" disabled={pending || !url.trim()}>{pending ? "Добавляю…" : "Добавить"}</button>
        <button type="button" onClick={() => fileRef.current?.click()}>Загрузить файл</button>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => e.target.files && sendFiles(e.target.files)} />
      </form>
      <div className="small">
        {busy > 0 ? `Загружается файлов: ${busy}…` : "Можно перетащить сюда файлы или вставить картинку из буфера (Ctrl/Cmd+V в поле)"}
      </div>
      {msg && <div className="small danger">{msg}</div>}
    </div>
  );
}
