/**
 * The deal stepper a buyer watches after an offer is accepted (Task 5.7).
 *
 * Read-only for the buyer by design: the agent advances the stage, the buyer
 * follows it. Stages come straight from the `DealStage` enum, so this cannot
 * drift from the data — a stage added to the schema and not to `STAGES` is a
 * TypeScript error rather than a silently missing step.
 */

import type { DealStage } from "@/generated/prisma/enums";

const STAGES: { stage: DealStage; label: string }[] = [
  { stage: "OFFER_ACCEPTED", label: "Offer accepted" },
  { stage: "SOLICITOR_REFERRED", label: "Solicitor referred" },
  { stage: "CONVEYANCING", label: "Conveyancing" },
  { stage: "EXCHANGED", label: "Exchanged" },
  { stage: "COMPLETED", label: "Completed" },
];

export function DealTracker({ stage }: { stage: DealStage }) {
  const currentIndex = STAGES.findIndex((s) => s.stage === stage);

  return (
    <ol data-testid="deal-tracker" className="mt-5 grid gap-4 sm:grid-cols-5">
      {STAGES.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;

        return (
          <li
            key={s.stage}
            className="border-t-2 pt-3"
            style={{
              borderColor: done || current ? "var(--color-accent)" : "var(--color-line)",
            }}
          >
            <p
              className={`text-[11px] font-semibold tracking-[0.12em] uppercase ${
                current ? "text-accent" : "text-muted"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </p>
            <p
              aria-current={current ? "step" : undefined}
              className={`mt-1 text-sm ${
                done || current ? "font-medium text-primary" : "text-muted"
              }`}
            >
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
