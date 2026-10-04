# ADR-019 — Admins provision agents; the agent sets their own password by invite

**Status:** Accepted · **Date:** 2026-09-18 · **Sprint:** 3
**Builds on:** [ADR-018](ADR-018-agent-accounts-are-backend-provisioned.md)

## Context

ADR-018 closed self-serve agent signup but left no way to open an agent
account: `prisma/seed.ts` was the only route, which is not something a product
owner can use. The gap was logged in `docs/BLOCKERS.md` the same day.

Two shapes were considered. An admin-set temporary password is fewer moving
parts, but it puts the admin in possession of an agent's credential, with no
forced rotation and a password travelling over whatever channel the admin
happens to use. An emailed invite keeps the credential between the agent and
their own inbox.

## Decision

**`/admin/agents/new` creates the account and its agency in one transaction,
and never handles a password.**

- `src/services/admin/agents.ts` — `createAgent()` is now the only code path
  that mints `Role.AGENT`. It creates the `User` with `passwordHash: null`
  (unusable for credentials sign-in) plus its `AgentProfile`, in a single
  `$transaction`: an `AGENT` with no profile has no agency to list under, so a
  half-created agent is not a state worth persisting.
- Duplicate email and duplicate `complianceCode` are both checked before the
  write and answer 409 with distinct messages. `complianceCode` is otherwise
  **format-free** — UK redress-scheme references vary, and a guessed regex
  would reject valid ones. Uniqueness is the real constraint.
- Every creation writes an `AGENT_CREATED` audit row naming the acting admin.

**The invite reuses the password-reset machinery rather than a parallel one.**
`createToken(userId, "AGENT_INVITE")` issues a single-use token; the emailed
link lands on `/reset-password?token=…&invite=1`, whose copy switches to a
welcome. `resetPassword()` gained a `purpose` argument, so an invite token and
a reset token are **not** interchangeable — spending one as the other fails.
That function already stamps `emailVerified` on success, which is right here
too: a working link proves the mailbox either way.

**`AGENT_INVITE` needs no migration.** `VerificationToken.purpose` is a plain
`String` column, so the third purpose is code-only — constraint 8 (additive
migrations after Week 4) holds. Its TTL is 7 days, against 1 hour for a reset:
an invite waits in an inbox, unlike a reset the user asked for seconds ago.

**The invite mail is awaited**, unlike `registerUser`'s fire-and-forget
verification email. An admin needs to know whether the invite actually went
out, and the on-screen fallback link is only meaningful if it did.

## Consequences

- While the console-only mock mailer is active (H1.7 unsupplied), the screen
  echoes the invite link so the flow is usable locally. It keys off
  `mailerIsConsoleOnly()` — the same condition the mailer itself uses, not
  `NODE_ENV` — so a real Resend key stops it appearing. It would be a
  credential-leak surface otherwise.
- RBAC is doubled up as usual: `src/middleware.ts` already gates `/admin/*`
  (a **rewrite**, so the URL is unchanged and the status carries the refusal),
  and the server action calls `requireRole("ADMIN")` independently.
- Deactivating an agent still goes through the existing `setUserActive` on the
  Users tab. There is no edit-agent screen; agency details are changed by the
  agent from `/agent/profile`.
- Covered by `tests/unit/admin-agents.test.ts` (12),
  `tests/unit/agent-invite-password.test.ts` (4) and
  `tests/e2e/admin-add-agent.spec.ts` (5, including the full
  create → invite → set password → agent portal walk).
