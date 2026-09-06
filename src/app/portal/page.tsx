import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/portalHome";

export const dynamic = "force-dynamic";

/**
 * Role router (ADR-016). Reads the session on the server and forwards to the
 * portal that role owns.
 *
 * It exists so the sign-in and registration screens never need to know the role
 * map. Both are client components; after `signIn(..., { redirect: false })` the
 * session cookie is set but the client has no role in hand, and fetching one
 * just to pick a URL is a round trip to learn something the server already knows.
 */
export default async function PortalRouterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(PORTAL_HOME[session.user.role]);
}
