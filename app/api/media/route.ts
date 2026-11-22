// Same-origin pass-through for remote videos / YouTube sprite sheets, so the browser can read
// their pixels (canvas) to pull storyboard frames. Forwards Range so seeking stays cheap.
export const runtime = "nodejs";
export const maxDuration = 60;

function allowed(u: URL) {
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;
  if (/^\[|^\d+\.\d+\.\d+\.\d+$/.test(h)) return false; // no bare IPs (private network)
  return true;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (!allowed(target)) return new Response("forbidden", { status: 403 });

  const headers: Record<string, string> = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  };
  const range = req.headers.get("range");
  if (range) headers.range = range;
  if (target.hostname.includes("vimeo")) headers.referer = "https://player.vimeo.com/";

  const r = await fetch(target, { headers, redirect: "follow" }).catch(() => null);
  if (!r) return new Response("upstream failed", { status: 502 });
  const type = r.headers.get("content-type") ?? "";
  if (r.ok && !/^(video|image)\/|octet-stream/.test(type)) return new Response("not media", { status: 415 });

  const out = new Headers();
  for (const k of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
    const v = r.headers.get(k);
    if (v) out.set(k, v);
  }
  out.set("cache-control", "private, max-age=3600");
  return new Response(r.body, { status: r.status, headers: out });
}
