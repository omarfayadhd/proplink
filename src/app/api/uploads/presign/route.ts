import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { presignRequestSchema } from "@/services/storage/validation";
import { storageService } from "@/services/storage";

// TODO(week-2): rate-limit with @upstash/ratelimit once H1.5 keys are in.
export async function POST(request: Request) {
  const authz = await requireRole(Role.AGENT, Role.ADMIN);
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const upload = await storageService.createPresignedUpload(parsed.data);
  return NextResponse.json(upload, { status: 200 });
}
