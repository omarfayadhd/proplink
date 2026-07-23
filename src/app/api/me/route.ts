import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { eraseUser } from "@/services/users/erasure";

/**
 * GDPR right-to-erasure. Anonymises the calling user's account;
 * KYC records are retained (UK AML, 5 years) linked to the anonymised shell.
 * The client must sign out after calling this.
 */
export async function DELETE() {
  const authz = await requireRole(); // any authenticated user
  if (!authz.ok) return authz.response;

  const result = await eraseUser(authz.session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
