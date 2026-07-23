import type { EpcRating } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

type Tone = "default" | "success" | "warning" | "danger" | "intel";

const TONES: Record<Tone, string> = {
  default: "bg-pale text-secondary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  intel: "bg-intel/15 text-intel",
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

// Official-ish EPC band colours; every listing must show its rating (UK law).
const EPC_COLOURS: Record<EpcRating, string> = {
  A: "bg-[#008054] text-white",
  B: "bg-[#19b459] text-white",
  C: "bg-[#8dce46] text-primary",
  D: "bg-[#ffd500] text-primary",
  E: "bg-[#fcaa65] text-primary",
  F: "bg-[#ef8023] text-white",
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
