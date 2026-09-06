import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Role gates for the portal route groups. Uses the JWT cookie directly
// (edge-safe — no Prisma import here). Fine-grained checks stay server-side
// in services and pages via requireRole()/requireKyc()/`auth()`.
//
// **The three self-serve roles do not overlap** (ADR-016): a BUYER cannot reach
// /agent or /investor, and so on. ADMIN is deliberately in every gate — it is
// seed-only and governance-facing, and moderating a listing or reviewing a KYC
// case means seeing what the role concerned sees.
const GATES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/agent", roles: ["AGENT", "ADMIN"] },
  { prefix: "/investor", roles: ["INVESTOR", "ADMIN"] },
  { prefix: "/buy", roles: ["BUYER", "ADMIN"] },
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const gate = GATES.find(
    (g) => pathname === g.prefix || pathname.startsWith(`${g.prefix}/`),
  );
  if (!gate) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (!gate.roles.includes(String(token.role))) {
    return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/investor/:path*", "/buy/:path*"],
};
