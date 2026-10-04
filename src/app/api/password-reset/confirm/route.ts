import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/services/users/passwordReset";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
  // An admin-invited agent sets their first password through this same
  // endpoint (ADR-019); the purpose decides which token pool is consumed.
  purpose: z.enum(["PASSWORD_RESET", "AGENT_INVITE"]).default("PASSWORD_RESET"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }

  const result = await resetPassword(
    parsed.data.token,
    parsed.data.password,
    parsed.data.purpose,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
