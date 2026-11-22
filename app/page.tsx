import { db, type Project } from "@/lib/db";
import { createProject } from "./actions";
import TopBar from "@/components/TopBar";
import ServerProblem from "@/components/ServerProblem";
import ProjectIndex, { type Row } from "@/components/ProjectIndex";
import Intro from "@/components/Intro";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    return await HomeInner();
  } catch (e) {
    return <ServerProblem error={e} />;
  }
}

async function HomeInner() {
  const sql = await db();
  const projects = await sql<(Project & { thumbs: string[] | null; n: number })[]>`
    select p.*,
      (select array_agg(t) from (select coalesce(thumb_url, '') t from items i where i.project_id = p.id and thumb_url is not null order by id desc limit 3) x) thumbs,
      (select count(*)::int from items i where i.project_id = p.id) n
    from projects p order by p.created_at desc`;

  const total = projects.reduce((a, p) => a + p.n, 0);
  const rows: Row[] = projects.map((p) => ({
    id: p.id, name: p.name, description: p.description, n: p.n,
    thumb: p.thumbs?.[0] || null,
    created: new Date(p.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }),
  }));

  return (
    <>
      <TopBar><span>/ Index</span></TopBar>
      <Intro />
      <main className="wrap">
        <section className="hero">
          <div className="arc" aria-hidden><span className="arc-grain" /></div>
          <h1 className="motto">
            <span>Амбиции</span>
            <span>Стратегия</span>
            <span>Знания</span>
          </h1>
          <div className="hero-meta">
            <div><span className="label">Проекты</span><span>{String(projects.length).padStart(2, "0")}</span></div>
            <div><span className="label">Рефы</span><span>{String(total).padStart(2, "0")}</span></div>
            <div><span className="label">ASK</span><span>Ambition · Strategy · Knowledge</span></div>
            <div><span className="label">Разделы</span><span>Мудборд · Видео · Заметки · Раскадровка</span></div>
          </div>
        </section>

        <form action={createProject} className="create">
          <span className="num">+{String(projects.length + 1).padStart(2, "0")}</span>
          <input name="name" placeholder="Название нового проекта" required />
          <input name="description" className="desc" placeholder="Коротко о проекте (необязательно)" />
          <button className="primary">Создать</button>
        </form>

        {projects.length === 0 ? (
          <p className="empty">Пока нет проектов. Создай первый выше.</p>
        ) : (
          <ProjectIndex rows={rows} />
        )}
      </main>
    </>
  );
}
