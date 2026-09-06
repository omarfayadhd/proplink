import type { EpcRating } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

type Tone = "default" | "success" | "warning" | "danger" | "intel";

const TONES: Record<Tone, string> = {
  default: "bg-pale text-secondary",
  success: "bg-success/15 text-success",
  // 10%, not 15%, like its siblings: at /15 the warning tint (#f1e6d9 over
  // white) puts #a05a00 at 4.31:1, just under WCAG AA's 4.5:1 for this badge's
  // 12px text — caught by the Lighthouse a11y audit of `/marketplace/[id]`
  // (Task 2.5), where distress-tag chips use this tone. The lighter tint takes
  // it to 4.61:1 without touching the brand token itself.
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/15 text-danger",
  // `text-primary`, not `text-intel`: #0099A8 on its own /15 tint is 2.89:1 and
  // no tint fixes it (the hue is simply too light to be foreground ink), while
  // the navy on that tint is 13.5:1. Keeps the intel hue as the tint, so the
  // tone still reads as "intel", without a brand-token change — the same
  // dark-ink-on-light-band trick `EpcBadge` already uses for bands C–E.
  intel: "bg-intel/15 text-primary",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Official-ish EPC band colours; every listing must show its rating (UK law),
 * so the band colour is fixed and the **ink is the only variable**.
 *
 * Each band takes whichever of white or `primary` clears AA on it, measured:
 * A 4.98 (white), B 6.12, C 8.76, D 11.71, E 8.78, F 6.17 (all ink), G 4.53
 * (white). B and F were white and measured **2.72:1 and 2.70:1** — caught by
 * the page-wide contrast sweep, on an element UK law requires to be shown.
 */
const EPC_COLOURS: Record<EpcRating, string> = {
  A: "bg-[#008054] text-white",
  B: "bg-[#19b459] text-primary",
  C: "bg-[#8dce46] text-primary",
  D: "bg-[#ffd500] text-primary",
  E: "bg-[#fcaa65] text-primary",
  F: "bg-[#ef8023] text-primary",
  G: "bg-[#e9153b] text-white",
};

export function EpcBadge({ rating }: { rating: EpcRating | null | undefined }) {
  if (!rating) {
    return <Badge tone="warning">EPC pending</Badge>;
  }
  return (
    <span
      data-testid="epc-badge"
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold",
        EPC_COLOURS[rating],
      )}
      title={`EPC rating ${rating}`}
    >
      {rating}
    </span>
  );
}
