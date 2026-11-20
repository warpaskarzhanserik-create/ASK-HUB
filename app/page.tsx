import Link from "next/link";
import { db, type Project } from "@/lib/db";
import { createProject } from "./actions";
import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sql = await db();
  const projects = await sql<(Project & { thumbs: string[] | null; n: number })[]>`
    select p.*,
      (select array_agg(t) from (select coalesce(thumb_url, '') t from items i where i.project_id = p.id and thumb_url is not null order by id desc limit 3) x) thumbs,
      (select count(*)::int from items i where i.project_id = p.id) n
    from projects p order by p.created_at desc`;

  return (
    <>
      <TopBar />
      <main className="wrap stack">
        <form action={createProject} className="card pad row">
          <input name="name" placeholder="Новый проект — название" required className="grow" style={{ flex: "2 1 200px" }} />
          <input name="description" placeholder="Коротко о проекте (необязательно)" style={{ flex: "3 1 200px" }} />
          <button className="primary">+ Проект</button>
        </form>
        {projects.length === 0 && <p className="muted">Пока нет проектов. Создай первый выше.</p>}
        <div className="projects">
          {projects.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="card project-card">
              {p.thumbs && p.thumbs.length > 0 && (
                <div className="project-cover">
                  {p.thumbs.map((t, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={t} alt="" loading="lazy" />
                  ))}
                </div>
              )}
              <strong>{p.name}</strong>
              {p.description && <span className="muted small">{p.description}</span>}
              <span className="muted small">{p.n} рефов</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
