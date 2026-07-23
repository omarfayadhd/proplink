import type { KycStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

const STYLES: Record<KycStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: "KYC: not started", className: "bg-pale text-secondary" },
  PENDING: { label: "KYC: pending", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "KYC: verified", className: "bg-success/15 text-success" },
  REJECTED: { label: "KYC: rejected", className: "bg-danger/15 text-danger" },
};

export function KycPill({ status }: { status: KycStatus }) {
  const s = STYLES[status];
  return (
    <span
      data-testid="kyc-pill"
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}
