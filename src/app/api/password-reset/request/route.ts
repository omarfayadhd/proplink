import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/services/users/passwordReset";

const schema = z.object({ email: z.email() });

// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  await requestPasswordReset(parsed.data.email);
  // Always 202 — never reveal whether the account exists.
  return NextResponse.json({ ok: true }, { status: 202 });
}
