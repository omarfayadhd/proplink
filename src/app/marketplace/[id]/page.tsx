import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import {
  getListingCoordinates,
  getListingForPublicView,
  isPubliclyVisibleStatus,
} from "@/services/listings/listingService";
import { getAgentProfilePublic } from "@/services/agents/agentProfileService";
import { staticMapService } from "@/services/maps";
import { DISTRESS_TAG_OPTIONS, formatPenceGBP } from "@/components/listings/wizardTypes";
import { Badge, EpcBadge } from "@/components/ui/badge";
import {
  PropertyGallery,
  type GalleryImage,
} from "@/components/marketplace/PropertyGallery";
import { PropertyMap } from "@/components/marketplace/PropertyMap";
import { EnquiryForm } from "@/components/marketplace/EnquiryForm";
import { ViewTracker } from "@/components/marketplace/ViewTracker";
import { SaveButton } from "@/components/marketplace/SaveButton";
import { BuyerActions } from "@/components/buy/BuyerActions";
import { PriceHistory } from "@/components/buy/PriceHistory";
import { getComparables } from "@/services/intel/comparables";
import { postcodeDistrict } from "@/lib/postcode";
import { isListingSavedBy } from "@/services/listings/savedProperties";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getViewer(): Promise<{ userId: string; role: Role } | null> {
  const session = await auth();
  return session?.user ? { userId: session.user.id, role: session.user.role } : null;
}

function buildMetaDescription(listing: {
  propertyType: string;
  city: string;
  postcode: string;
  askingPriceGBP: number;
  description: string;
}): string {
  const price = formatPenceGBP(listing.askingPriceGBP);
  const excerpt =
    listing.description.length > 140
      ? `${listing.description.slice(0, 137)}...`
      : listing.description;
  return `${price} — ${listing.propertyType} in ${listing.city}, ${listing.postcode}. ${excerpt}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewer();
  const listing = await getListingForPublicView({ propertyId: id, viewer });
  if (!listing) return { title: "Listing not found" };

  const description = buildMetaDescription(listing);
  const canonicalPath = `/marketplace/${id}`;
  const firstImage = listing.images[0]?.url;

  return {
    title: listing.title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: listing.title,
      description,
      url: canonicalPath,
      type: "website",
      ...(firstImage ? { images: [{ url: firstImage }] } : {}),
    },
    // A preview (owner/admin viewing a non-public listing) must never be indexed.
    ...(isPubliclyVisibleStatus(listing.status)
      ? {}
      : { robots: { index: false, follow: false } }),
  };
}

/** One fact in the summary card: a small-caps label over its value. */
function Fact({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
        {label}
      </dt>
      <dd data-testid={testId} className="mt-0.5 text-base font-semibold text-primary">
        {value}
      </dd>
    </div>
  );
}

/**
 * Public property detail page (Task 2.5 brief, redesigned in ADR-020) — SSR,
 * `generateMetadata` (title/description/OpenGraph/canonical). Visibility is
 * enforced in `getListingForPublicView` (LIVE/UNDER_OFFER/SOLD are public; a
 * DRAFT/PENDING_REVIEW listing is visible only to its owning agent or an admin
 * previewing it) — everyone else gets `null` here and the page 404s, never a
 * 403 (doesn't leak that the id exists).
 *
 * **The layout is a two-column consumer listing.** It was a single 4xl column
 * in which price, save, viewing, offer, message and enquiry were six separate
 * blocks stacked down the page, so deciding to *do* something meant scrolling
 * past the description to find out which of them did it. Everything actionable
 * now lives in one sticky card beside the content — and on a phone, behind a
 * fixed bar pinned to the bottom of the viewport, where a thumb already is.
 */
export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const viewer = session?.user
    ? { userId: session.user.id, role: session.user.role }
    : null;

  const listing = await getListingForPublicView({ propertyId: id, viewer });
  if (!listing) notFound();

  const [coordinates, agentProfile] = await Promise.all([
    getListingCoordinates(id),
    getAgentProfilePublic(listing.agentProfileId),
  ]);

  const images: GalleryImage[] = listing.images.map((img, i) => ({
    url: img.url,
    alt: `${listing.title} — photo ${i + 1} of ${listing.images.length}`,
  }));

  const addressLabel = `${listing.addressLine1}, ${listing.city}`;
  const tagLabels = listing.distressTags.map(
    (t) => DISTRESS_TAG_OPTIONS.find((o) => o.value === t.tag)?.label ?? t.tag,
  );

  const sessionUser = session?.user
    ? {
        name: session.user.name ?? session.user.email ?? "You",
        email: session.user.email ?? "",
      }
    : null;

  const isPublic = isPubliclyVisibleStatus(listing.status);

  // Task 2.6: saving is a demand-side signal, so only BUYER/INVESTOR see the
  // toggle — the route enforces the same rule, this just avoids offering an
  // action that would 403.
  const canSave = isPublic && (viewer?.role === "BUYER" || viewer?.role === "INVESTOR");

  // Land Registry comparables for this listing's postcode district. Null until
  // the district has any — the ingest is H5.4 and the seeded rows are samples.
  const comparables = await getComparables(postcodeDistrict(listing.postcode));
  const alreadySaved = canSave
    ? await isListingSavedBy({ userId: viewer.userId, propertyId: listing.id })
    : false;

  const isBuyer = isPublic && viewer?.role === "BUYER";

  return (
    // `<main>`, not a plain `<div>`: this page is indexed, and the Lighthouse
    // a11y audit flags a missing main landmark (`landmark-one-main`).
    // `pb-28` on small screens clears the fixed action bar, which would
    // otherwise cover the last section of the page.
    <main className="mx-auto w-full max-w-6xl px-6 py-8 pb-28 lg:pb-12">
      {!isPublic && (
        <p
          role="status"
          className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-medium text-warning"
        >
          Preview — this listing is {listing.status} and not yet publicly visible.
        </p>
      )}

      {/* Back to the search the viewer actually came from: a buyer's search is
          `/buy`, and sending them to the public catalogue would drop their
          portal context and their filters. */}
      <Link
        href={viewer?.role === "BUYER" ? "/buy" : "/marketplace"}
        className="text-sm font-medium text-muted underline decoration-line underline-offset-4 hover:text-primary"
      >
        ← Back to search
      </Link>

      <div className="mt-4">
        <PropertyGallery images={images} />
      </div>

      {/* Counted server-side and deduped per session — see analytics.ts. */}
      {isPublic && <ViewTracker propertyId={listing.id} />}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_22rem]">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-10">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              {listing.title}
            </h1>
            <address className="mt-2 text-sm not-italic text-muted">
              {listing.addressLine1}, {listing.city}, {listing.region}, {listing.postcode}
            </address>
          </header>

          <section aria-labelledby="know-heading">
            <h2 id="know-heading" className="text-lg font-semibold text-primary">
              What you should know
            </h2>
            <p className="mt-1 text-sm text-muted">
              Every listing here is distressed in some way. These are the disclosed issues
              — they are why the price is what it is.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* EPC on every listing — legally required in the UK (AGENTS.md). */}
              <EpcBadge rating={listing.epcRating} />
              {tagLabels.length > 0 ? (
                tagLabels.map((label) => (
                  <Badge key={label} tone="warning">
                    {label}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted">
                  No specific defects disclosed by the agent.
                </span>
              )}
            </div>
          </section>

          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="text-lg font-semibold text-primary">
              About this property
            </h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-body">
              {listing.description}
            </p>
          </section>

          {coordinates && (
            <section aria-labelledby="location-heading">
              <h2 id="location-heading" className="text-lg font-semibold text-primary">
                Location
              </h2>
              <div className="mt-3">
                <PropertyMap
                  mapImageUrl={staticMapService.getMapImageUrl(coordinates)}
                  satelliteImageUrl={staticMapService.getSatelliteImageUrl(coordinates)}
                  addressLabel={addressLabel}
                />
              </div>
            </section>
          )}

          {comparables ? (
            <PriceHistory data={comparables} />
          ) : (
            <section>
              <h2 className="text-lg font-semibold text-primary">Price history</h2>
              <p className="mt-2 text-sm text-muted">
                No comparable sales recorded for this postcode district yet.
              </p>
            </section>
          )}

          {isPublic && (
            <section aria-label="Contact the agent" id="enquire">
              {/* Not a duplicate of the action card's "Message agent" tab,
                  though it looks like one: that opens a chat thread, this
                  creates an `Enquiry` row with the buyer's contact details,
                  which is what reaches the agent's leads table. The headings
                  say which is which, because two identical-looking "contact the
                  agent" boxes on one page is how a buyer ends up using
                  neither. */}
              <h2 className="text-lg font-semibold text-primary">
                Request the full details
              </h2>
              <p className="mt-1 text-sm text-muted">
                Sends the agent a formal enquiry with your contact details, so they can
                come back to you with the survey, the schedule of works and anything else
                on file.
              </p>
              <div className="mt-3">
                <EnquiryForm propertyId={listing.id} sessionUser={sessionUser} />
              </div>
            </section>
          )}
        </div>

        {/* ── Action column ───────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_8px_30px_-16px_rgba(27,31,30,0.3)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                    Asking price
                  </p>
                  <p
                    data-testid="asking-price"
                    className="mt-1 text-3xl font-semibold tracking-tight text-primary"
                  >
                    {formatPenceGBP(listing.askingPriceGBP)}
                  </p>
                </div>
                {listing.status === "UNDER_OFFER" && (
                  <Badge tone="intel">Under offer</Badge>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
                <Fact label="Bedrooms" value={String(listing.bedrooms)} />
                <Fact
                  label="Type"
                  value={
                    listing.propertyType.charAt(0) +
                    listing.propertyType.slice(1).toLowerCase().replace("_", " ")
                  }
                />
                {listing.targetRoiPct != null && (
                  <Fact
                    label="Target ROI"
                    value={`${listing.targetRoiPct}%`}
                    testId="target-roi"
                  />
                )}
                <Fact label="EPC" value={listing.epcRating ?? "Pending"} />
              </dl>

              {canSave && (
                <div className="mt-5 border-t border-line pt-5">
                  <SaveButton propertyId={listing.id} initialSaved={alreadySaved} />
                </div>
              )}
            </div>

            {/* Buyer-only write actions (ADR-017). The server decides who sees
                these — a signed-in BUYER on a publicly visible listing — and
                each route re-authorises, so rendering the panel is never what
                permits the action. */}
            {isBuyer && (
              <div id="take-it-further">
                <BuyerActions
                  propertyId={listing.id}
                  askingPriceGBP={listing.askingPriceGBP}
                />
              </div>
            )}

            {agentProfile && (
              // A labelled landmark, not a bare div: assistive tech navigates
              // this page by region, and "who is selling this" is one of the
              // regions worth jumping to.
              <section
                aria-label="Listing agent"
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <p className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Marketed by
                </p>
                <Link
                  href={`/agents/${agentProfile.id}`}
                  className="mt-1 block text-base font-semibold text-primary hover:underline"
                >
                  {agentProfile.agencyName}
                </Link>
                {agentProfile.ratingCount > 0 ? (
                  <p data-testid="agent-card-rating" className="mt-1 text-sm text-body">
                    ★ {agentProfile.ratingAverage?.toFixed(1)}{" "}
                    <span className="text-muted">
                      ({agentProfile.ratingCount} review
                      {agentProfile.ratingCount === 1 ? "" : "s"})
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted">No reviews yet</p>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Mobile action bar. An anchor rather than a duplicated form: two copies
          of the same controls is two things to keep in step, and one of them
          would eventually stop matching the other. */}
      {isPublic && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-white/95 px-5 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-lg font-semibold tracking-tight text-primary">
              {formatPenceGBP(listing.askingPriceGBP)}
            </p>
            <p className="text-xs text-muted">
              {listing.bedrooms > 0 ? `${listing.bedrooms} bed · ` : ""}
              {listing.city}
            </p>
          </div>
          <a
            href={isBuyer ? "#take-it-further" : "#enquire"}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent"
          >
            {isBuyer ? "Take it further" : "Enquire"}
          </a>
        </div>
      )}
    </main>
  );
}
