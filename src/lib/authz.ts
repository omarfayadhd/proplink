import "server-only";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/enums";

export type AuthzResult =
  { ok: true; session: Session } | { ok: false; response: NextResponse };

/**
 * Server-side role gate for route handlers and server actions.
 * NEVER trust client-provided role — this reads the JWT session only.
 */
export async function requireRole(...roles: Role[]): Promise<AuthzResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  if (roles.length > 0 && !roles.includes(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

/**
 * KYC gate — the compliance-critical check for every pledge mutation
 * (sprint plan non-negotiable #2). Server-side only.
 */
export async function requireKyc(): Promise<AuthzResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  if (session.user.kycStatus !== "APPROVED") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "KYC required", kycStatus: session.user.kycStatus },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session };
}
