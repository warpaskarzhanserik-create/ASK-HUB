import postgres from "postgres";

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
  var __schemaReady: Promise<void> | undefined;
}

function client() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!global.__sql) {
    global.__sql = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_URL.includes("localhost") ? false : "require", max: 5 });
  }
  return global.__sql;
}

async function createSchema() {
  const sql = client();
  await sql`create table if not exists projects (
    id serial primary key,
    name text not null,
    description text not null default '',
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists items (
    id serial primary key,
    project_id int not null references projects(id) on delete cascade,
    section text not null default 'mood',
    kind text not null,
    source text not null,
    url text not null,
    embed_url text,
    thumb_url text,
    title text not null default '',
    note text not null default '',
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists notes (
    id serial primary key,
    project_id int not null references projects(id) on delete cascade,
    title text not null default 'Без названия',
    body text not null default '',
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists shots (
    id serial primary key,
    project_id int not null references projects(id) on delete cascade,
    position int not null default 0,
    image_url text,
    scene text not null default '',
    shot_size text not null default '',
    description text not null default '',
    camera text not null default '',
    sound text not null default '',
    duration text not null default ''
  )`;
}

/** Returns a ready SQL client; creates tables on first use. */
export async function db() {
  const sql = client();
  if (!global.__schemaReady) {
    global.__schemaReady = createSchema().catch((e) => {
      global.__schemaReady = undefined;
      throw e;
    });
  }
  await global.__schemaReady;
  return sql;
}

export type Project = { id: number; name: string; description: string; created_at: Date };
export type Item = {
  id: number; project_id: number; section: "mood" | "video"; kind: "image" | "video" | "link";
  source: string; url: string; embed_url: string | null; thumb_url: string | null; title: string; note: string;
};
export type Note = { id: number; project_id: number; title: string; body: string; updated_at: Date };
export type Shot = {
  id: number; project_id: number; position: number; image_url: string | null; scene: string; shot_size: string;
  description: string; camera: string; sound: string; duration: string;
};
