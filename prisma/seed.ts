import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  EnquiryStatus,
  PropertyStatus,
  Role,
  SubscriptionTier,
} from "../src/generated/prisma/enums";
import { SEED_LISTINGS, SEED_LISTING_COUNT } from "./seedListings";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
});
const db = new PrismaClient({ adapter });

/**
 * Local placeholder plates (`public/uploads/seed/`) rather than
 * `picsum.photos`. The brief allowed either; local wins because the detail page
 * has to render with no network — the dev environment has no guaranteed
 * outbound access, the E2E suite runs offline, and a remote 404 shows up as a
 * Lighthouse best-practices failure. Six plates cycled across every listing.
 *
 * They are photographs (`.jpg`), not the original line-art SVGs. Those carried
 * a baked-in "PropLink UK — seed placeholder" caption, which surfaced verbatim
 * on the landing page's showcase cards and on every marketplace card and
 * gallery. Provenance and licences: `public/uploads/seed/LICENSES.md`.
 *
 * Changing this extension changes stored `PropertyImage.url` values, so it
 * needs a re-seed (`npm run db:seed`) to take effect.
 */
const PLATE_COUNT = 6;
const plateUrl = (n: number) =>
  `/uploads/seed/plate-${String((n % PLATE_COUNT) + 1).padStart(2, "0")}.jpg`;

async function seedUsers(passwordHash: string) {
  const users = [
    { email: "admin@proplink.test", name: "Platform Admin", role: Role.ADMIN },
    { email: "agent@proplink.test", name: "Alice Agent", role: Role.AGENT },
    { email: "investor@proplink.test", name: "Ivan Investor", role: Role.INVESTOR },
    { email: "buyer@proplink.test", name: "Bella Buyer", role: Role.BUYER },
    // Task 2.7: four more demand-side accounts so the five seeded appraisals
    // come from five distinct people. `Appraisal` is unique per
    // (agentProfileId, investorUserId), so reusing two users would force
    // several reviews onto the same profile pages.
    { email: "investor2@proplink.test", name: "Priya Raman", role: Role.INVESTOR },
    { email: "investor3@proplink.test", name: "Tom Okafor", role: Role.INVESTOR },
    { email: "buyer2@proplink.test", name: "Grace Whitfield", role: Role.BUYER },
    { email: "buyer3@proplink.test", name: "Daniel Mercer", role: Role.BUYER },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        passwordHash,
        emailVerified: new Date(),
        gdprConsentAt: new Date(),
      },
    });
  }

  return users.length;
}

async function seedAgentProfiles(agentUserId: string) {
  const profiles = [
    { agencyName: "Northgate Distressed Assets", complianceCode: "PL-AG-0001" },
    { agencyName: "Mercia Probate Properties", complianceCode: "PL-AG-0002" },
    { agencyName: "Thames Valley Renovations", complianceCode: "PL-AG-0003" },
  ];

  for (const p of profiles) {
    await db.agentProfile.upsert({
      where: { complianceCode: p.complianceCode },
      update: {},
      create: {
        ...p,
        userId: agentUserId,
        bio: `${p.agencyName} — distressed stock specialists.`,
      },
    });
  }

  // Ordered by complianceCode, not by `agencyName` — the demo catalogue's
  // `profileIndex` refers to PL-AG-0001/2/3, and alphabetical order would
  // silently reassign every listing to a different agency.
  return db.agentProfile.findMany({ orderBy: { complianceCode: "asc" } });
}

/**
 * Without this the seeded catalogue is unapprovable: `transitionStatus`
 * re-asserts `assertWithinListingLimit` on every move to LIVE, the free-tier
 * default is 3, and all three seeded profiles belong to one agent user — so
 * with 30 LIVE demo listings the moderation queue could never approve a 31st.
 * An agency carrying this much stock would be on a paid plan in reality, so the
 * seed says so rather than special-casing the limit.
 */
async function seedAgentSubscription(agentUserId: string) {
  await db.subscription.upsert({
    where: { agentUserId },
    update: { tier: SubscriptionTier.ELITE, status: "active", listingLimit: 100 },
    create: {
      agentUserId,
      tier: SubscriptionTier.ELITE,
      status: "active",
      listingLimit: 100,
    },
  });
}

async function seedListings(profileIds: string[]) {
  for (const [listingIndex, listing] of SEED_LISTINGS.entries()) {
    const agentProfileId = profileIds[listing.profileIndex];
    const isPublished =
      listing.status !== PropertyStatus.DRAFT &&
      listing.status !== PropertyStatus.PENDING_REVIEW;

    const data = {
      agentProfileId,
      title: listing.title,
      description: listing.description,
      status: listing.status,
      addressLine1: listing.addressLine1,
      city: listing.city,
      region: listing.region,
      postcode: listing.postcode,
      propertyType: listing.propertyType,
      bedrooms: listing.bedrooms,
      askingPriceGBP: listing.askingPriceGBP,
      targetRoiPct: listing.targetRoiPct,
      epcRating: listing.epcRating,
      pricingSafeguardAckAt: new Date(),
      viewCount: listing.viewCount,
      submittedAt: new Date(),
      publishedAt: isPublished ? new Date() : null,
    };

    await db.property.upsert({
      where: { id: listing.id },
      update: data,
      create: { id: listing.id, ...data },
    });

    // Tags and images are child collections with no natural "update" —
    // replace them wholesale, scoped to this seeded listing only. Same
    // delete-then-recreate approach `ListingService.updateDraft` uses.
    await db.propertyDistressTag.deleteMany({ where: { propertyId: listing.id } });
    await db.propertyDistressTag.createMany({
      data: listing.tags.map((tag) => ({ propertyId: listing.id, tag })),
    });

    await db.propertyImage.deleteMany({ where: { propertyId: listing.id } });
    await db.propertyImage.createMany({
      // Offset by listing index, not just by image index. `plateUrl(n)` alone
      // gave every listing the same cover — `sortOrder: 0` is always plate-01 —
      // so a showcase row was the same photograph three times over. Offsetting
      // means any run of six adjacent listings leads with six different plates.
      data: Array.from({ length: listing.imageCount }, (_, n) => ({
        id: `${listing.id}-img-${n + 1}`,
        propertyId: listing.id,
        url: plateUrl(listingIndex + n),
        sortOrder: n,
      })),
    });

    // PostGIS point, written exactly as `ListingService.setPropertyLocation`
    // does. Hardcoded coordinates — a seed never calls a live geocoder.
    await db.$executeRaw`
      UPDATE "Property"
      SET "location" = ST_SetSRID(ST_MakePoint(${listing.lng}, ${listing.lat}), 4326)
      WHERE "id" = ${listing.id}
    `;
    // `searchVector` is left to the Sprint 1 trigger, which fires on both of
    // the writes above.
  }
}

/** Listings an enquiry/appraisal can plausibly attach to, per agency profile. */
function publicListingsFor(profileIndex: number) {
  return SEED_LISTINGS.filter(
    (l) => l.profileIndex === profileIndex && l.status === PropertyStatus.LIVE,
  );
}

async function seedCaseStudies(profileIds: string[]) {
  const caseStudies = [
    {
      id: "seed-case-01",
      profileIndex: 0,
      title: "Fire-damaged terrace, Openshaw — shell to let in 19 weeks",
      capexGBP: 6_200_000, // £62,000
      netMarginGBP: 3_850_000, // £38,500
      description:
        "Bought at auction after an insurance settlement. Full strip-out, new first-floor joists, rewire and re-plaster; refinanced on completion at a 74% valuation uplift and let to a working tenant within a fortnight.",
    },
    {
      id: "seed-case-02",
      profileIndex: 1,
      title: "Probate semi, Kings Heath — sold on to an owner-occupier",
      capexGBP: 4_500_000, // £45,000
      netMarginGBP: 2_200_000, // £22,000
      description:
        "Executor sale, vacant two years. Rewire, new roof covering, kitchen and bathroom, garden cleared. Marketed at 14 weeks and sold to a first-time buyer with no chain.",
    },
    {
      id: "seed-case-03",
      profileIndex: 2,
      title: "Subsidence bay, Reading — underpinned and insured back to A-rate",
      capexGBP: 8_900_000, // £89,000
      netMarginGBP: -450_000, // −£4,500: an honest loss
      description:
        "Underpinning ran two months over and the market softened mid-project. Recorded here because the numbers are real: the scheme completed at a small loss, and the structural warranty transferred cleanly to the buyer.",
    },
  ];

  for (const c of caseStudies) {
    const { profileIndex, ...rest } = c;
    const agentProfileId = profileIds[profileIndex];
    await db.caseStudy.upsert({
      where: { id: c.id },
      update: { ...rest, agentProfileId },
      create: { ...rest, agentProfileId },
    });
  }

  return caseStudies.length;
}

/**
 * Enquiries come first and deliberately: `AgentProfileService`'s appraisal
 * qualification rule requires a prior `Enquiry` (or `Deal`) on one of the
 * profile's listings, and that rule is server-enforced. Seeding an appraisal
 * without the enquiry behind it would produce demo data the product itself
 * would refuse to create.
 */
async function seedEnquiriesAndAppraisals(profileIds: string[]) {
  const reviewers = [
    { email: "investor@proplink.test", profileIndex: 0, rating: 5 },
    { email: "investor2@proplink.test", profileIndex: 0, rating: 4 },
    { email: "buyer@proplink.test", profileIndex: 1, rating: 5 },
    { email: "investor3@proplink.test", profileIndex: 1, rating: 3 },
    { email: "buyer2@proplink.test", profileIndex: 2, rating: 4 },
  ];

  const reviews = [
    "Straight answers on the structural report and the underpinning quote, and they let my surveyor in the next day. Completed in five weeks.",
    "Priced sensibly and did not waste my time with a bidding war. The distress disclosure matched what the survey found, which is rarer than it should be.",
    "Kept me updated through a probate delay that was nobody's fault. Would buy through them again.",
    "Good stock and quick to respond, but the EPC certificate took three chases to produce. Marking down for that alone.",
    "The refurb schedule they shared was accurate to within about five per cent. That is the whole reason I bid.",
  ];

  let enquiryCount = 0;
  let appraisalCount = 0;

  for (const [i, reviewer] of reviewers.entries()) {
    const user = await db.user.findUniqueOrThrow({ where: { email: reviewer.email } });
    const listings = publicListingsFor(reviewer.profileIndex);
    const listing = listings[i % listings.length];
    const agentProfileId = profileIds[reviewer.profileIndex];

    const enquiryId = `seed-enquiry-qual-${String(i + 1).padStart(2, "0")}`;
    await db.enquiry.upsert({
      where: { id: enquiryId },
      update: {},
      create: {
        id: enquiryId,
        propertyId: listing.id,
        fromUserId: user.id,
        message:
          "I'd like to arrange a viewing and see the survey you mentioned in the listing.",
        status: EnquiryStatus.CLOSED,
      },
    });
    enquiryCount++;

    await db.appraisal.upsert({
      where: {
        agentProfileId_investorUserId: { agentProfileId, investorUserId: user.id },
      },
      update: { rating: reviewer.rating, review: reviews[i] },
      create: {
        agentProfileId,
        investorUserId: user.id,
        rating: reviewer.rating,
        review: reviews[i],
      },
    });
    appraisalCount++;
  }

  // Open leads on top of the qualifying ones, so `/agent/leads` has a mix of
  // NEW/RESPONDED rows to manage rather than a wall of CLOSED.
  const openLeads = [
    {
      email: "buyer3@proplink.test",
      profileIndex: 0,
      status: EnquiryStatus.NEW,
      message:
        "Is the roof quote still valid, and would the vendor consider a delayed completion?",
    },
    {
      email: "investor2@proplink.test",
      profileIndex: 1,
      status: EnquiryStatus.NEW,
      message:
        "Cash buyer, no chain. What is the lowest the executors would realistically take?",
    },
    {
      email: "buyer2@proplink.test",
      profileIndex: 1,
      status: EnquiryStatus.RESPONDED,
      message: "Can I bring a damp specialist round before I commit to a survey?",
    },
    {
      email: "investor@proplink.test",
      profileIndex: 2,
      status: EnquiryStatus.NEW,
      message:
        "Interested in this as part of a two-property package — is the other unit on Alma Terrace still available?",
    },
  ];

  for (const [i, lead] of openLeads.entries()) {
    const user = await db.user.findUniqueOrThrow({ where: { email: lead.email } });
    const listings = publicListingsFor(lead.profileIndex);
    const listing = listings[(i + 2) % listings.length];
    const id = `seed-enquiry-open-${String(i + 1).padStart(2, "0")}`;

    await db.enquiry.upsert({
      where: { id },
      update: {},
      create: {
        id,
        propertyId: listing.id,
        fromUserId: user.id,
        message: lead.message,
        status: lead.status,
      },
    });
    enquiryCount++;
  }

  return { enquiryCount, appraisalCount };
}

/** Non-zero saves counts, so the Task 2.6 analytics columns show real numbers. */
async function seedSavedProperties() {
  const savers = [
    "investor@proplink.test",
    "investor2@proplink.test",
    "buyer@proplink.test",
    "buyer2@proplink.test",
  ];
  const live = SEED_LISTINGS.filter((l) => l.status === PropertyStatus.LIVE);
  let count = 0;

  for (const [i, email] of savers.entries()) {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    // Three listings each, strided so the saves land on different rows.
    for (let n = 0; n < 3; n++) {
      const listing = live[(i * 5 + n * 3) % live.length];
      await db.savedProperty.upsert({
        where: {
          userId_propertyId: { userId: user.id, propertyId: listing.id },
        },
        create: { userId: user.id, propertyId: listing.id },
        update: {},
      });
      count++;
    }
  }

  return count;
}

/**
 * ⚠️ **Sample comparables, not Land Registry data** (ADR-017).
 *
 * The real Price Paid ingest is H5.4. The product owner asked for the buyer's
 * price-history chart to be built against seeded data rather than omitted, so
 * these rows exist to make the chart real end to end — and every surface that
 * renders them says "sample data" on its face, because a price chart on a
 * property site that looks authoritative but is invented is the worst kind of
 * placeholder.
 *
 * Deliberately plausible rather than random: a gentle upward trend with year to
 * year noise, so the chart exercises a real shape. Do not cite these numbers.
 */
async function seedComparableSales() {
  // Both publicly visible statuses. Seeding only LIVE left every UNDER_OFFER
  // listing's district without comparables — and those sort first on the
  // marketplace, so the chart was missing on exactly the listings a buyer sees
  // first.
  const districts = await db.property.findMany({
    where: { status: { in: ["LIVE", "UNDER_OFFER"] } },
    select: { postcode: true, askingPriceGBP: true, propertyType: true },
  });

  const byDistrict = new Map<
    string,
    { base: number; propertyType: (typeof districts)[number]["propertyType"] }
  >();
  for (const p of districts) {
    const district = p.postcode.trim().toUpperCase().split(/\s+/)[0];
    if (district && !byDistrict.has(district)) {
      byDistrict.set(district, { base: p.askingPriceGBP, propertyType: p.propertyType });
    }
  }

  const rows: {
    postcodeDistrict: string;
    address: string;
    priceGBP: number;
    soldDate: Date;
    propertyType: (typeof districts)[number]["propertyType"];
    source: string;
  }[] = [];

  const thisYear = new Date().getUTCFullYear();
  for (const [district, { base, propertyType }] of byDistrict) {
    for (let back = 5; back >= 0; back--) {
      const year = thisYear - back;
      // ~3% a year of drift off the local asking price, plus a deterministic
      // wobble so the line is not a straight ramp.
      const trend = 1 - back * 0.03;
      const wobble = 1 + (((year * 7 + district.length) % 7) - 3) / 100;
      for (let n = 0; n < 3; n++) {
        rows.push({
          postcodeDistrict: district,
          address: `${n + 1} Sample Street, ${district}`,
          priceGBP: Math.round(base * trend * wobble * (1 + n * 0.02)),
          soldDate: new Date(Date.UTC(year, (n * 4 + 2) % 12, 12)),
          propertyType,
          source: "SAMPLE",
        });
      }
    }
  }

  await db.comparableSale.deleteMany({ where: { source: "SAMPLE" } });
  await db.comparableSale.createMany({ data: rows });
  return rows.length;
}

/**
 * A little buyer activity so `/buy` is not five empty lists on a fresh database:
 * one viewing request, one offer, and a short agent thread for Bella Buyer.
 */
async function seedBuyerActivity() {
  const buyer = await db.user.findUnique({ where: { email: "buyer@proplink.test" } });
  if (!buyer) return { viewings: 0, offers: 0, messages: 0 };

  const listings = await db.property.findMany({
    where: { status: "LIVE" },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: {
      id: true,
      askingPriceGBP: true,
      agentProfile: { select: { userId: true } },
    },
  });
  if (listings.length === 0) return { viewings: 0, offers: 0, messages: 0 };

  const [first, second] = listings;

  await db.viewing.deleteMany({ where: { buyerUserId: buyer.id } });
  await db.viewing.create({
    data: {
      propertyId: first.id,
      buyerUserId: buyer.id,
      slotStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      slotEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    },
  });

  await db.offer.deleteMany({ where: { buyerUserId: buyer.id } });
  await db.offer.create({
    data: {
      propertyId: (second ?? first).id,
      buyerUserId: buyer.id,
      // A little under asking, as a real offer on distressed stock would be.
      amountGBP: Math.round((second ?? first).askingPriceGBP * 0.92),
    },
  });

  const agentUserId = first.agentProfile?.userId;
  let messages = 0;
  if (agentUserId) {
    await db.chatMessage.deleteMany({
      where: {
        propertyId: first.id,
        OR: [{ fromUserId: buyer.id }, { toUserId: buyer.id }],
      },
    });
    await db.chatMessage.createMany({
      data: [
        {
          propertyId: first.id,
          fromUserId: buyer.id,
          toUserId: agentUserId,
          body: "Is the structural survey available before a viewing?",
          readAt: new Date(),
        },
        {
          propertyId: first.id,
          fromUserId: agentUserId,
          toUserId: buyer.id,
          body: "Yes — I can send it over today. The subsidence report is included.",
        },
      ],
    });
    messages = 2;
  }

  return { viewings: 1, offers: 1, messages };
}

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const userCount = await seedUsers(passwordHash);

  const agent = await db.user.findUniqueOrThrow({
    where: { email: "agent@proplink.test" },
  });

  const profiles = await seedAgentProfiles(agent.id);
  const profileIds = profiles.map((p) => p.id);

  await seedAgentSubscription(agent.id);
  await seedListings(profileIds);
  const caseStudyCount = await seedCaseStudies(profileIds);
  const { enquiryCount, appraisalCount } = await seedEnquiriesAndAppraisals(profileIds);
  const savedCount = await seedSavedProperties();
  const comparableCount = await seedComparableSales();
  const buyerActivity = await seedBuyerActivity();

  console.log(
    `Seeded ${userCount} users, ${profiles.length} agent profiles, ` +
      `${SEED_LISTING_COUNT} listings, ${caseStudyCount} case studies, ` +
      `${appraisalCount} appraisals, ${enquiryCount} enquiries, ${savedCount} saved listings, ` +
      `${comparableCount} SAMPLE comparable sales (not Land Registry data — ADR-017), ` +
      `${buyerActivity.viewings} viewing, ${buyerActivity.offers} offer, ${buyerActivity.messages} messages.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
