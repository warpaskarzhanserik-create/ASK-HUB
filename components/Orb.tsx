import { STAR_PATH } from "./Logo";

/**
 * Glowing grainy sphere with the black spark star in the middle.
 * `rings` adds the spiralling light arcs used in the intro.
 * Colours come from --orb-* CSS variables (swap them for the red/orange version).
 */
export default function Orb({ rings = false, idle = true, className = "" }: { rings?: boolean; idle?: boolean; className?: string }) {
  return (
    <div className={`orb ${rings ? "orb-intro" : ""} ${idle ? "orb-idle" : ""} ${className}`} aria-hidden>
      {rings && (
        <>
          <span className="orb-ring r1" />
          <span className="orb-ring r2" />
          <span className="orb-ring r3" />
        </>
      )}
      <span className="orb-halo" />
      <span className="orb-ball">
        <span className="orb-grain" />
      </span>
      <svg className="orb-star" viewBox="0 0 60 100">
        <path d={STAR_PATH} />
      </svg>
    </div>
  );
}
