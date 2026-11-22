// Finds something we can pull frames from for a pasted video link.
// - "video": a direct playable file (mp4/webm/mov, Vimeo progressive file, Instagram og:video)
// - "sprites": YouTube's own preview sprite sheets (YouTube doesn't hand out the video itself)
export type SpriteSheet = { url: string; cols: number; rows: number; w: number; h: number; count: number };
export type Resolved = {
  platform: "file" | "vimeo" | "youtube" | "instagram" | "url";
  title: string;
  duration: number | null;
  video_url: string | null;
  sprites: { sheets: SpriteSheet[]; interval: number; total: number } | null;
  error: string | null;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function get(url: string, headers: Record<string, string> = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9", ...headers },
      signal: ctrl.signal,
      redirect: "follow",
    });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const unescape = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\\u0026/g, "&").replace(/\\\//g, "/");

function meta(html: string, prop: string) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, "i"))?.[0];
  const v = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return v ? unescape(v) : null;
}

function empty(platform: Resolved["platform"], error: string | null = null): Resolved {
  return { platform, title: "", duration: null, video_url: null, sprites: null, error };
}

async function vimeo(url: URL): Promise<Resolved> {
  const id = url.pathname.match(/(\d{5,})/)?.[1];
  if (!id) return empty("vimeo", "Не нашёл номер видео в ссылке Vimeo");
  const hash = url.pathname.match(/\/\d+\/([0-9a-f]{6,})/)?.[1] ?? url.searchParams.get("h");
  const text = await get(`https://player.vimeo.com/video/${id}/config${hash ? `?h=${hash}` : ""}`, {
    referer: "https://vimeo.com/",
  });
  if (!text) return empty("vimeo", "Vimeo не отдал видео (возможно, оно закрыто настройками приватности)");
  try {
    const c = JSON.parse(text);
    const files: { url: string; width: number; height: number }[] = c?.request?.files?.progressive ?? [];
    const best = files.filter((f) => f.height <= 1080).sort((a, b) => b.height - a.height)[0] ?? files[0];
    return {
      platform: "vimeo",
      title: c?.video?.title ?? "",
      duration: c?.video?.duration ?? null,
      video_url: best?.url ?? null,
      sprites: null,
      error: best ? null : "Автор на Vimeo закрыл видео для скачивания. Скачай файл и перетащи его сюда",
    };
  } catch {
    return empty("vimeo", "Vimeo ответил непонятно");
  }
}

/** YouTube storyboard spec: "baseUrl|w#h#count#cols#rows#intervalMs#name#sigh|…" — one level per "|" part. */
function youtubeSprites(spec: string, duration: number | null): Resolved["sprites"] {
  const [base, ...levels] = spec.split("|");
  if (!levels.length) return null;
  const L = levels.length - 1; // biggest tiles
  const [w, h, count, cols, rows, interval, name, sigh] = levels[L].split("#");
  const n = Number(count), c = Number(cols), r = Number(rows);
  if (!n || !c || !r) return null;
  const perSheet = c * r;
  const sheets: SpriteSheet[] = [];
  for (let i = 0; i * perSheet < n; i++) {
    const file = name.replace("$M", String(i));
    const u = base.replace("$L", String(L)).replace("$N", file);
    sheets.push({ url: `${u}${u.includes("?") ? "&" : "?"}sigh=${sigh}`, cols: c, rows: r, w: Number(w), h: Number(h), count: Math.min(perSheet, n - i * perSheet) });
  }
  const iv = Number(interval) > 0 ? Number(interval) / 1000 : duration ? duration / n : 1;
  return { sheets, interval: iv, total: n };
}

async function youtube(url: URL, host: string): Promise<Resolved> {
  const id =
    host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
  if (!id) return empty("youtube", "Не нашёл номер видео в ссылке YouTube");
  const html = await get(`https://www.youtube.com/watch?v=${id}&hl=en`, { cookie: "CONSENT=YES+1; SOCS=CAI" });
  if (!html) return empty("youtube", "YouTube не ответил");
  const spec = html.match(/"playerStoryboardSpecRenderer":\{"spec":"([^"]+)"/)?.[1];
  const duration = Number(html.match(/"lengthSeconds":"(\d+)"/)?.[1]) || null;
  const title = unescape(html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? meta(html, "og:title") ?? "");
  const sprites = spec ? youtubeSprites(unescape(spec), duration) : null;
  return {
    platform: "youtube", title, duration, video_url: null, sprites,
    error: sprites ? null : "YouTube не дал кадры для этого видео. Скачай файл и перетащи его сюда",
  };
}

async function instagram(url: URL): Promise<Resolved> {
  const html = await get(url.toString());
  const video = html ? meta(html, "og:video") ?? meta(html, "og:video:secure_url") : null;
  return {
    platform: "instagram",
    title: (html ? meta(html, "og:title") ?? "" : "").slice(0, 200),
    duration: null,
    video_url: video,
    sprites: null,
    error: video ? null : "Instagram не отдал видео (он часто блокирует). Скачай файл и перетащи его сюда",
  };
}

export async function resolveVideo(raw: string): Promise<Resolved> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return empty("url", "Не похоже на ссылку");
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (/\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) {
    return { ...empty("file"), title: decodeURIComponent(url.pathname.split("/").pop() ?? ""), video_url: url.toString() };
  }
  if (host.endsWith("vimeo.com")) return vimeo(url);
  if (host === "youtube.com" || host === "youtu.be") return youtube(url, host);
  if (host.endsWith("instagram.com")) return instagram(url);

  const html = await get(url.toString());
  const video = html ? meta(html, "og:video") ?? meta(html, "og:video:url") : null;
  return {
    ...empty("url", video ? null : "На этой странице не нашёл видеофайл. Скачай видео и перетащи его сюда"),
    title: html ? meta(html, "og:title") ?? "" : "",
    video_url: video && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(video) ? video : null,
  };
}
