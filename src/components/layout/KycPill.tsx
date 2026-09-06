import type { KycStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

/**
 * The tinted-self treatment: the status colour supplies both a low-opacity
 * tint and the ink on it.
 *
 * There used to be a second `dark` tone, for the navy `<SiteHeader>` bar, where
 * these tints inverted into muddy near-black and their dark ink disappeared. It
 * went solid instead — status colour as the fill, white as the ink. The bar is
 * light on every page since ADR-009, so that tone had no callers left and has
 * been removed rather than kept as an unexercised branch.
 */
const STYLES: Record<KycStatus, string> = {
  NOT_STARTED: "bg-pale text-secondary",
  PENDING: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};

const LABELS: Record<KycStatus, string> = {
  NOT_STARTED: "KYC: not started",
  PENDING: "KYC: pending",
  APPROVED: "KYC: verified",
  REJECTED: "KYC: rejected",
};

export function KycPill({ status }: { status: KycStatus }) {
  return (
    <span
      data-testid="kyc-pill"
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
