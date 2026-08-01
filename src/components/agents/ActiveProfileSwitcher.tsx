"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { setActiveAgentProfile } from "@/app/agent/actions";

export interface ActiveProfileOption {
  id: string;
  agencyName: string;
}

/**
 * Agent nav's multi-profile switcher (Task 2.4). Renders only when the agent
 * owns more than one profile — a single profile needs no switcher, and the
 * caller (`AgentLayout`) already shows the lone agency's name instead. On
 * change it calls the `setActiveAgentProfile` server action (which
 * re-verifies ownership before writing the cookie — this component never
 * writes anything itself) then refreshes the route so server components
 * that read the active profile (e.g. `/agent/listings/new`) pick it up.
 */
export function ActiveProfileSwitcher({
  profiles,
  activeId,
}: {
  profiles: ActiveProfileOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label="Active agency profile"
      options={profiles.map((p) => ({ value: p.id, label: p.agencyName }))}
      value={activeId}
      disabled={pending}
      className="w-auto min-w-[12rem]"
      onChange={(e) => {
        const nextId = e.target.value;
        startTransition(async () => {
          await setActiveAgentProfile(nextId);
          router.refresh();
        });
      }}
    />
  );
}
