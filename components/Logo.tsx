/** ASK mark: four-point "spark" star with concave sides (from the reference animation). */
export const STAR_PATH = "M30 0 C32 30 38 46 54 50 C38 54 32 70 30 100 C28 70 22 54 6 50 C22 46 28 30 30 0Z";

export function Star({ size = 18, color = "currentColor", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg className={className} width={size * 0.6} height={size} viewBox="0 0 60 100" aria-hidden>
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}

/** Logo lockup: spark star in the middle of a letter triangle — S on top, A bottom-left, K bottom-right. */
export function AskMark({ className = "", star = true }: { className?: string; star?: boolean }) {
  return (
    <span className={`askmark ${className}`} aria-label="ASK">
      {star && (
        <svg className="am-star" viewBox="0 0 60 100" aria-hidden>
          <path d={STAR_PATH} />
        </svg>
      )}
      <span className="am-a">A</span>
      <span className="am-s">S</span>
      <span className="am-k">K</span>
    </span>
  );
}

/** Logo: "star" = the mark alone (header, inner pages, loading, favicon); "full" = star + ASK letters (intro, home hero). */
export function Logo({ variant = "star", size = 22, className = "" }: { variant?: "star" | "full"; size?: number; className?: string }) {
  return variant === "full" ? <AskMark className={className} /> : <Star size={size} className={`logo-star ${className}`} />;
}
