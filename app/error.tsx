"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div className="card pad stack" style={{ width: "min(520px, 100%)" }}>
        <h2 className="danger">Что-то пошло не так</h2>
        <code style={{ whiteSpace: "pre-wrap" }}>{error.message || "Неизвестная ошибка"}{error.digest ? `\nкод: ${error.digest}` : ""}</code>
        <div className="row">
          <button className="primary" onClick={() => reset()}>Попробовать снова</button>
          <a className="btn" href="/login">На страницу входа</a>
        </div>
      </div>
    </main>
  );
}
