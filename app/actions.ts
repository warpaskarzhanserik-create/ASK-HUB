"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { preview } from "@/lib/preview";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const isBlob = (u: string | null) => !!u && u.includes(".blob.vercel-storage.com");
async function removeBlob(u: string | null) {
  if (isBlob(u)) await del(u!).catch(() => {});
}

// ---- projects ----
export async function createProject(f: FormData) {
  const name = str(f, "name");
  if (!name) return;
  const sql = await db();
  const [p] = await sql`insert into projects (name, description) values (${name}, ${str(f, "description")}) returning id`;
  redirect(`/p/${p.id}`);
}

export async function updateProject(id: number, f: FormData) {
  const sql = await db();
  await sql`update projects set name = ${str(f, "name") || "Без названия"}, description = ${str(f, "description")} where id = ${id}`;
  revalidatePath(`/p/${id}`);
}

export async function deleteProject(id: number) {
  const sql = await db();
  const items = await sql`select url from items where project_id = ${id} and source = 'upload'`;
  const shots = await sql`select image_url from shots where project_id = ${id}`;
  const files = await sql`select url from files where project_id = ${id}`;
  await Promise.all([
    ...items.map((r) => removeBlob(r.url)),
    ...shots.map((r) => removeBlob(r.image_url)),
    ...files.map((r) => removeBlob(r.url)),
  ]);
  await sql`delete from projects where id = ${id}`;
  redirect("/");
}

// ---- moodboard / video items ----
export async function addLink(projectId: number, section: string, rawUrl: string) {
  let p;
  try {
    p = await preview(rawUrl);
  } catch {
    return "Не похоже на ссылку";
  }
  const sql = await db();
  await sql`insert into items (project_id, section, kind, source, url, embed_url, thumb_url, title)
    values (${projectId}, ${section}, ${p.kind}, ${p.source}, ${rawUrl.trim()}, ${p.embed_url}, ${p.thumb_url}, ${p.title})`;
  revalidatePath(`/p/${projectId}`);
  return null;
}

export async function addUpload(projectId: number, section: string, url: string, contentType: string, name: string) {
  const kind = contentType.startsWith("video/") ? "video" : "image";
  const sql = await db();
  await sql`insert into items (project_id, section, kind, source, url, embed_url, thumb_url, title)
    values (${projectId}, ${section}, ${kind}, 'upload', ${url}, ${kind === "video" ? url : null}, ${kind === "image" ? url : null}, ${name})`;
  revalidatePath(`/p/${projectId}`);
}

export async function updateItemNote(id: number, projectId: number, note: string) {
  const sql = await db();
  await sql`update items set note = ${note} where id = ${id}`;
  revalidatePath(`/p/${projectId}`);
}

export async function deleteItem(id: number, projectId: number) {
  const sql = await db();
  const [it] = await sql`delete from items where id = ${id} returning url, source`;
  if (it?.source === "upload") await removeBlob(it.url);
  revalidatePath(`/p/${projectId}`);
}

// ---- notes ----
export async function createNote(projectId: number) {
  const sql = await db();
  const [n] = await sql`insert into notes (project_id) values (${projectId}) returning id`;
  redirect(`/p/${projectId}?tab=notes&note=${n.id}`);
}

export async function saveNote(id: number, projectId: number, title: string, body: string) {
  const sql = await db();
  await sql`update notes set title = ${title || "Без названия"}, body = ${body}, updated_at = now() where id = ${id}`;
  revalidatePath(`/p/${projectId}`);
}

export async function deleteNote(id: number, projectId: number) {
  const sql = await db();
  await sql`delete from notes where id = ${id}`;
  redirect(`/p/${projectId}?tab=notes`);
}

// ---- storyboard shots ----
export async function addShot(projectId: number) {
  const sql = await db();
  await sql`insert into shots (project_id, position)
    values (${projectId}, (select coalesce(max(position), 0) + 1 from shots where project_id = ${projectId}))`;
  revalidatePath(`/p/${projectId}`);
}

const SHOT_FIELDS = ["scene", "shot_size", "description", "camera", "sound", "duration"] as const;
export async function saveShot(id: number, projectId: number, data: Partial<Record<(typeof SHOT_FIELDS)[number], string>>) {
  const clean: Record<string, string> = {};
  for (const k of SHOT_FIELDS) if (typeof data[k] === "string") clean[k] = data[k]!;
  if (!Object.keys(clean).length) return;
  const sql = await db();
  await sql`update shots set ${sql(clean)} where id = ${id}`;
  revalidatePath(`/p/${projectId}`);
}

export async function setShotImage(id: number, projectId: number, url: string | null) {
  const sql = await db();
  const [old] = await sql`select image_url from shots where id = ${id}`;
  await sql`update shots set image_url = ${url} where id = ${id}`;
  if (old?.image_url && old.image_url !== url) await removeBlob(old.image_url);
  revalidatePath(`/p/${projectId}`);
}

export async function moveShot(id: number, projectId: number, dir: -1 | 1) {
  const sql = await db();
  const rows = await sql`select id from shots where project_id = ${projectId} order by position, id`;
  const ids = rows.map((r) => r.id as number);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await sql.begin(async (tx) => {
    for (let k = 0; k < ids.length; k++) await tx`update shots set position = ${k + 1} where id = ${ids[k]}`;
  });
  revalidatePath(`/p/${projectId}`);
}

export async function deleteShot(id: number, projectId: number) {
  const sql = await db();
  const [s] = await sql`delete from shots where id = ${id} returning image_url`;
  await removeBlob(s?.image_url ?? null);
  revalidatePath(`/p/${projectId}`);
}

// ---- client files (PDF with a public link) ----
export async function addClientFile(projectId: number, url: string, name: string, size: number) {
  if (!isBlob(url)) throw new Error("Файл не из хранилища");
  const token = randomBytes(9).toString("base64url");
  const sql = await db();
  await sql`insert into files (project_id, token, name, url, size) values (${projectId}, ${token}, ${name}, ${url}, ${Math.max(0, Math.round(size))})`;
  revalidatePath(`/p/${projectId}`);
}

export async function renameClientFile(id: number, projectId: number, name: string) {
  const sql = await db();
  await sql`update files set name = ${name.trim() || "Документ"} where id = ${id}`;
  revalidatePath(`/p/${projectId}`);
}

export async function deleteClientFile(id: number, projectId: number) {
  const sql = await db();
  const [f] = await sql`delete from files where id = ${id} returning url`;
  await removeBlob(f?.url ?? null);
  revalidatePath(`/p/${projectId}`);
}
