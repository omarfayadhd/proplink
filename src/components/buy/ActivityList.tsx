import Link from "next/link";

/**
 * One list shape for every strand of buyer activity — enquiries, viewings,
 * offers (ADR-017). They differ only in what goes in `meta` and `status`, and
 * four bespoke lists would drift apart the first time one gained a column.
 */

export interface ActivityItem {
  id: string;
  href: string;
  title: string;
  /** A date, or a pre-formatted string like a price. */
  meta: Date | string;
  status: string;
  /** Optional second line — e.g. an offer against its asking price. */
  detail?: string;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="border-t border-line">
      {items.map((item) => (
        <li key={item.id} className="border-b border-line py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <Link
              href={item.href}
              className="font-medium text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
            >
              {item.title}
            </Link>
            <span className="flex items-baseline gap-4 text-xs text-muted">
              <span>
                {item.meta instanceof Date ? DATE.format(item.meta) : item.meta}
              </span>
              <span className="tracking-[0.12em] uppercase">{item.status}</span>
            </span>
          </div>
          {item.detail ? <p className="mt-1 text-sm text-muted">{item.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}
