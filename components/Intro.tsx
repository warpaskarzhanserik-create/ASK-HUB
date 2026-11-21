"use client";
import { useEffect, useState } from "react";
import { AskMark } from "./Logo";

const KEY = "askhub-intro-seen";

/**
 * ~3s intro, once per browser session, skippable (click / any key):
 * the ASK letters appear on black, light is born inside them and spreads
 * into the horizon gradient, then the site fades in underneath.
 */
export default function Intro() {
  const [state, setState] = useState<"hidden" | "play" | "out">("hidden");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; sessionStorage.setItem(KEY, "1"); } catch {}
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) return;
    setState("play");
    const t1 = setTimeout(() => setState("out"), 2500);
    const t2 = setTimeout(() => setState("hidden"), 3300);
    const skip = () => { setState("out"); setTimeout(() => setState("hidden"), 500); };
    window.addEventListener("keydown", skip, { once: true });
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("keydown", skip); };
  }, []);

  if (state === "hidden") return null;
  const skip = () => { setState("out"); setTimeout(() => setState("hidden"), 500); };
  return (
    <div className={`intro ${state === "out" ? "intro-out" : ""}`} onClick={skip}>
      <div className="intro-light" aria-hidden><span className="arc-grain" /></div>
      <div className="intro-logo"><AskMark /></div>
      <div className="intro-motto">
        <span>Ambition</span><i>·</i><span>Strategy</span><i>·</i><span>Knowledge</span>
      </div>
      <span className="intro-skip">Нажми, чтобы пропустить</span>
    </div>
  );
}
