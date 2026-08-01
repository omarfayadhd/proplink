import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { createCaseStudySchema } from "@/services/agents/validation";
import { createCaseStudy } from "@/services/agents/agentProfileService";
import { AgentServiceError, agentErrorStatus } from "@/services/agents/errors";

// TODO(week-2): rate-limit with @upstash/ratelimit once H1.5 keys are in.
export async function POST(request: Request) {
  const authz = await requireRole(Role.AGENT);
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCaseStudySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const caseStudy = await createCaseStudy({
      userId: authz.session.user.id,
      input: parsed.data,
    });
    return NextResponse.json(caseStudy, { status: 201 });
  } catch (err) {
    if (err instanceof AgentServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: agentErrorStatus(err.code) },
      );
    }
    throw err;
  }
}
