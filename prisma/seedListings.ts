import {
  DistressTag,
  EpcRating,
  PropertyStatus,
  PropertyType,
} from "../src/generated/prisma/enums";

/**
 * Task 2.7 demo catalogue: 40 distressed listings, defined as pure data so the
 * seed script stays a thin writer.
 *
 * Everything here is deterministic — no `Math.random()`, no live geocoding
 * (AGENTS.md: seeds never call external APIs). Coordinates are hardcoded, and
 * every id is stable so `prisma/seed.ts` can upsert rather than
 * delete-and-recreate, which keeps re-runs idempotent without orphaning the
 * `Enquiry`/`SavedProperty`/`Appraisal` rows that reference these listings.
 */

export interface SeedCity {
  city: string;
  region: string;
  /** Real postcode districts, arbitrary-but-plausible unit codes. */
  postcodes: string[];
  lat: number;
  lng: number;
}

/** Coordinates are the city/district centres, good to ~1km. */
export const SEED_CITIES: SeedCity[] = [
  {
    city: "London",
    region: "Greater London",
    postcodes: ["E1 6AN", "SE15 3SN", "N15 4RY", "SE18 6HQ"],
    lat: 51.5074,
    lng: -0.1278,
  },
  {
    city: "Manchester",
    region: "Greater Manchester",
    postcodes: ["M14 5TP", "M9 4FP", "M18 7BD"],
    lat: 53.4808,
    lng: -2.2426,
  },
  {
    city: "Birmingham",
    region: "West Midlands",
    postcodes: ["B12 9QP", "B21 8LD", "B44 8QT"],
    lat: 52.4862,
    lng: -1.8904,
  },
  {
    city: "Leeds",
    region: "West Yorkshire",
    postcodes: ["LS8 3JH", "LS11 6DP", "LS12 3HW"],
    lat: 53.8008,
    lng: -1.5491,
  },
  {
    city: "Liverpool",
    region: "Merseyside",
    postcodes: ["L15 3JD", "L4 2QG", "L8 0SW"],
    lat: 53.4084,
    lng: -2.9916,
  },
  {
    city: "Bristol",
    region: "Somerset",
    postcodes: ["BS5 6QA", "BS4 3RN", "BS16 3RN"],
    lat: 51.4545,
    lng: -2.5879,
  },
  {
    city: "Newcastle upon Tyne",
    region: "Tyne and Wear",
    postcodes: ["NE6 5PJ", "NE4 6UP", "NE5 3DP"],
    lat: 54.9783,
    lng: -1.6178,
  },
  {
    city: "Sheffield",
    region: "South Yorkshire",
    postcodes: ["S6 3TE", "S5 8ZP", "S2 3EH"],
    lat: 53.3811,
    lng: -1.4701,
  },
  {
    city: "Nottingham",
    region: "Nottinghamshire",
    postcodes: ["NG7 5PT", "NG3 2FL", "NG6 8AF"],
    lat: 52.9548,
    lng: -1.1581,
  },
  {
    city: "Glasgow",
    region: "Glasgow City",
    postcodes: ["G31 3AA", "G21 4BE", "G51 2YL"],
    lat: 55.8642,
    lng: -4.2518,
  },
  {
    city: "Cardiff",
    region: "South Glamorgan",
    postcodes: ["CF24 1RB", "CF11 7AD", "CF14 3LX"],
    lat: 51.4816,
    lng: -3.1791,
  },
  {
    city: "Leicester",
    region: "Leicestershire",
    postcodes: ["LE5 3RA", "LE4 6DR", "LE2 6BE"],
    lat: 52.6369,
    lng: -1.1398,
  },
];

interface DistressTheme {
  tags: DistressTag[];
  /** `{type}` is substituted with the property type's plain-English noun. */
  title: string;
  description: string;
}

/** One theme per `DistressTag`, plus combinations, so every enum value appears. */
export const DISTRESS_THEMES: DistressTheme[] = [
  {
    tags: [DistressTag.PROBATE],
    title: "Probate sale — {type} requiring full modernisation",
    description:
      "Deceased estate, granted probate and vacant for over a year. Structurally sound with original 1970s fittings throughout: rewire, replacement kitchen and bathroom assumed. Executors are motivated and will consider offers below the guide for a chain-free buyer.",
  },
  {
    tags: [DistressTag.RENOVATION_NEEDED, DistressTag.DAMP],
    title: "Tired {type} with penetrating damp to the rear",
    description:
      "Long-term rental returned in poor condition. Penetrating damp to the rear elevation traced to a failed gutter run; damp survey available on request. Otherwise a straightforward cosmetic refurbishment with good ceiling heights and original features intact.",
  },
  {
    tags: [DistressTag.SUBSIDENCE],
    title: "Subsidence-affected {type} — underpinning quote in hand",
    description:
      "Historic clay-shrinkage movement to the bay, monitored over two heating cycles and now stable. Structural engineer's report and a fixed-price underpinning quote are available. Priced to reflect the works and the insurance history.",
  },
  {
    tags: [DistressTag.FIRE_DAMAGE, DistressTag.RENOVATION_NEEDED],
    title: "Fire-damaged {type} — shell only, insurance settled",
    description:
      "Kitchen fire with smoke damage through the first floor. Insurer has settled and the property is sold as a shell; roof and external walls sound, first-floor joists require replacement. Suits a cash buyer with a competent contractor.",
  },
  {
    tags: [DistressTag.ROOF_REQUIRED],
    title: "{type} needing a full roof covering",
    description:
      "Slate covering at the end of its life with several slipped courses and a failed valley. Scaffold access is straightforward from the side return. Everything below the roofline has been maintained, so the works are well defined and quotable.",
  },
  {
    tags: [DistressTag.WATER_DAMAGE, DistressTag.DAMP],
    title: "Flood-affected {type} — post-remediation, priced accordingly",
    description:
      "Ground floor affected by a burst mains supply while vacant. Strip-out and drying complete with certificates available; reinstatement of plaster, flooring and kitchen still to do. Insurance history disclosed to all interested parties.",
  },
  {
    tags: [DistressTag.ASBESTOS, DistressTag.RENOVATION_NEEDED],
    title: "{type} with asbestos garage and outbuildings to clear",
    description:
      "Asbestos cement sheeting to the garage roof and a rear outbuilding, confirmed by survey. Licensed removal quoted at a known figure and reflected in the guide. The main house needs modernising but no structural work is anticipated.",
  },
  {
    tags: [DistressTag.RENOVATION_NEEDED],
    title: "Part-complete refurbishment — {type} back to market",
    description:
      "Previous owner ran out of funds mid-project. First fix electrics and plumbing complete, new windows fitted, plastering and second fix outstanding. Building control records and the outstanding schedule of works pass to the buyer.",
  },
  {
    tags: [DistressTag.PROBATE, DistressTag.DAMP],
    title: "Chain-break {type}, executors seeking a quick completion",
    description:
      "Sale fell through twice on survey. Rising damp to the front reception and a dated bathroom are the only significant findings; the roof was replaced eight years ago. Executors will trade price for a committed, chain-free buyer.",
  },
  {
    tags: [DistressTag.RENOVATION_NEEDED, DistressTag.ROOF_REQUIRED],
    title: "Repossessed {type} — auction re-list after an unsold lot",
    description:
      "Returned to market after failing to meet reserve at auction. Vacant possession, keys held by the agent. Roof covering and full internal modernisation required; the receiver is under pressure to conclude before quarter end.",
  },
];

const PROPERTY_TYPE_NOUNS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: "three-bed semi",
  [PropertyType.HMO]: "six-bed HMO",
  [PropertyType.COMMERCIAL]: "mixed-use commercial unit",
  [PropertyType.LAND]: "plot with lapsed consent",
};

const STREET_NAMES = [
  "Alma Terrace",
  "Beckett Road",
  "Cavendish Street",
  "Dovedale Grove",
  "Ellesmere Avenue",
  "Fairfield Rise",
  "Granby Row",
  "Hawthorn Close",
  "Ivybridge Lane",
  "Jubilee Crescent",
];

const EPC_SPREAD: EpcRating[] = [
  EpcRating.D,
  EpcRating.E,
  EpcRating.F,
  EpcRating.C,
  EpcRating.G,
  EpcRating.E,
  EpcRating.B,
  EpcRating.D,
  EpcRating.F,
  EpcRating.A,
];

/**
 * Status mix chosen so every demo surface has something to show: a browsable
 * marketplace, a non-empty moderation queue, and both post-offer badges.
 * Index-based rather than random so re-seeding never reshuffles the demo.
 */
function statusFor(index: number): PropertyStatus {
  if (index < 30) return PropertyStatus.LIVE;
  if (index < 35) return PropertyStatus.PENDING_REVIEW;
  if (index < 38) return PropertyStatus.UNDER_OFFER;
  return PropertyStatus.SOLD;
}

/** Types with a fixed, self-evident bedroom count; residential varies. */
const BEDROOMS_BY_TYPE: Partial<Record<PropertyType, number>> = {
  [PropertyType.LAND]: 0,
  [PropertyType.COMMERCIAL]: 0,
  [PropertyType.HMO]: 6,
};

const PROPERTY_TYPE_CYCLE: PropertyType[] = [
  PropertyType.RESIDENTIAL,
  PropertyType.RESIDENTIAL,
  PropertyType.RESIDENTIAL,
  PropertyType.HMO,
  PropertyType.RESIDENTIAL,
  PropertyType.RESIDENTIAL,
  PropertyType.COMMERCIAL,
  PropertyType.RESIDENTIAL,
  PropertyType.RESIDENTIAL,
  PropertyType.LAND,
];

export interface SeedListing {
  id: string;
  profileIndex: number;
  title: string;
  description: string;
  status: PropertyStatus;
  addressLine1: string;
  city: string;
  region: string;
  postcode: string;
  lat: number;
  lng: number;
  propertyType: PropertyType;
  bedrooms: number;
  /** Integer pence, £45,000–£450,000 (AGENTS.md: money is never a float). */
  askingPriceGBP: number;
  targetRoiPct: number;
  epcRating: EpcRating;
  tags: DistressTag[];
  imageCount: number;
  viewCount: number;
}

const MIN_PRICE_PENCE = 4_500_000; // £45,000
const MAX_PRICE_PENCE = 45_000_000; // £450,000

/**
 * Spreads 40 prices evenly across the brief's £45k–£450k band. Even spacing
 * (rather than a random draw) keeps the demo's price filters and sort orders
 * predictable, and guarantees both ends of the band are represented.
 */
function priceFor(index: number, total: number): number {
  const step = (MAX_PRICE_PENCE - MIN_PRICE_PENCE) / (total - 1);
  // Round to whole hundreds of pounds so the formatted figures look real.
  return Math.round((MIN_PRICE_PENCE + step * index) / 10_000) * 10_000;
}

export const SEED_LISTING_COUNT = 40;

export const SEED_LISTINGS: SeedListing[] = Array.from(
  { length: SEED_LISTING_COUNT },
  (_, i) => {
    const cityEntry = SEED_CITIES[i % SEED_CITIES.length];
    const theme = DISTRESS_THEMES[i % DISTRESS_THEMES.length];
    const propertyType = PROPERTY_TYPE_CYCLE[i % PROPERTY_TYPE_CYCLE.length];
    const postcode = cityEntry.postcodes[i % cityEntry.postcodes.length];

    return {
      id: `seed-listing-${String(i + 1).padStart(2, "0")}`,
      // Round-robin across the three seeded agency profiles.
      profileIndex: i % 3,
      title: theme.title.replace("{type}", PROPERTY_TYPE_NOUNS[propertyType]),
      description: `${theme.description} ${cityEntry.city} (${postcode}) — rental demand in this district has been consistently strong.`,
      status: statusFor(i),
      addressLine1: `${((i * 7) % 120) + 1} ${STREET_NAMES[i % STREET_NAMES.length]}`,
      city: cityEntry.city,
      region: cityEntry.region,
      postcode,
      // Nudge each listing off the exact city centre so map pins don't stack.
      lat: Number((cityEntry.lat + ((i % 7) - 3) * 0.004).toFixed(6)),
      lng: Number((cityEntry.lng + ((i % 5) - 2) * 0.006).toFixed(6)),
      propertyType,
      // Keep the number honest against the title's noun — a "six-bed HMO"
      // listed as a 3-bed reads as broken demo data.
      bedrooms: BEDROOMS_BY_TYPE[propertyType] ?? (i % 4) + 2,
      askingPriceGBP: priceFor(i, SEED_LISTING_COUNT),
      // 8.0–29.5%, inside the brief's 8–30% band.
      targetRoiPct: Number((8 + ((i * 13) % 22) + (i % 2) * 0.5).toFixed(1)),
      epcRating: EPC_SPREAD[i % EPC_SPREAD.length],
      tags: theme.tags,
      imageCount: 3 + (i % 4), // 3–6
      // Plausible non-zero analytics so the Task 2.6 columns aren't all zero.
      viewCount: (i * 17) % 240,
    };
  },
);
