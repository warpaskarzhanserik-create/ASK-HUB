"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition } from "react";
import type { Shot, Source } from "@/lib/db";
import { addShot, deleteShot, deleteSource, moveShot, saveShot, setShotImage } from "@/app/actions";
import FrameGrabber, { tc } from "./FrameGrabber";
import { uploadFile } from "@/lib/upload-client";

type Field = "scene" | "shot_size" | "description" | "camera" | "sound" | "duration";

function ShotCard({ shot, n, last }: { shot: Shot; n: number; last: boolean }) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pid = shot.project_id;

  const field = (k: Field, placeholder: string, multiline = false) => {
    const props = {
      defaultValue: shot[k],
      placeholder,
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        e.target.value !== shot[k] && start(() => saveShot(shot.id, pid, { [k]: e.target.value })),
    };
    return multiline ? <textarea {...props} /> : <input {...props} />;
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      const r = await uploadFile(f, `p${pid}/shots`);
      await setShotImage(shot.id, pid, r.url);
    } catch (e) {
      alert(`Не загрузилось: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card shot" style={{ opacity: pending ? 0.6 : 1 }}>
      <div
        className="shot-img"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
        title="Нажми или перетащи картинку"
      >
        <span className="big-n">{String(n).padStart(2, "0")}</span>
        {shot.image_url ? <img src={shot.image_url} alt="" /> : <span className="small">{uploading ? "Загрузка…" : "+ картинка кадра"}</span>}
        {uploading && shot.image_url && <span className="badge">Загрузка…</span>}
        {shot.timecode != null && !uploading && <span className="badge tc">{tc(shot.timecode)}</span>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <div className="shot-body">
        <div className="row">
          <div className="grow">{field("scene", "Сцена / локация")}</div>
          <div className="row shot-acts" style={{ gap: 2 }}>
            <button className="icon ghost" disabled={n === 1} onClick={() => start(() => moveShot(shot.id, pid, -1))} title="Раньше">←</button>
            <button className="icon ghost" disabled={last} onClick={() => start(() => moveShot(shot.id, pid, 1))} title="Позже">→</button>
            {shot.image_url && <button className="icon ghost" onClick={() => start(() => setShotImage(shot.id, pid, null))} title="Убрать картинку">⌫</button>}
            <button className="icon ghost danger" onClick={() => confirm(`Удалить кадр #${n}?`) && start(() => deleteShot(shot.id, pid))} title="Удалить">✕</button>
          </div>
        </div>
        <div className="two">
          {field("shot_size", "Крупность (общий, средний, крупный…)")}
          {field("duration", "Длительность, сек")}
        </div>
        {field("description", "Что в кадре: действие, композиция", true)}
        {field("camera", "Камера: движение, объектив, ракурс")}
        {field("sound", "Звук / реплика / музыка", true)}
      </div>
    </div>
  );
}

const PLATFORM: Record<string, string> = { file: "Файл", vimeo: "Vimeo", youtube: "YouTube", instagram: "Instagram", url: "Ссылка" };

export default function Storyboard({ shots, sources, projectId }: { shots: Shot[]; sources: Source[]; projectId: number }) {
  const [pending, start] = useTransition();
  const perSource = (id: number) => shots.filter((s) => s.source_id === id).length;
  const total = shots.reduce((s, x) => s + (parseFloat(x.duration.replace(",", ".")) || 0), 0);
  return (
    <div className="stack">
      <FrameGrabber projectId={projectId} />
      {sources.length > 0 && (
        <div className="sources no-print">
          {sources.map((src) => (
            <span key={src.id} className="source">
              <span className="tag">{PLATFORM[src.platform] ?? src.platform}</span>
              {/^https?:/.test(src.url) ? <a href={src.url} target="_blank" rel="noreferrer">{src.title || src.url}</a> : <span>{src.title || src.url}</span>}
              <span className="muted small">{perSource(src.id)} кадр.</span>
              <button
                className="icon ghost danger"
                title="Удалить видео и его кадры"
                onClick={() => confirm("Удалить это видео и все кадры из него?") && start(() => deleteSource(src.id, projectId))}
              >✕</button>
            </span>
          ))}
        </div>
      )}
      <div className="board-bar no-print">
        <button className="primary" disabled={pending} onClick={() => start(() => addShot(projectId))}>+ Кадр</button>
        <button onClick={() => window.print()}>Печать / PDF</button>
        <span className="muted small grow">{shots.length} кадров{total ? ` · ~${Math.round(total)} сек` : ""}</span>
      </div>
      {shots.length === 0 && <p className="empty">Раскадровка пустая. Вытащи кадры из видео выше или добавь кадр вручную.</p>}
      <div className="shots">
        {shots.map((s, i) => <ShotCard key={s.id} shot={s} n={i + 1} last={i === shots.length - 1} />)}
      </div>
    </div>
  );
}
