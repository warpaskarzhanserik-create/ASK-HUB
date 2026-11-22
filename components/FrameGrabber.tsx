"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addFrameShots, createSource, resolveVideoLink } from "@/app/actions";
import { framesFromSprites, framesFromVideo, proxied, type Frame } from "@/lib/frames";
import { uploadFile } from "@/lib/upload-client";

type Origin = { url: string; platform: string; title: string };
type State =
  | { s: "idle" }
  | { s: "work"; label: string; p: number; found: number }
  | { s: "pick"; frames: Frame[]; origin: Origin; lowRes: boolean }
  | { s: "save"; done: number; total: number };

export const tc = (t: number) => {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function FrameGrabber({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [st, setSt] = useState<State>({ s: "idle" });
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const framesRef = useRef<Frame[]>([]);

  useEffect(() => () => framesRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), []);

  const clear = () => {
    framesRef.current.forEach((f) => URL.revokeObjectURL(f.preview));
    framesRef.current = [];
  };

  const run = async (origin: Origin, job: (signal: AbortSignal) => Promise<Frame[]>, lowRes = false) => {
    clear();
    setErr(null);
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const frames = await job(ctrl.signal);
      if (ctrl.signal.aborted) { frames.forEach((f) => URL.revokeObjectURL(f.preview)); return; }
      if (!frames.length) throw new Error("Кадров не нашлось");
      framesRef.current = frames;
      setPicked(new Set(frames.map((_, i) => i)));
      setSt({ s: "pick", frames, origin, lowRes });
    } catch (e) {
      setErr((e as Error).message);
      setSt({ s: "idle" });
    }
  };

  const progress = (label: string) => (p: number, found: number) => setSt({ s: "work", label, p, found });

  const fromLink = async () => {
    const url = link.trim();
    if (!url) return;
    setErr(null);
    setSt({ s: "work", label: "Ищу видео по ссылке", p: 0, found: 0 });
    const r = await resolveVideoLink(url).catch(() => null);
    if (!r) { setErr("Сервер не ответил"); setSt({ s: "idle" }); return; }
    const origin = { url, platform: r.platform, title: r.title };
    if (r.video_url) {
      const src = proxied(r.video_url);
      return run(origin, (sig) => framesFromVideo(src, progress("Ищу смены планов"), sig));
    }
    if (r.sprites) return run(origin, (sig) => framesFromSprites(r.sprites!, progress("Собираю кадры YouTube"), sig), true);
    setErr(r.error ?? "Не получилось достать видео по ссылке");
    setSt({ s: "idle" });
  };

  const fromFile = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) { setErr("Это не видеофайл"); return; }
    const src = URL.createObjectURL(f);
    run({ url: f.name, platform: "file", title: f.name }, async (sig) => {
      try { return await framesFromVideo(src, progress("Ищу смены планов"), sig); } finally { URL.revokeObjectURL(src); }
    });
  };

  const cancel = () => { abort.current?.abort(); clear(); setSt({ s: "idle" }); };

  const save = async () => {
    if (st.s !== "pick") return;
    const { frames, origin } = st;
    const chosen = frames.map((f, i) => ({ f, i })).filter(({ i }) => picked.has(i));
    if (!chosen.length) return;
    setSt({ s: "save", done: 0, total: chosen.length });
    try {
      const sourceId = await createSource(projectId, origin.url, origin.platform, origin.title);
      let done = 0;
      const out: { url: string; t: number; duration: number | null }[] = [];
      const queue = [...chosen];
      const worker = async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          const { f, i } = job;
          const file = new File([f.blob], `t${Math.round(f.t * 10)}.jpg`, { type: "image/jpeg" });
          const r = await uploadFile(file, `p${projectId}/frames/s${sourceId}`);
          const next = frames[i + 1];
          out.push({ url: r.url, t: f.t, duration: next ? next.t - f.t : null });
          setSt({ s: "save", done: ++done, total: chosen.length });
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      await addFrameShots(projectId, sourceId, out);
      clear();
      setLink("");
      setSt({ s: "idle" });
      router.refresh();
    } catch (e) {
      setErr(`Не сохранилось: ${(e as Error).message}`);
      setSt({ s: "pick", frames, origin, lowRes: st.lowRes });
    }
  };

  const toggle = (i: number) => setPicked((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const busy = st.s === "work" || st.s === "save";

  return (
    <section
      className={`grabber card no-print ${over ? "over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); fromFile(e.dataTransfer.files[0]); }}
    >
      <div className="grab-head">
        <div>
          <span className="label">Кадры из видео</span>
          <span className="muted small">Вставь ссылку (Vimeo, YouTube, Instagram, .mp4) или перетащи видеофайл. Сайт найдёт смены планов.</span>
        </div>
      </div>
      <form className="grab-row" onSubmit={(e) => { e.preventDefault(); fromLink(); }}>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://vimeo.com/…" disabled={busy} />
        <button className="primary" disabled={busy || !link.trim()}>Вытащить кадры</button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>Видеофайл</button>
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => { fromFile(e.target.files?.[0]); e.target.value = ""; }} />
      </form>
      {err && <p className="danger small">{err}</p>}

      {st.s === "work" && (
        <div className="grab-progress">
          <div className="bar"><span style={{ width: `${Math.round(st.p * 100)}%` }} /></div>
          <span className="muted small">{st.label}… {Math.round(st.p * 100)}% · найдено {st.found}</span>
          <button className="ghost" onClick={cancel}>Отмена</button>
        </div>
      )}

      {st.s === "save" && (
        <div className="grab-progress">
          <div className="bar"><span style={{ width: `${Math.round((st.done / st.total) * 100)}%` }} /></div>
          <span className="muted small">Сохраняю кадры {st.done} из {st.total}</span>
        </div>
      )}

      {st.s === "pick" && (
        <>
          <div className="grab-row">
            <span className="small grow">
              {st.origin.title || st.origin.url} · найдено {st.frames.length}, выбрано {picked.size}
              {st.lowRes && <span className="muted"> · YouTube даёт только маленькие превью</span>}
            </span>
            <button className="ghost" onClick={() => setPicked(new Set(st.frames.map((_, i) => i)))}>Все</button>
            <button className="ghost" onClick={() => setPicked(new Set())}>Никакие</button>
            <button className="ghost" onClick={cancel}>Отмена</button>
            <button className="primary" disabled={!picked.size} onClick={save}>В раскадровку ({picked.size})</button>
          </div>
          <div className="frames">
            {st.frames.map((f, i) => (
              <button key={i} type="button" className={`frame ${picked.has(i) ? "on" : ""}`} onClick={() => toggle(i)} title="Нажми, чтобы выбрать или убрать">
                <img src={f.preview} alt="" />
                <span className="badge">{tc(f.t)}</span>
                <span className="check">{picked.has(i) ? "✓" : ""}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
