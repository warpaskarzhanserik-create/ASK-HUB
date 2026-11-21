"use client";
import { useEffect, useState } from "react";
import Orb from "./Orb";

const KEY = "askhub-intro-seen";

/** Short (~2.8s) intro shown once per browser session. Click / any key skips it. */
export default function Intro() {
  const [state, setState] = useState<"hidden" | "play" | "out">("hidden");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; sessionStorage.setItem(KEY, "1"); } catch {}
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) return;
    setState("play");
    const t1 = setTimeout(() => setState("out"), 2600);
    const t2 = setTimeout(() => setState("hidden"), 3200);
    const skip = () => { setState("out"); setTimeout(() => setState("hidden"), 450); };
    window.addEventListener("keydown", skip, { once: true });
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("keydown", skip); };
  }, []);

  if (state === "hidden") return null;
  return (
    <div className={`intro ${state === "out" ? "intro-out" : ""}`} onClick={() => { setState("out"); setTimeout(() => setState("hidden"), 450); }}>
      <Orb rings idle={false} className="orb-xl" />
      <div className="intro-motto">
        <span>Ambition</span><i>·</i><span>Strategy</span><i>·</i><span>Knowledge</span>
      </div>
      <span className="intro-skip">Нажми, чтобы пропустить</span>
    </div>
  );
}
