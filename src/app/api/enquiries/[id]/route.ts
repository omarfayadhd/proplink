import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { updateEnquiryStatusSchema } from "@/services/enquiries/validation";
import { updateEnquiryStatus } from "@/services/enquiries/enquiryService";
import { EnquiryServiceError, enquiryErrorStatus } from "@/services/enquiries/errors";

// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist.
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

  const parsed = updateEnquiryStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const enquiry = await updateEnquiryStatus({
      enquiryId: id,
      agentUserId: authz.session.user.id,
      status: parsed.data.status,
    });
    return NextResponse.json(enquiry, { status: 200 });
  } catch (err) {
    if (err instanceof EnquiryServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: enquiryErrorStatus(err.code) },
      );
    }
    throw err;
  }
}
