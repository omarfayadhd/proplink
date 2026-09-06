import Link from "next/link";
import { buildSearchQueryString } from "@/services/search/queryString";
import type { SearchParams } from "@/services/search/types";

/**
 * Results pagination (Task 3.2). Real `<Link>`s rather than buttons: a page of
 * results is a distinct, shareable, crawlable URL — the whole point of keeping
 * search state in the query string — and links keep it working without JS.
 */
export function SearchPagination({
  params,
  page,
  totalPages,
  basePath = "/marketplace",
}: {
  params: SearchParams;
  page: number;
  totalPages: number;
  /** Where the page links point. `/buy` reuses this component (ADR-017). */
  basePath?: string;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const qs = buildSearchQueryString({ ...params, page: target });
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav
      aria-label="Search results pages"
      className="flex items-center justify-between gap-4 pt-2"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-secondary hover:border-accent"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}

      <p data-testid="page-indicator" className="text-sm text-muted">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-secondary hover:border-accent"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
