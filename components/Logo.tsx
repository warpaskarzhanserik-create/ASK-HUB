/** ASK HUB mark: four-point "spark" star with concave sides (from the reference animation). */
export const STAR_PATH = "M30 0 C32 30 38 46 54 50 C38 54 32 70 30 100 C28 70 22 54 6 50 C22 46 28 30 30 0Z";

export function Star({ size = 18, color = "currentColor", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg className={className} width={size * 0.6} height={size} viewBox="0 0 60 100" aria-hidden>
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}
