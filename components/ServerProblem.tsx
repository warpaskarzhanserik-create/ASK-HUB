import TopBar from "./TopBar";

export default function ServerProblem({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <>
      <TopBar />
      <main className="wrap stack">
        <div className="card pad stack">
          <h2 className="danger">Сервер не смог загрузить данные</h2>
          <code style={{ whiteSpace: "pre-wrap" }}>{msg}</code>
          <span className="muted small">Пришли скриншот этого текста, и я подскажу, что поправить.</span>
        </div>
      </main>
    </>
  );
}
