import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { createAppraisalSchema } from "@/services/agents/validation";
import { createAppraisal } from "@/services/agents/agentProfileService";
import { AgentServiceError, agentErrorStatus } from "@/services/agents/errors";

// TODO(week-2): rate-limit with @upstash/ratelimit once H1.5 keys are in.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Brief: "may review" is investor/buyer only — `requireRole` gates the
  // role up front; `createAppraisal` re-checks qualification (prior
  // Enquiry/Deal) and the one-review-per-user-per-profile rule server-side.
  const authz = await requireRole(Role.INVESTOR, Role.BUYER);
  if (!authz.ok) return authz.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAppraisalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const appraisal = await createAppraisal({
      userId: authz.session.user.id,
      role: authz.session.user.role,
      agentProfileId: id,
      rating: parsed.data.rating,
      review: parsed.data.review,
    });
    return NextResponse.json(appraisal, { status: 201 });
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
