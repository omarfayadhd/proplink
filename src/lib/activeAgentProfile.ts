/**
 * Task 2.4 multi-profile switching: an agent user can own several
 * `AgentProfile` rows (see seed: one agent, three agencies). Rather than a
 * new `User` column (a migration for a purely-client-convenience value), the
 * "active profile" the agent is currently working as is persisted in a
 * cookie — the lightest fit per the task brief. Server-verified everywhere it
 * is read (see `src/app/agent/actions.ts`): the cookie is only ever a hint,
 * never trusted as proof of ownership.
 */
export const ACTIVE_AGENT_PROFILE_COOKIE = "proplink_active_agent_profile";

/**
 * Picks the profile the agent nav/wizard should default to: the cookie's
 * value if it names one of the user's own (active) profiles, else the first
 * profile (same alphabetical-by-agencyName order `listActiveAgentProfiles`
 * already returns). Pure — no cookies/DB here — so the resolution logic is
 * unit-testable without mocking Next's request-scoped APIs.
 */
export function resolveActiveAgentProfileId(
  profiles: { id: string }[],
  cookieValue: string | null | undefined,
): string | null {
  if (profiles.length === 0) return null;
  if (cookieValue && profiles.some((p) => p.id === cookieValue)) return cookieValue;
  return profiles[0].id;
}
