# ADR-016 — Three role portals, strictly separate, with a role router

**Status:** Accepted · **Date:** 2026-09-04 · **Sprint:** 3
**Builds on:** [ADR-015](ADR-015-marketplace-masthead.md) (the shell), ADR-009 (the header)

## Context

Registration signed a user in and dropped them on the landing page. `/agent`
existed but redirected straight to `/agent/listings`, so the agent portal had no
front door; `/investor` and `/buy` did not exist at all, though the middleware
already gated `/investor`.

The product owner asked for three separate dashboards — buyer, investor, agent —
built to the features in `docs/CONTEXT.md` and the sprint plan, matching the new
design language, with **no overlap between the three self-serve roles**.

The whole data model already exists (Sprint 1): `SyndicateProject`,
`SyndicatePledge`, `KycRecord`, `SavedProperty`, `Enquiry`, `Viewing`, `Offer`,
`Deal`. So these are real dashboards over real data, not shells.

## Decision

**Read-side only.** Pledging, chat, viewing booking, offers and the deal tracker
are Sprint 4–5 work, and every one of them is gated on something not yet built:
the KYC service, `SYNDICATE_PAYMENTS_ENABLED` staying false, FCA counsel sign-off
(H4.3). Nothing here writes, so no dashboard can become a back door into a
regulated action. Put to the product owner explicitly and chosen.

**One shell, three portals.** `<PortalShell>` is `/marketplace`'s masthead
(ADR-015): a `primary` band running to the top of the viewport with the header
floating on it, the semibold/light heading pairing at tool scale, and a hairline
sub-nav. It lives in each portal's **layout**, carrying that portal's single
`<h1>`; pages contribute `<h2>`s. Putting it in a page _and_ a layout is how
`/agent` briefly had two `<h1>`s.

| Portal      | Home                                                                           | Data                                                    |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `/agent`    | live/draft/pending counts, new leads, latest leads, verified record            | `AgentProfile`, `Property`, `Enquiry`                   |
| `/investor` | EOI notice, KYC card, committed intent, pledges with equity % and funding bars | `SyndicatePledge`, `SyndicateProject`, `User.kycStatus` |
| `/buy`      | saved, enquiries, viewings, offers                                             | `SavedProperty`, `Enquiry`, `Viewing`, `Offer`          |

**Separation is enforced in four places, not one:**

1. `src/middleware.ts` gates `/buy` (BUYER) alongside `/agent` and `/investor`,
   on the JWT at the edge.
2. Each page re-checks with `auth()` before reading a user's own data — the
   middleware is a routing concern, not an authorisation one.
3. Every service query is scoped by `userId`/`agentProfileId` **in the `where`**,
   never filtered after the fact.
4. The header offers exactly one signed-in link: the portal that role owns. A
   role never sees another's navigation.

`ADMIN` is deliberately in every gate. It is seed-only and governance-facing, and
moderating a listing or reviewing a KYC case means seeing what the role
concerned sees. The three _self-serve_ roles do not overlap at all.

**`/portal` is a server-side role router.** Sign-in and registration are client
components; after `signIn(..., { redirect: false })` the cookie is set but the
client holds no role, and fetching one just to pick a URL is a round trip to
learn what the server already knows. Both now push to `/portal`, which reads the
session and forwards. `PORTAL_HOME` is the single map, shared with the header
link, so a role can never be sent somewhere its gate will bounce it from.

**Login honours `callbackUrl`.** The middleware sets it when bouncing an
unauthenticated request; it was previously ignored and everyone landed on `/`.
It is attacker-controllable, so **only a same-origin path is accepted** —
anything absolute or protocol-relative (`//evil.com`) falls back to `/portal`.

**The KYC pill is investor-only.** KYC gates syndicate pledges and nothing else
(CONTEXT §2); showing an agent a "KYC: not started" chip is noise about a gate
that will never apply to them, and it leaks one role's concerns into another's
chrome.

## Compliance

The investor dashboard states the EOI position **above** its figures, not in a
footnote: no funds are collected on-platform and no pledge is a payment or a
binding commitment (CONTEXT §1). `summarisePortfolio` calls its total
**committed intent**, never a balance. Money stays integer pence throughout, and
`equityPct` rounds only the quoted percentage — never the pence.

## Consequences

- `equityPct` clamps to 100. Over-pledging past a project's capital target is a
  data error; an investor must not be shown a 150% holding.
- `projectCount` counts **distinct** projects — an investor can top up the same
  syndicate twice, and that is one holding. The first version counted pledges and
  the test passed for the wrong reason until the fixture grew project identity.
- Every portal starts empty, so the empty state is the common case rather than an
  edge case, and each says what will fill it.
- `OVERLAY_PREFIXES` now sits beside `OVERLAY_ROUTES` in `<ChromeGate>`: portal
  routes match by prefix so `/agent/listings` inverts the header like `/agent`,
  while `/marketplace` must invert and `/marketplace/[id]` must not.
- The investor and buyer sub-navs list one item each. Linking to Sprint 4/5 pages
  that 404 would be worse than not listing them.
