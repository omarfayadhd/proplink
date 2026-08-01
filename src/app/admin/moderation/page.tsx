import { listPendingListings } from "@/services/listings/moderationService";
import { ModerationQueue } from "@/components/admin/ModerationQueue";

export const metadata = { title: "Admin — Moderation" };

export default async function ModerationPage() {
  const listings = await listPendingListings();

  return (
    <ModerationQueue
      listings={listings.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        addressLine1: l.addressLine1,
        city: l.city,
        region: l.region,
        postcode: l.postcode,
        propertyType: l.propertyType,
        bedrooms: l.bedrooms,
        askingPriceGBP: l.askingPriceGBP,
        targetRoiPct: l.targetRoiPct,
        epcRating: l.epcRating,
        epcCertUrl: l.epcCertUrl,
        floorPlanUrl: l.floorPlanUrl,
        distressTags: l.distressTags.map((t) => t.tag),
        images: l.images.map((img) => ({ url: img.url, sortOrder: img.sortOrder })),
        submittedAt: l.submittedAt ? l.submittedAt.toISOString() : null,
        createdAt: l.createdAt.toISOString(),
        agencyName: l.agentProfile.agencyName,
        agentEmail: l.agentProfile.user.email,
      }))}
    />
  );
}
