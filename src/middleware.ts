import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Role gates for the portal route groups. Uses the JWT cookie directly
// (edge-safe — no Prisma import here). Fine-grained checks stay server-side
// in services via requireRole()/requireKyc().
const GATES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/agent", roles: ["AGENT", "ADMIN"] },
  { prefix: "/investor", roles: ["INVESTOR", "ADMIN"] },
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
  matcher: ["/admin/:path*", "/agent/:path*", "/investor/:path*"],
};
