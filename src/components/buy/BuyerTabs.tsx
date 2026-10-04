"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface BuyerTabItem {
  href: string;
  label: string;
  /** Rendered beside the label; omitted when zero, so empty tabs stay quiet. */
  count?: number;
  /** Renders the count as an alert — used for unread messages only. */
  alert?: boolean;
}

/**
 * The buyer portal's navigation (ADR-020).
 *
 * Light rather than inverted, because the buyer's chrome is a consumer
 * chrome — the dark portal band belongs to the agent, investor and admin tools.
 * `Search` is the home and is styled as such; the rest are the buyer's own
 * activity against it, each carrying how much is behind it.
 *
 * A client component only because it needs `usePathname` — a layout cannot know
 * which of its children is rendering, and passing `current` down from every page
 * is a prop that would silently rot the first time someone adds a page and
 * forgets it.
 */
export function BuyerTabs({ items }: { items: BuyerTabItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Your activity" className="flex gap-1 overflow-x-auto">
      {items.map((item) => {
        // Exact for the portal root, prefix for its sections.
        const active =
          pathname === item.href ||
          (item.href.split("/").length > 2 && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "bg-primary text-white"
                : "text-muted hover:bg-pale hover:text-primary",
            )}
          >
            {item.label}
            {item.count ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] font-bold",
                  item.alert
                    ? "bg-accent text-white"
                    : active
                      ? "bg-white/20 text-white"
                      : "bg-pale text-secondary",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
