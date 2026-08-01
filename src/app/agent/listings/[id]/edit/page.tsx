import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOwnedListing } from "@/services/listings/listingService";
import { ListingServiceError } from "@/services/listings/errors";
import { ListingWizard } from "@/components/listings/ListingWizard";
import {
  penceToPoundsInput,
  type WizardFormState,
} from "@/components/listings/wizardTypes";

export const metadata = { title: "Agent — Edit listing" };

type OwnedListing = Awaited<ReturnType<typeof getOwnedListing>>;

function toWizardState(listing: OwnedListing): WizardFormState {
  return {
    id: listing.id,
    agentProfileId: listing.agentProfileId,
    title: listing.title,
    description: listing.description,
    addressLine1: listing.addressLine1,
    city: listing.city,
    region: listing.region,
    postcode: listing.postcode,
    propertyType: listing.propertyType,
    bedrooms: listing.bedrooms,
    askingPricePounds: penceToPoundsInput(listing.askingPriceGBP),
    targetRoiPct: listing.targetRoiPct == null ? "" : String(listing.targetRoiPct),
    distressTags: listing.distressTags.map((t) => t.tag),
    pricingSafeguardAck: listing.pricingSafeguardAckAt != null,
    epcRating: listing.epcRating ?? "",
    epcCertUrl: listing.epcCertUrl,
    floorPlanUrl: listing.floorPlanUrl,
    images: listing.images.map((img) => ({ url: img.url, sortOrder: img.sortOrder })),
  };
}

function NoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-6 text-sm text-body">
      <p className="font-semibold text-primary">{title}</p>
      <p className="mt-1 text-muted">{body}</p>
      <Link href="/agent/listings" className="mt-3 inline-block text-accent underline">
        Back to your listings
      </Link>
    </div>
  );
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return (
      <NoticeCard
        title="Sign in required"
        body="Please log in as an agent to continue."
      />
    );
  }

  let listing: OwnedListing;
  try {
    listing = await getOwnedListing({ userId: session.user.id, propertyId: id });
  } catch (err) {
    const message =
      err instanceof ListingServiceError
        ? err.message
        : "Something went wrong loading this listing.";
    return <NoticeCard title="Can't open this listing" body={message} />;
  }

  if (listing.status !== "DRAFT") {
    return (
      <NoticeCard
        title="This listing is no longer editable here"
        body={`"${listing.title}" is ${listing.status.replace("_", " ").toLowerCase()}. Only draft listings can be edited from this form.`}
      />
    );
  }

  return (
    <ListingWizard
      agentProfiles={[
        { id: listing.agentProfile.id, agencyName: listing.agentProfile.agencyName },
      ]}
      initial={toWizardState(listing)}
    />
  );
}
