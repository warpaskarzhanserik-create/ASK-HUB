"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [err, action, pending] = useActionState(login, null);
  return (
    <main className="wrap" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <form action={action} className="card pad stack" style={{ width: "min(360px, 100%)" }}>
        <div className="brand" style={{ fontSize: 22 }}>Refs<span>.</span></div>
        <input name="email" type="email" placeholder="Email" autoComplete="username" required />
        <input name="password" type="password" placeholder="Пароль" autoComplete="current-password" required />
        {err && <div className="danger small">{err}</div>}
        <button className="primary" disabled={pending}>{pending ? "Вход…" : "Войти"}</button>
      </form>
    </main>
  );
}
