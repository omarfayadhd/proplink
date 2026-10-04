# ADR-018 — Agent accounts are provisioned from the backend, not self-serve

**Status:** Accepted · **Date:** 2026-09-18 · **Sprint:** 3
**Builds on:** [ADR-016](ADR-016-role-portals.md)

## Context

`/register` offered a three-up role picker — Buyer, Investor, Agent — and
`SELF_SERVE_ROLES` accepted all three, so anyone could create an agent account
by filling in the public form.

Agents are the supply side of a **distressed property** marketplace: they list
stock with disclosed defects, and the whole trust proposition in
`docs/CONTEXT.md` rests on that record being verifiable. A self-serve agent
signup means an unvetted account can publish distressed listings on day one,
and the platform carries the consequence of whatever it discloses.

The product owner's instruction: agents will be added manually from the backend.

## Decision

**Agent is no longer a self-serve role.** It joins `ADMIN` in the
backend-provisioned category:

- The `/register` role picker offers **Buyer** and **Investor** only, in a
  two-up grid.
- `SELF_SERVE_ROLES` in `src/services/users/registration.ts` drops `Role.AGENT`,
  so `registrationSchema` rejects it and `POST /api/register` answers 400.

The server-side half is the load-bearing one. Removing the tile alone would be
a client-side restriction on a role boundary — precisely what constraint 5
("never trust the client for role") forbids — and a direct POST would still
mint an agent.

## Consequences

- Agent accounts are opened by an admin at `/admin/agents/new`, which emails
  the agent an invite to set their own password — see
  [ADR-019](ADR-019-admin-provisions-agents-by-invite.md). (Between ADR-018 and
  ADR-019 the only route was `prisma/seed.ts`, logged as a blocker.)
- `tests/unit/registration.test.ts` asserts `AGENT` and `ADMIN` are both
  rejected; `tests/e2e/week2-auth.spec.ts` exercises the registration flow for
  the two public roles only.
- Agent **login**, the agent portal and its RBAC are untouched — this changes
  how an agent account is born, not what it can do.
