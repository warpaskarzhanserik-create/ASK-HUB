"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div className="card pad stack" style={{ width: "min(520px, 100%)" }}>
        <h2 className="danger">Что-то пошло не так</h2>
        <code style={{ whiteSpace: "pre-wrap" }}>{error.message || "Неизвестная ошибка"}{error.digest ? `\nкод: ${error.digest}` : ""}</code>
        <div className="row">
          <button className="primary" onClick={() => reset()}>Попробовать снова</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="btn" href="/">На главную</a>
        </div>
      </div>
    </main>
  );
}
