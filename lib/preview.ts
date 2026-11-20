// Turns a pasted link into something we can show: kind, embed url, thumbnail, title.
export type Preview = {
  kind: "image" | "video" | "link";
  source: "vimeo" | "youtube" | "instagram" | "image" | "video" | "url";
  embed_url: string | null;
  thumb_url: string | null;
  title: string;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function fetchText(url: string, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/json" }, signal: ctrl.signal, redirect: "follow" });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function meta(html: string, prop: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const v = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return v ? v.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'") : null;
}

export async function preview(raw: string): Promise<Preview> {
  const url = new URL(raw.trim());
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const path = url.pathname.toLowerCase();

  if (/\.(jpe?g|png|gif|webp|avif)$/.test(path)) {
    return { kind: "image", source: "image", embed_url: null, thumb_url: url.toString(), title: "" };
  }
  if (/\.(mp4|webm|mov)$/.test(path)) {
    return { kind: "video", source: "video", embed_url: url.toString(), thumb_url: null, title: "" };
  }

  if (host.endsWith("vimeo.com")) {
    const json = await fetchText(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.toString())}&width=1280`);
    let title = "", thumb: string | null = null, id: string | null = null;
    if (json) {
      try {
        const o = JSON.parse(json);
        title = o.title ?? "";
        thumb = o.thumbnail_url ?? null;
        id = o.video_id ? String(o.video_id) : null;
      } catch {}
    }
    id ??= url.pathname.match(/(\d{5,})/)?.[1] ?? null;
    if (!thumb && id) thumb = `https://vumbnail.com/${id}.jpg`;
    const hash = url.pathname.match(/\/\d+\/([0-9a-f]{6,})/)?.[1] ?? url.searchParams.get("h");
    const embed = id ? `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}` : null;
    return { kind: "video", source: "vimeo", embed_url: embed, thumb_url: thumb, title };
  }

  if (host === "youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
    const json = await fetchText(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`);
    let title = "";
    try { title = json ? JSON.parse(json).title ?? "" : ""; } catch {}
    return {
      kind: "video", source: "youtube",
      embed_url: id ? `https://www.youtube.com/embed/${id}` : null,
      thumb_url: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
      title,
    };
  }

  if (host.endsWith("instagram.com")) {
    const m = url.pathname.match(/\/(p|reel|reels|tv)\/([\w-]+)/);
    const type = m?.[1] === "reels" ? "reel" : m?.[1];
    const embed = m ? `https://www.instagram.com/${type}/${m[2]}/embed` : null;
    // Instagram often blocks server fetches; thumbnail is best-effort.
    const html = await fetchText(url.toString());
    const thumb = html ? meta(html, "og:image") : null;
    const title = html ? meta(html, "og:title") ?? "" : "";
    return { kind: "video", source: "instagram", embed_url: embed, thumb_url: thumb, title: title.slice(0, 200) };
  }

  const html = await fetchText(url.toString());
  return {
    kind: "link", source: "url", embed_url: null,
    thumb_url: html ? meta(html, "og:image") : null,
    title: (html ? meta(html, "og:title") ?? html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "" : "").slice(0, 200),
  };
}
