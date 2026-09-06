import Link from "next/link";
import { DISTRESS_TAG_OPTIONS, formatPenceGBP } from "@/components/listings/wizardTypes";
import { Badge, EpcBadge } from "@/components/ui/badge";
import type { SearchResultItem } from "@/services/search/types";

const TAG_LABELS = new Map(DISTRESS_TAG_OPTIONS.map((o) => [o.value, o.label]));

/**
 * One search result (Task 3.2). Server component — nothing here is
 * interactive, so it costs no client JS; the save toggle lives on the detail
 * page where the viewer's role is already resolved.
 *
 * Deliberately shows at most three distress chips: a listing can carry all
 * eight, and a card that wraps to four rows of chips stops being scannable.
 */
export function PropertyCard({
  listing,
  compact = false,
}: {
  listing: SearchResultItem;
  /**
   * Drops the not-yet-built commute-time note. Set on the landing page, where
   * a "coming in a later week" line on a shop-window card reads as an
   * unfinished product rather than as the roadmap note it is on a results page.
   */
  compact?: boolean;
}) {
  const tags = listing.distressTags.slice(0, 3);
  const overflow = listing.distressTags.length - tags.length;

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      data-testid="property-card"
      data-listing-id={listing.id}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {listing.imageUrl ? (
        // Mock-storage and agent-hosted URLs are not in any configured
        // next/image domain list — same convention as PropertyGallery and
        // ModerationQueue.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.imageUrl}
          alt={`${listing.title} — ${listing.city}`}
          className="aspect-[4/3] w-full bg-surface object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface text-sm text-muted">
          No photo yet
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p data-testid="card-price" className="text-lg font-bold text-primary">
            {formatPenceGBP(listing.askingPriceGBP)}
          </p>
          {listing.status === "UNDER_OFFER" && <Badge tone="intel">Under offer</Badge>}
        </div>

        {/* `h2`, not `h3`: each card sits directly under the page's single
            `h1`, and skipping a level fails Lighthouse's `heading-order` audit
            (and genuinely misleads anyone navigating by headings). */}
        <h2 className="line-clamp-2 text-sm font-semibold text-body group-hover:underline">
          {listing.title}
        </h2>

        <p className="text-xs text-muted">
          {listing.city} · {listing.postcode}
          {listing.bedrooms > 0 && ` · ${listing.bedrooms} bed`}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {/* EPC on every listing — legally required in the UK (AGENTS.md). */}
          <EpcBadge rating={listing.epcRating} />
          {listing.targetRoiPct != null && (
            <Badge tone="success">{listing.targetRoiPct}% ROI</Badge>
          )}
          {tags.map((tag) => (
            <Badge key={tag} tone="warning">
              {TAG_LABELS.get(tag) ?? tag}
            </Badge>
          ))}
          {overflow > 0 && <span className="text-xs text-muted">+{overflow} more</span>}
        </div>

        {/* Commute time lands in Task 3.4 (blocked on H3.1). */}
        {!compact && (
          <p className="text-xs text-muted">Commute times coming in a later week.</p>
        )}
      </div>
    </Link>
  );
}
