"use client";

import Link from "next/link";
import { useState } from "react";
import { DISTRESS_TAG_OPTIONS, formatPenceGBP } from "@/components/listings/wizardTypes";
import { Badge, EpcBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { SearchResultItem } from "@/services/search/types";

const TAG_LABELS = new Map(DISTRESS_TAG_OPTIONS.map((o) => [o.value, o.label]));

const TYPE_NOUN: Record<string, string> = {
  RESIDENTIAL: "home",
  COMMERCIAL: "commercial unit",
  LAND: "plot",
  MIXED_USE: "mixed-use property",
};

/**
 * One search result (Task 3.2, redesigned in ADR-020).
 *
 * The old card was a thumbnail with a headline and a "commute times coming in a
 * later week" note — a developer's card. This one is the consumer object the
 * rest of the market has trained buyers to expect: photo carousel, price first,
 * a plain-English summary of what the thing *is*, and a save heart that works
 * from the grid instead of only from the detail page.
 *
 * A client component, unavoidably: the carousel and the heart are both
 * interactive. It still server-renders, so the public marketplace stays
 * crawlable.
 *
 * Still at most three distress chips — a listing can carry all eight, and a
 * card that wraps to four rows of chips stops being scannable.
 */
export function PropertyCard({
  listing,
  variant = "grid",
  compact = false,
  saveable = false,
  initialSaved = false,
}: {
  listing: SearchResultItem;
  /** `list` is the wide row the buyer portal's list view uses. */
  variant?: "grid" | "list";
  /**
   * Drops the roadmap note. Set on the landing page, where a "coming in a later
   * week" line on a shop-window card reads as an unfinished product rather than
   * as the roadmap note it is on a results page.
   */
  compact?: boolean;
  /**
   * Renders the save heart. The server decides this — a signed-in
   * BUYER/INVESTOR — and `/api/listings/[id]/save` re-authorises, so hiding the
   * heart is presentation, never the security boundary.
   */
  saveable?: boolean;
  initialSaved?: boolean;
}) {
  const tags = listing.distressTags.slice(0, 3);
  const overflow = listing.distressTags.length - tags.length;

  // `imageUrls` is the carousel's source; `imageUrl` is kept as the fallback so
  // a card still shows a photo if only the single-image field is populated.
  const images =
    listing.imageUrls.length > 0
      ? listing.imageUrls
      : listing.imageUrl
        ? [listing.imageUrl]
        : [];

  const noun = TYPE_NOUN[listing.propertyType] ?? "property";
  const summary =
    listing.bedrooms > 0
      ? `${listing.bedrooms} bedroom ${noun}`
      : noun.charAt(0).toUpperCase() + noun.slice(1);

  const isList = variant === "list";

  return (
    <article
      data-testid="property-card"
      data-listing-id={listing.id}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(27,31,30,0.25)]",
        isList ? "flex flex-col sm:flex-row" : "flex flex-col",
      )}
    >
      <CardMedia
        images={images}
        alt={`${listing.title} — ${listing.city}`}
        // A fixed thumbnail in list mode, not a percentage: at 42% of a wide
        // container the photo dictated the row height and left the text column
        // mostly empty, which is the opposite of what a list view is for.
        className={cn(isList ? "sm:w-72 sm:shrink-0 sm:self-stretch" : "w-full")}
        aspect={isList ? "aspect-[4/3] sm:aspect-auto sm:h-full" : "aspect-[4/3]"}
        status={listing.status}
        saveable={saveable}
        initialSaved={initialSaved}
        propertyId={listing.id}
      />

      <div
        className={cn(
          "flex flex-1 flex-col gap-1.5 p-5",
          // A floor, so a row with a short title still gives the photo a
          // sensible height — the media stretches to the row, not the reverse.
          isList && "sm:min-h-52 sm:p-6",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            data-testid="card-price"
            className={cn(
              "font-semibold tracking-tight text-primary",
              isList ? "text-2xl" : "text-xl",
            )}
          >
            {formatPenceGBP(listing.askingPriceGBP)}
          </p>
        </div>

        <p className="text-sm font-medium text-body">{summary}</p>

        <p className="text-sm text-muted">
          {listing.city} · {listing.postcode}
        </p>

        {/* `h2`, not `h3`: each card sits directly under the page's single
            `h1`, and skipping a level fails Lighthouse's `heading-order` audit
            (and genuinely misleads anyone navigating by headings).

            The heading carries the only link, stretched over the whole card by
            `after:absolute` — so the card is one click target without nesting
            the carousel's buttons inside an anchor, which is invalid HTML and
            makes the arrows unusable with a keyboard. */}
        <h2
          className={cn(
            "font-semibold text-primary",
            isList ? "mt-1 text-base" : "line-clamp-2 text-sm",
          )}
        >
          <Link
            href={`/marketplace/${listing.id}`}
            className="after:absolute after:inset-0 after:content-[''] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {listing.title}
          </Link>
        </h2>

        {/* `mt-auto` pins the chips to the bottom of a *grid* card, which is
            what keeps a row of cards aligned despite different title lengths.
            A list row has no siblings to align with, so there it would just
            open a gap between the title and the chips. */}
        <div
          className={cn("flex flex-wrap items-center gap-1.5 pt-3", !isList && "mt-auto")}
        >
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

        {!compact && listing.publishedAt && (
          <p className="pt-1 text-xs text-muted">
            Listed {relativeDay(listing.publishedAt)}
          </p>
        )}
      </div>
    </article>
  );
}

/** "today" / "yesterday" / "3 days ago" / "on 4 Aug" — the portal convention. */
function relativeDay(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return `on ${then.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/**
 * The card's photo area: carousel, status ribbon and save heart.
 *
 * The arrows are `<button>`s that stop propagation rather than links, so they
 * work inside the card's stretched-link click target without navigating.
 */
function CardMedia({
  images,
  alt,
  className,
  aspect,
  status,
  saveable,
  initialSaved,
  propertyId,
}: {
  images: string[];
  alt: string;
  className?: string;
  aspect: string;
  status: string;
  saveable: boolean;
  initialSaved: boolean;
  propertyId: string;
}) {
  const [index, setIndex] = useState(0);

  function step(delta: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div className={cn("relative bg-surface", className)}>
      {images.length > 0 ? (
        // Mock-storage and agent-hosted URLs are not in any configured
        // next/image domain list — same convention as PropertyGallery and
        // ModerationQueue.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[index]}
          alt={
            images.length > 1 ? `${alt} — photo ${index + 1} of ${images.length}` : alt
          }
          className={cn("w-full bg-surface object-cover", aspect)}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "flex w-full items-center justify-center text-sm text-muted",
            aspect,
          )}
        >
          No photo yet
        </div>
      )}

      {status === "UNDER_OFFER" && (
        <span className="absolute top-3 left-3 z-10 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          Under offer
        </span>
      )}
      {status === "SOLD" && (
        <span className="absolute top-3 left-3 z-10 rounded-full bg-secondary/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          Sold
        </span>
      )}

      {saveable && (
        <SaveHeart
          propertyId={propertyId}
          initialSaved={initialSaved}
          className="absolute top-3 right-3 z-10"
        />
      )}

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => step(-1, e)}
            className="absolute top-1/2 left-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span aria-hidden>‹</span>
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => step(1, e)}
            className="absolute top-1/2 right-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span aria-hidden>›</span>
          </button>
          <span className="absolute bottom-3 left-3 z-10 rounded-full bg-primary/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Save straight from the results grid — previously only possible from the
 * detail page, which meant shortlisting six houses took twelve navigations.
 *
 * Optimistic, and idempotent server-side, so a double-click cannot desynchronise
 * the row from the heart.
 */
function SaveHeart({
  propertyId,
  initialSaved,
  className,
}: {
  propertyId: string;
  initialSaved: boolean;
  className?: string;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const res = await fetch(`/api/listings/${propertyId}/save`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setSaved(!next);
        toast("Could not update your saved listings", "danger");
        return;
      }
      toast(next ? "Saved to your list" : "Removed from your list", "success");
    } catch {
      setSaved(!next);
      toast("Could not update your saved listings", "danger");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this property"}
      data-testid="card-save-button"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm backdrop-blur transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        saved ? "text-accent" : "text-secondary",
        className,
      )}
    >
      <span aria-hidden>{saved ? "♥" : "♡"}</span>
    </button>
  );
}
