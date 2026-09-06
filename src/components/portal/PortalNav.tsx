"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PortalNavItem } from "@/components/portal/PortalShell";

/**
 * The portal sub-nav, with the current page marked.
 *
 * A client component only because it needs `usePathname` — a layout cannot know
 * which of its children is rendering, and passing `current` down from every page
 * is a prop that would silently rot the first time someone adds a page and
 * forgets it.
 */
export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal" className="mt-10 flex gap-8 overflow-x-auto">
      {items.map((item) => {
        // Exact for the portal root, prefix for its sections — so
        // `/agent/listings/new` still marks `Listings`.
        const active =
          pathname === item.href ||
          (item.href.split("/").length > 2 && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 pb-4 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-accent text-white"
                : "border-transparent text-pale/60 hover:border-white/30 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
