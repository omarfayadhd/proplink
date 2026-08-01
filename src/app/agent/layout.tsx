import Link from "next/link";

// Role gating happens in src/middleware.ts (AGENT/ADMIN) + per-action requireRole.
const TABS = [
  { href: "/agent/listings", label: "Listings" },
  { href: "/agent/leads", label: "Leads" },
  { href: "/agent/profile", label: "Profile" },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-bold text-primary">Agent portal</h1>
      <nav className="mt-4 flex gap-1 border-b border-line text-sm font-medium">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-t-md px-4 py-2 text-secondary hover:bg-pale hover:text-primary"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="py-6">{children}</div>
    </div>
  );
}
