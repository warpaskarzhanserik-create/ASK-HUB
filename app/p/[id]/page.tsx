import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type ClientFile, type Item, type Note, type Project, type Shot } from "@/lib/db";
import { createNote, deleteProject, updateProject } from "@/app/actions";
import TopBar from "@/components/TopBar";
import ServerProblem from "@/components/ServerProblem";
import AddRefs from "@/components/AddRefs";
import Items from "@/components/Items";
import NoteEditor from "@/components/NoteEditor";
import Storyboard from "@/components/Storyboard";
import ClientFiles from "@/components/ClientFiles";

export const dynamic = "force-dynamic";

const TABS = [
  ["mood", "Мудборд"],
  ["video", "Видео‑рефы"],
  ["notes", "Заметки"],
  ["board", "Раскадровка"],
  ["files", "Файлы для клиента"],
  ["settings", "Настройки"],
] as const;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; note?: string }>;
};

export default async function ProjectPage(props: PageProps) {
  try {
    return await ProjectInner(props);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    return <ServerProblem error={e} />;
  }
}

async function ProjectInner({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const { tab: rawTab, note: noteParam } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const tab = TABS.some(([k]) => k === rawTab) ? rawTab! : "mood";

  const sql = await db();
  const [project] = await sql<Project[]>`select * from projects where id = ${id}`;
  if (!project) notFound();

  return (
    <>
      <TopBar>
        <Link href="/">/ Index</Link>
        <span>/</span>
        <strong>{project.name}</strong>
      </TopBar>
      <main className="wrap">
        <section className="page-title">
          <span className="label">Проект №{String(id).padStart(2, "0")} · {new Date(project.created_at).toLocaleDateString("ru-RU")}</span>
          <h1>{project.name}</h1>
          {project.description && <span className="muted" style={{ maxWidth: 720 }}>{project.description}</span>}
        </section>
        <nav className="tabs">
          {TABS.map(([k, label], i) => (
            <Link key={k} href={`/p/${id}?tab=${k}`} className={k === tab ? "on" : ""}>
              <span>{String(i + 1).padStart(2, "0")}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="tab-body" key={tab}>

        {(tab === "mood" || tab === "video") && (
          <div className="stack">
            <AddRefs projectId={id} section={tab} />
            <Items
              layout={tab}
              items={await sql<Item[]>`select * from items where project_id = ${id} and section = ${tab} order by created_at desc`}
            />
          </div>
        )}

        {tab === "notes" && <NotesTab projectId={id} noteId={Number(noteParam) || null} />}

        {tab === "board" && (
          <Storyboard projectId={id} shots={await sql<Shot[]>`select * from shots where project_id = ${id} order by position, id`} />
        )}

        {tab === "files" && (
          <ClientFiles projectId={id} files={await sql<ClientFile[]>`select * from files where project_id = ${id} order by created_at desc`} />
        )}

        {tab === "settings" && (
          <div className="stack" style={{ maxWidth: 560 }}>
            <form action={updateProject.bind(null, id)} className="card pad stack">
              <h2>Проект</h2>
              <input name="name" defaultValue={project.name} required />
              <textarea name="description" defaultValue={project.description} placeholder="Описание" />
              <button className="primary">Сохранить</button>
            </form>
            <form action={deleteProject.bind(null, id)} className="card pad stack">
              <h2 className="danger">Удалить проект</h2>
              <span className="muted small">Удалит все рефы, заметки, раскадровку, PDF для клиента и загруженные файлы проекта. Клиентские ссылки перестанут работать. Отменить нельзя.</span>
              <button className="danger">Удалить навсегда</button>
            </form>
          </div>
        )}
        </div>
      </main>
    </>
  );
}

async function NotesTab({ projectId, noteId }: { projectId: number; noteId: number | null }) {
  const sql = await db();
  const notes = await sql<Note[]>`select * from notes where project_id = ${projectId} order by updated_at desc`;
  const current = notes.find((n) => n.id === noteId) ?? notes[0];
  return (
    <div className="notes">
      <aside className="note-list">
        <form action={createNote.bind(null, projectId)}>
          <button className="primary" style={{ width: "100%" }}>+ Заметка</button>
        </form>
        {notes.map((n, i) => (
          <Link key={n.id} href={`/p/${projectId}?tab=notes&note=${n.id}`} className={n.id === current?.id ? "on" : ""}>
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            <span>{n.title}</span>
            <span className="muted small">{new Date(n.updated_at).toLocaleDateString("ru-RU")}</span>
          </Link>
        ))}
      </aside>
      <section className="note-main">{current ? <NoteEditor key={current.id} note={current} /> : <p className="muted">Заметок пока нет.</p>}</section>
    </div>
  );
}
