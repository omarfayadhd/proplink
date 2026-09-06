/**
 * Canonical absolute origin for this deployment — same fallback convention as
 * `src/services/email/mailer.ts`'s `BASE_URL` (not imported from there: that
 * module is server-only via its Resend/console mailer wiring, and this is
 * needed from `generateMetadata`/`layout.tsx`, which don't otherwise pull in
 * mailer code). Used for OpenGraph `og:url`, canonical links, and the root
 * layout's `metadataBase` (Task 2.5).
 */
export const SITE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
