import { NextResponse } from "next/server";
import { registrationSchema, registerUser } from "@/services/users/registration";

// TODO(week-2): rate-limit with @upstash/ratelimit once H1.5 keys are in.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ userId: result.userId }, { status: 201 });
}
