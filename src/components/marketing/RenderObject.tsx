/**
 * The landing page's section objects (ADR-014).
 *
 * The reference's visual language is soft 3D objects floating on flat colour.
 * Those renders do not exist yet — H3.4, brief at
 * `docs/marketing/section-render-prompts.md` — so these are geometric SVG
 * stand-ins with the **same silhouettes** the renders are specified to have.
 * That matters: the layout, the scroll orbit's rotation and the section
 * proportions are all tuned against these shapes, so a render that matches the
 * brief drops in without moving anything.
 *
 * Drawn only from palette tokens, with two gradient stops per face to suggest
 * volume — enough to read as an object rather than a flat icon, without
 * pretending to be a render.
 *
 * Swapping one in: replace that variant's `<svg>` with a statically imported
 * `<Image>`. They are square, transparent, and always sized by the caller.
 */

export type RenderVariant = "gable" | "stack" | "loop" | "signal";

/**
 * Gradients are declared per instance with a variant-scoped id: two of these
 * can share a page, and duplicate `<defs>` ids would make the second silently
 * inherit the first's fills.
 */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor="var(--color-pale)" stopOpacity="0.32" />
        <stop offset="1" stopColor="var(--color-pale)" stopOpacity="0.06" />
      </linearGradient>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--color-accent)" />
        <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.72" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="0.5" cy="0.42" r="0.6">
        <stop offset="0" stopColor="var(--color-pale)" stopOpacity="0.16" />
        <stop offset="1" stopColor="var(--color-pale)" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export function RenderObject({
  variant,
  className,
}: {
  variant: RenderVariant;
  className?: string;
}) {
  const id = `ro-${variant}`;
  const common = {
    viewBox: "0 0 240 240",
    role: "presentation" as const,
    className,
  };

  if (variant === "gable") {
    return (
      <svg {...common}>
        <Defs id={id} />
        <circle cx="120" cy="112" r="112" fill={`url(#${id}-glow)`} />
        {/* Extruded gable: the lit front face in ember, the receding side in
            the pale body wash, with a soft contact shadow beneath. */}
        <ellipse
          cx="120"
          cy="206"
          rx="66"
          ry="10"
          fill="var(--color-primary)"
          opacity="0.18"
        />
        <path
          d="M120 44 178 100v88a10 10 0 0 1-10 10h-96a10 10 0 0 1-10-10v-88Z"
          fill={`url(#${id}-body)`}
        />
        <path d="M120 44 178 100h-32L120 76Z" fill={`url(#${id}-face)`} opacity="0.9" />
        <path
          d="M120 44 62 100v88a10 10 0 0 0 10 10h26V128a12 12 0 0 1 24 0v70"
          fill={`url(#${id}-face)`}
          opacity="0.28"
        />
        <path
          d="M120 44 178 100v88a10 10 0 0 1-10 10h-96a10 10 0 0 1-10-10v-88Z"
          fill="none"
          stroke="var(--color-pale)"
          strokeOpacity="0.35"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (variant === "stack") {
    return (
      <svg {...common}>
        <Defs id={id} />
        <circle cx="120" cy="112" r="112" fill={`url(#${id}-glow)`} />
        <ellipse
          cx="120"
          cy="212"
          rx="74"
          ry="10"
          fill="var(--color-primary)"
          opacity="0.18"
        />
        {/* Three slabs offset by a stage each, the top one lifting away. */}
        {[
          { y: 158, o: 0 },
          { y: 128, o: 10 },
          { y: 98, o: 20 },
        ].map((slab, i) => (
          <rect
            key={slab.y}
            x={46 + slab.o}
            y={slab.y}
            width="148"
            height="34"
            rx="12"
            fill={`url(#${id}-body)`}
            stroke="var(--color-pale)"
            strokeOpacity={0.3 + i * 0.06}
            strokeWidth="2"
          />
        ))}
        <rect
          x="76"
          y="46"
          width="148"
          height="34"
          rx="12"
          fill={`url(#${id}-face)`}
          opacity="0.9"
          transform="rotate(-8 150 63)"
        />
      </svg>
    );
  }

  if (variant === "loop") {
    return (
      <svg {...common}>
        <Defs id={id} />
        <circle cx="120" cy="112" r="112" fill={`url(#${id}-glow)`} />
        <ellipse
          cx="120"
          cy="204"
          rx="70"
          ry="10"
          fill="var(--color-primary)"
          opacity="0.18"
        />
        {/* A tilted torus with one quadrant in ember — the refurb cycle. */}
        <g transform="rotate(-18 120 118)">
          <ellipse
            cx="120"
            cy="118"
            rx="80"
            ry="56"
            fill="none"
            stroke={`url(#${id}-body)`}
            strokeWidth="30"
          />
          <ellipse
            cx="120"
            cy="118"
            rx="80"
            ry="56"
            fill="none"
            stroke="var(--color-pale)"
            strokeOpacity="0.34"
            strokeWidth="30"
            strokeDasharray="112 320"
            strokeLinecap="round"
          />
          <ellipse
            cx="120"
            cy="118"
            rx="80"
            ry="56"
            fill="none"
            stroke={`url(#${id}-face)`}
            strokeWidth="30"
            strokeDasharray="92 340"
            strokeDashoffset="150"
            strokeLinecap="round"
            opacity="0.92"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <Defs id={id} />
      <circle cx="120" cy="112" r="112" fill={`url(#${id}-glow)`} />
      <ellipse
        cx="120"
        cy="206"
        rx="72"
        ry="10"
        fill="var(--color-primary)"
        opacity="0.18"
      />
      {/* Three bars on a plinth, tallest in ember. */}
      <rect x="44" y="188" width="152" height="14" rx="7" fill={`url(#${id}-body)`} />
      {[
        { x: 62, h: 62, accent: false },
        { x: 104, h: 116, accent: true },
        { x: 146, h: 86, accent: false },
      ].map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={188 - bar.h}
          width="32"
          height={bar.h}
          rx="14"
          fill={bar.accent ? `url(#${id}-face)` : `url(#${id}-body)`}
          stroke="var(--color-pale)"
          strokeOpacity="0.3"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
