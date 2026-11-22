"use client";
// Pulls storyboard frames in the browser: steps through a video, keeps a frame at every cut
// (big change between neighbouring samples). Also cuts YouTube sprite sheets into tiles.

export type Frame = { t: number; blob: Blob; preview: string; w: number; h: number };
export type Progress = (done: number, found: number) => void;

const SMALL_W = 48, SMALL_H = 27;
const MAX_FRAMES = 80;
const CUT = 0.11; // mean pixel change (0..1) that counts as a new shot
const MIN_GAP = 0.8; // seconds between kept frames

export const proxied = (url: string) => `/api/media?url=${encodeURIComponent(url)}`;

function smallSample(src: CanvasImageSource, sx = 0, sy = 0, sw?: number, sh?: number) {
  const c = document.createElement("canvas");
  c.width = SMALL_W;
  c.height = SMALL_H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  if (sw && sh) g.drawImage(src, sx, sy, sw, sh, 0, 0, SMALL_W, SMALL_H);
  else g.drawImage(src, 0, 0, SMALL_W, SMALL_H);
  return g.getImageData(0, 0, SMALL_W, SMALL_H).data;
}

function diff(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let s = 0;
  for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return s / ((a.length / 4) * 3 * 255);
}

function isBlack(a: Uint8ClampedArray) {
  let s = 0;
  for (let i = 0; i < a.length; i += 4) s += a[i] + a[i + 1] + a[i + 2];
  return s / ((a.length / 4) * 3) < 10;
}

function toJpeg(c: HTMLCanvasElement) {
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.86));
}

async function grab(src: CanvasImageSource, w: number, h: number, sx = 0, sy = 0, sw = w, sh = h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  const blob = await toJpeg(c);
  return { blob, preview: URL.createObjectURL(blob), w, h };
}

function loadVideo(src: string) {
  return new Promise<HTMLVideoElement>((res, rej) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    v.onloadeddata = () => res(v);
    v.onerror = () => rej(new Error("Видео не открылось в браузере (формат или доступ)"));
    v.src = src;
  });
}

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((res) => {
    const done = () => { clearTimeout(timer); v.removeEventListener("seeked", done); res(); };
    const timer = setTimeout(done, 8000);
    v.addEventListener("seeked", done);
    v.currentTime = t;
  });
}

/** Scene-cut extraction from a playable video (object URL or same-origin proxied URL). */
export async function framesFromVideo(src: string, onProgress: Progress, signal: AbortSignal): Promise<Frame[]> {
  const v = await loadVideo(src);
  const duration = v.duration;
  if (!isFinite(duration) || duration <= 0) throw new Error("Не удалось узнать длину видео");
  const scale = Math.min(1, 1280 / v.videoWidth);
  const W = Math.round(v.videoWidth * scale), H = Math.round(v.videoHeight * scale);
  const step = Math.min(2, Math.max(0.25, duration / 500));

  const frames: Frame[] = [];
  let prev: Uint8ClampedArray | null = null;
  let last = -Infinity;
  for (let t = Math.min(0.1, duration / 2); t < duration && frames.length < MAX_FRAMES; t += step) {
    if (signal.aborted) break;
    await seek(v, t);
    const s = smallSample(v);
    const cut = prev === null || (diff(s, prev) > CUT && t - last >= MIN_GAP);
    if (cut && !isBlack(s)) {
      frames.push({ t, ...(await grab(v, W, H, 0, 0, v.videoWidth, v.videoHeight)) });
      last = t;
    }
    prev = s;
    onProgress(Math.min(1, t / duration), frames.length);
  }

  // one long take: fall back to evenly spaced frames
  if (frames.length < 2 && duration > 8 && !signal.aborted) {
    frames.forEach((f) => URL.revokeObjectURL(f.preview));
    frames.length = 0;
    const n = Math.min(12, Math.ceil(duration / 3));
    for (let i = 0; i < n; i++) {
      const t = (duration * (i + 0.5)) / n;
      await seek(v, t);
      frames.push({ t, ...(await grab(v, W, H, 0, 0, v.videoWidth, v.videoHeight)) });
      onProgress((i + 1) / n, frames.length);
    }
  }
  v.removeAttribute("src");
  v.load();
  return frames;
}

type Sprites = { sheets: { url: string; cols: number; rows: number; w: number; h: number; count: number }[]; interval: number };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Не загрузились кадры YouTube"));
    i.src = src;
  });
}

/** Cuts YouTube preview sprite sheets into tiles, keeping only the tiles where the shot changes. */
export async function framesFromSprites(sp: Sprites, onProgress: Progress, signal: AbortSignal): Promise<Frame[]> {
  const frames: Frame[] = [];
  let prev: Uint8ClampedArray | null = null;
  let idx = 0, last = -Infinity;
  for (let si = 0; si < sp.sheets.length && !signal.aborted; si++) {
    const sh = sp.sheets[si];
    const img = await loadImage(proxied(sh.url));
    const tw = img.naturalWidth / sh.cols, th = img.naturalHeight / sh.rows;
    for (let k = 0; k < sh.count && frames.length < MAX_FRAMES; k++, idx++) {
      const x = (k % sh.cols) * tw, y = Math.floor(k / sh.cols) * th;
      const t = idx * sp.interval;
      const s = smallSample(img, x, y, tw, th);
      const cut = prev === null || (diff(s, prev) > CUT && t - last >= MIN_GAP);
      if (cut && !isBlack(s)) {
        frames.push({ t, ...(await grab(img, Math.round(tw), Math.round(th), x, y, tw, th)) });
        last = t;
      }
      prev = s;
    }
    onProgress((si + 1) / sp.sheets.length, frames.length);
  }
  return frames;
}
