import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { saveDevUpload } from "@/services/storage/devUpload";

// Dev-only target for MockStorageService's presigned "POST" (Task 2.1 —
// STORAGE_PROVIDER=mock, the active path while H1.4/H2.1 AWS S3 + CORS are
// deferred, see docs/BLOCKERS.md). Mimics an S3 POST policy upload: the
// client posts the fields MockStorageService handed it, plus the file, here.

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authz = await requireRole(Role.AGENT, Role.ADMIN);
  if (!authz.ok) return authz.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const result = await saveDevUpload(form);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { key: result.key, publicUrl: result.publicUrl },
    { status: 201 },
  );
}
