import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { updateCaseStudySchema } from "@/services/agents/validation";
import { deleteCaseStudy, updateCaseStudy } from "@/services/agents/agentProfileService";
import { AgentServiceError, agentErrorStatus } from "@/services/agents/errors";

// TODO(week-2): rate-limit with @upstash/ratelimit once H1.5 keys are in.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireRole(Role.AGENT);
  if (!authz.ok) return authz.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateCaseStudySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const caseStudy = await updateCaseStudy({
      userId: authz.session.user.id,
      caseStudyId: id,
      input: parsed.data,
    });
    return NextResponse.json(caseStudy, { status: 200 });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireRole(Role.AGENT);
  if (!authz.ok) return authz.response;

  const { id } = await params;

  try {
    await deleteCaseStudy({ userId: authz.session.user.id, caseStudyId: id });
    return NextResponse.json({ ok: true }, { status: 200 });
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
