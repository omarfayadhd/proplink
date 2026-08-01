import { redirect } from "next/navigation";

// Middleware-gated, always per-request — never statically prerendered.
export const dynamic = "force-dynamic";

export default function AgentHomePage() {
  redirect("/agent/listings");
}
