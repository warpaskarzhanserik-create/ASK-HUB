import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export function hasSecret() {
  return !!(process.env.AUTH_SECRET ?? "").trim();
}

function secret() {
  const s = (process.env.AUTH_SECRET ?? "").trim();
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createSession() {
  const token = await new SignJWT({ u: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  return { token, maxAge: MAX_AGE };
}

export async function verifySession(token: string | undefined) {
  if (!token || !hasSecret()) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();

/** "ok" | "bad" | "unset" (server env vars missing) */
export function checkCredentials(email: string, password: string): "ok" | "bad" | "unset" {
  const e = clean(process.env.ADMIN_EMAIL).toLowerCase();
  const p = clean(process.env.ADMIN_PASSWORD);
  if (!e || !p) return "unset";
  const okEmail = safeEqual(email.trim().toLowerCase(), e);
  const okPass = safeEqual(password.trim(), p);
  return okEmail && okPass ? "ok" : "bad";
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
