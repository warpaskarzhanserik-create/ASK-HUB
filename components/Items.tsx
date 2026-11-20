"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useTransition } from "react";
import type { Item } from "@/lib/db";
import { deleteItem, updateItemNote } from "@/app/actions";

const LABEL: Record<string, string> = { vimeo: "Vimeo", instagram: "Instagram", youtube: "YouTube", upload: "Файл", url: "Ссылка", image: "", video: "" };

function Player({ item, autoplay }: { item: Item; autoplay?: boolean }) {
  if (item.source === "upload" || item.source === "video")
    return <div className="embed"><video src={item.url} controls playsInline autoPlay={autoplay} preload="metadata" /></div>;
  if (item.embed_url) {
    const src = autoplay && item.source !== "instagram" ? `${item.embed_url}${item.embed_url.includes("?") ? "&" : "?"}autoplay=1` : item.embed_url;
    return (
      <div className={`embed ${item.source === "instagram" ? "ig" : ""}`}>
        <iframe src={src} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
      </div>
    );
  }
  return null;
}

function Viewer({ item, onClose }: { item: Item; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        {item.kind === "image" ? <img src={item.url} alt="" /> : item.kind === "video" ? <Player item={item} autoplay /> : item.thumb_url && <img src={item.thumb_url} alt="" />}
        <div className="row">
          <span className="grow">{item.title}</span>
          <a className="btn small" href={item.url} target="_blank" rel="noreferrer">Открыть оригинал ↗</a>
          <button onClick={onClose}>Закрыть</button>
        </div>
        {item.note && <div className="muted" style={{ whiteSpace: "pre-wrap" }}>{item.note}</div>}
      </div>
    </div>
  );
}

function NoteEdit({ item }: { item: Item }) {
  const [v, setV] = useState(item.note);
  const [, start] = useTransition();
  return (
    <textarea
      value={v}
      placeholder="Заметка к рефу…"
      style={{ minHeight: 40, fontSize: 13, padding: "6px 8px" }}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== item.note && start(() => updateItemNote(item.id, item.project_id, v))}
    />
  );
}

function Tile({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const label = LABEL[item.source];
  return (
    <div className="tile" style={{ opacity: pending ? 0.4 : 1 }}>
      {item.kind === "image" ? (
        <img src={item.url} alt="" loading="lazy" onClick={onOpen} />
      ) : item.source === "upload" ? (
        <video src={`${item.url}#t=0.1`} muted playsInline preload="metadata" onClick={onOpen} onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
      ) : item.thumb_url ? (
        <div style={{ position: "relative" }} onClick={onOpen}>
          <img src={item.thumb_url} alt="" loading="lazy" referrerPolicy="no-referrer" />
          {item.kind === "video" && <div className="play">▶</div>}
        </div>
      ) : (
        <div className="ph" onClick={onOpen}>{item.kind === "video" ? "▶ " : ""}{item.title || item.url}</div>
      )}
      {label && <span className="badge">{label}</span>}
      <div className="acts">
        <button onClick={() => setEditing((e) => !e)} title="Заметка">✎</button>
        <button onClick={() => confirm("Удалить реф?") && start(() => deleteItem(item.id, item.project_id))} title="Удалить">✕</button>
      </div>
      {(item.title || item.note || editing) && (
        <div className="meta">
          {item.title && <span>{item.title}</span>}
          {editing ? <NoteEdit item={item} /> : item.note && <span className="muted" style={{ whiteSpace: "pre-wrap" }}>{item.note}</span>}
        </div>
      )}
    </div>
  );
}

function VideoCard({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  const [play, setPlay] = useState(item.source === "instagram" || item.source === "upload");
  return (
    <div className="card" style={{ overflow: "hidden", opacity: pending ? 0.4 : 1 }}>
      {play ? (
        <Player item={item} />
      ) : (
        <div className="embed" style={{ cursor: "pointer" }} onClick={() => setPlay(true)}>
          {item.thumb_url && <img src={item.thumb_url} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
          <div className="play">▶</div>
        </div>
      )}
      <div className="pad stack" style={{ gap: 8 }}>
        <div className="row">
          <span className="badge" style={{ position: "static" }}>{LABEL[item.source] || "Видео"}</span>
          <span className="grow" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || item.url}</span>
          <a className="btn icon small" href={item.url} target="_blank" rel="noreferrer" title="Открыть">↗</a>
          <button className="icon small danger" onClick={() => confirm("Удалить видео?") && start(() => deleteItem(item.id, item.project_id))}>✕</button>
        </div>
        <NoteEdit item={item} />
      </div>
    </div>
  );
}

export default function Items({ items, layout }: { items: Item[]; layout: "mood" | "video" }) {
  const [open, setOpen] = useState<Item | null>(null);
  if (!items.length) return <p className="muted">Пока пусто.</p>;
  if (layout === "video")
    return <div className="video-grid">{items.map((i) => <VideoCard key={i.id} item={i} />)}</div>;
  return (
    <>
      <div className="masonry">{items.map((i) => <Tile key={i.id} item={i} onOpen={() => setOpen(i)} />)}</div>
      {open && <Viewer item={open} onClose={() => setOpen(null)} />}
    </>
  );
}
