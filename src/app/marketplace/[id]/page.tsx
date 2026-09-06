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
import { Card, CardBody, CardTitle } from "@/components/ui/card";
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

/**
 * Public property detail page (Task 2.5 brief) — SSR, `generateMetadata`
 * (title/description/OpenGraph/canonical). Visibility is enforced in
 * `getListingForPublicView` (LIVE/UNDER_OFFER/SOLD are public; a DRAFT/
 * PENDING_REVIEW listing is visible only to its owning agent or an admin
 * previewing it) — everyone else gets `null` here and the page 404s, never a
 * 403 (doesn't leak that the id exists).
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

  return (
    // `<main>`, not a plain `<div>`: this page is indexed, and the Lighthouse
    // a11y audit flags a missing main landmark (`landmark-one-main`).
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
      {!isPublic && (
        <p
          role="status"
          className="rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-medium text-warning"
        >
          Preview — this listing is {listing.status} and not yet publicly visible.
        </p>
      )}

      <PropertyGallery images={images} />

      {/* Counted server-side and deduped per session — see analytics.ts. */}
      {isPublic && <ViewTracker propertyId={listing.id} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{listing.title}</h1>
          <address className="mt-1 text-sm not-italic text-muted">
            {listing.addressLine1}, {listing.city}, {listing.region}, {listing.postcode}
          </address>
        </div>
        {canSave && <SaveButton propertyId={listing.id} initialSaved={alreadySaved} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <EpcBadge rating={listing.epcRating} />
        {tagLabels.map((label) => (
          <Badge key={label} tone="warning">
            {label}
          </Badge>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
            Asking price
          </dt>
          <dd
            data-testid="asking-price"
            className="mt-0.5 text-lg font-semibold text-primary"
          >
            {formatPenceGBP(listing.askingPriceGBP)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
            Bedrooms
          </dt>
          <dd className="mt-0.5 text-lg font-semibold text-primary">
            {listing.bedrooms}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
            Property type
          </dt>
          <dd className="mt-0.5 text-lg font-semibold text-primary">
            {listing.propertyType}
          </dd>
        </div>
        {listing.targetRoiPct != null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Target ROI
            </dt>
            <dd
              data-testid="target-roi"
              className="mt-0.5 text-lg font-semibold text-primary"
            >
              {listing.targetRoiPct}%
            </dd>
          </div>
        )}
      </dl>

      <section>
        <h2 className="text-lg font-bold text-primary">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-body">
          {listing.description}
        </p>
      </section>

      {coordinates && (
        <section>
          <h2 className="text-lg font-bold text-primary">Location</h2>
          <div className="mt-2">
            <PropertyMap
              mapImageUrl={staticMapService.getMapImageUrl(coordinates)}
              satelliteImageUrl={staticMapService.getSatelliteImageUrl(coordinates)}
              addressLabel={addressLabel}
            />
          </div>
        </section>
      )}

      {agentProfile && (
        <section aria-label="Listing agent">
          <Card>
            <CardTitle>
              <Link href={`/agents/${agentProfile.id}`} className="hover:underline">
                {agentProfile.agencyName}
              </Link>
            </CardTitle>
            <CardBody>
              {agentProfile.ratingCount > 0 ? (
                <p data-testid="agent-card-rating">
                  ★ {agentProfile.ratingAverage?.toFixed(1)}{" "}
                  <span className="text-muted">
                    ({agentProfile.ratingCount} review
                    {agentProfile.ratingCount === 1 ? "" : "s"})
                  </span>
                </p>
              ) : (
                <p className="text-muted">No reviews yet</p>
              )}
              <Link
                href={`/agents/${agentProfile.id}`}
                className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
              >
                View agency profile
              </Link>
            </CardBody>
          </Card>
        </section>
      )}

      {/* Buyer-only write actions (ADR-017). The server decides who sees these —
          a signed-in BUYER on a publicly visible listing — and each route
          re-authorises, so rendering the panel is never what permits the action. */}
      {isPublic && viewer?.role === "BUYER" && (
        <BuyerActions propertyId={listing.id} askingPriceGBP={listing.askingPriceGBP} />
      )}

      {isPublic && (
        <section aria-label="Contact the agent">
          <h2 className="text-lg font-bold text-primary">Interested in this property?</h2>
          <div className="mt-3">
            <EnquiryForm propertyId={listing.id} sessionUser={sessionUser} />
          </div>
        </section>
      )}

      {comparables ? (
        <PriceHistory data={comparables} />
      ) : (
        <section>
          <h2 className="text-lg font-bold text-primary">Price history</h2>
          <p className="mt-2 text-sm text-muted">
            No comparable sales recorded for this postcode district yet.
          </p>
        </section>
      )}
    </main>
  );
}
