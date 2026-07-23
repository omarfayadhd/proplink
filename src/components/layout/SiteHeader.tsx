import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { KycPill } from "@/components/layout/KycPill";

interface PortalLink {
  href: string;
  label: string;
  roles?: Role[]; // undefined = everyone
}

// The five portals (docs/CONTEXT.md). Role-gated ones only render for that role.
const PORTALS: PortalLink[] = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/investor", label: "Investor", roles: ["INVESTOR", "ADMIN"] },
  { href: "/agent", label: "Agent", roles: ["AGENT", "ADMIN"] },
  { href: "/intel", label: "Intelligence" },
  { href: "/ecosystem", label: "Ecosystem" },
];

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  const links = PORTALS.filter((p) => !p.roles || (user && p.roles.includes(user.role)));

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">
            PropLink<span className="text-accent"> UK</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-secondary md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-accent">
                {l.label}
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="text-intel hover:text-accent">
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <KycPill status={user.kycStatus} />
              <span className="hidden text-muted sm:inline">{user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-line px-3 py-1.5 font-medium text-secondary hover:border-accent"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-medium text-secondary hover:text-accent"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-secondary"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
