"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="ru">
      <body style={{ background: "#111", color: "#eee", fontFamily: "sans-serif", padding: 24 }}>
        <h2>Что-то пошло не так</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}{error.digest ? `\nкод: ${error.digest}` : ""}</pre>
        <a href="/login" style={{ color: "#e8c547" }}>На страницу входа</a>
      </body>
    </html>
  );
}
