import { Prisma } from "@/generated/prisma/client";
import { PropertyStatus } from "@/generated/prisma/enums";
import type { SearchParams } from "@/services/search/types";

/**
 * Pure SQL construction for `PostgresSearchService`.
 *
 * Raw SQL rather than Prisma's query API because the three things that make
 * this search worth having — the FTS `tsvector`, pg_trgm `similarity()`, and
 * PostGIS `ST_DWithin`/`&&` — have no Prisma expression. Every user value is
 * bound as a parameter through `Prisma.sql`; nothing is ever interpolated into
 * the query string (there is a test that fails if it ever is).
 *
 * Kept separate from the service so each filter is unit-testable without a
 * database: `Prisma.Sql` exposes `.text` and `.values`.
 */

/**
 * SOLD listings are publicly *viewable* — `/marketplace/[id]` renders them, and
 * they feed the agent's Verified Completed Deals count — but they are not stock
 * a buyer can act on, so search excludes them. UNDER_OFFER stays in: those
 * deals fall through often enough that hiding them would cost real leads, and
 * the card carries a status badge.
 */
const SEARCHABLE_STATUSES = [PropertyStatus.LIVE, PropertyStatus.UNDER_OFFER];

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

/**
 * pg_trgm similarity thresholds. Title is the longest field, so it needs the
 * loosest bar to match a short query; city and postcode are short enough that a
 * low threshold there would match almost anything.
 */
const TITLE_SIMILARITY_THRESHOLD = 0.15;
const PLACE_SIMILARITY_THRESHOLD = 0.3;

function trimmedQuery(params: SearchParams): string | null {
  const q = params.q?.trim();
  return q ? q : null;
}

/** Enum columns need their parameters cast, or Postgres sees `enum = text`. */
function enumList(values: string[], enumType: string): Prisma.Sql {
  return Prisma.join(
    values.map((v) => Prisma.sql`${v}${Prisma.raw(`::"${enumType}"`)}`),
    ",",
  );
}

function buildPredicates(params: SearchParams): Prisma.Sql[] {
  const predicates: Prisma.Sql[] = [
    Prisma.sql`p."status" IN (${enumList(SEARCHABLE_STATUSES, "PropertyStatus")})`,
  ];

  if (params.maxPriceGBP != null) {
    predicates.push(Prisma.sql`p."askingPriceGBP" <= ${params.maxPriceGBP}`);
  }
  if (params.minBedrooms != null) {
    predicates.push(Prisma.sql`p."bedrooms" >= ${params.minBedrooms}`);
  }
  if (params.minRoiPct != null) {
    predicates.push(Prisma.sql`p."targetRoiPct" >= ${params.minRoiPct}`);
  }
  if (params.propertyType) {
    predicates.push(
      Prisma.sql`p."propertyType" = ${params.propertyType}::"PropertyType"`,
    );
  }
  if (params.region) {
    // Case-insensitive so a "west midlands" query finds "West Midlands".
    predicates.push(Prisma.sql`lower(p."region") = lower(${params.region})`);
  }
  if (params.epcBands?.length) {
    predicates.push(
      Prisma.sql`p."epcRating" IN (${enumList(params.epcBands, "EpcRating")})`,
    );
  }
  if (params.distressTags?.length) {
    // EXISTS + IN, so a listing carrying ANY one of the requested tags matches
    // (the sprint plan's rule). A join would also duplicate rows per tag.
    predicates.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "PropertyDistressTag" pdt
      WHERE pdt."propertyId" = p."id"
        AND pdt."tag" IN (${enumList(params.distressTags, "DistressTag")})
    )`);
  }

  // bbox wins over centre: they come from different UI affordances (drag the
  // map vs. "within N km"), and applying both would silently intersect them.
  if (params.bbox) {
    const { minLat, minLng, maxLat, maxLng } = params.bbox;
    // `&&` is the bounding-box overlap operator — the one the GIST index on
    // `Property.location` can actually answer.
    predicates.push(
      Prisma.sql`p."location"::geometry && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`,
    );
  } else if (params.centre) {
    const { lat, lng, radiusKm } = params.centre;
    // ST_DWithin on `geography` measures in METRES.
    predicates.push(
      Prisma.sql`ST_DWithin(p."location", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})`,
    );
  }

  const q = trimmedQuery(params);
  if (q) {
    // FTS first (fast, index-backed, handles stemming and phrases), with a
    // trigram fallback in the same predicate so typos and partial words
    // ("manchestr", "probat") still find something.
    predicates.push(Prisma.sql`(
      p."searchVector" @@ websearch_to_tsquery('english', ${q})
      OR similarity(p."title", ${q}) > ${TITLE_SIMILARITY_THRESHOLD}
      OR similarity(p."city", ${q}) > ${PLACE_SIMILARITY_THRESHOLD}
      OR similarity(p."postcode", ${q}) > ${PLACE_SIMILARITY_THRESHOLD}
    )`);
  }

  return predicates;
}

function whereClause(params: SearchParams): Prisma.Sql {
  return Prisma.sql`WHERE ${Prisma.join(buildPredicates(params), " AND ")}`;
}

/**
 * Every ordering ends with `"id" ASC`. Without a unique tiebreaker, rows with
 * equal sort keys can swap between page requests, so the same listing shows up
 * twice — or never — as a user pages through.
 */
function orderByClause(params: SearchParams): Prisma.Sql {
  const q = trimmedQuery(params);

  switch (params.sort) {
    case "price":
      return Prisma.sql`ORDER BY p."askingPriceGBP" ASC, p."id" ASC`;
    case "roi":
      return Prisma.sql`ORDER BY p."targetRoiPct" DESC NULLS LAST, p."id" ASC`;
    case "relevance":
      // ts_rank against an empty tsquery scores every row 0, leaving the order
      // undefined — so relevance without a query degrades to newest.
      if (!q) break;
      return Prisma.sql`ORDER BY ts_rank(p."searchVector", websearch_to_tsquery('english', ${q})) DESC, p."id" ASC`;
    default:
      break;
  }
  return Prisma.sql`ORDER BY p."publishedAt" DESC NULLS LAST, p."id" ASC`;
}

export function resolvePageSize(pageSize?: number): number {
  if (!pageSize || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}

/**
 * How many photos a result card carries for its carousel.
 *
 * The card shows them one at a time and a listing can hold far more, so this is
 * the point at which "enough to swipe through" stops being worth the bytes on
 * a page rendering 24 cards. The LIMIT is inside the subquery, not applied
 * after aggregation, so Postgres stops reading rows rather than building a
 * large array and discarding most of it.
 */
export const CARD_IMAGE_LIMIT = 8;

export function resolvePage(page?: number): number {
  if (!page || page < 1) return 1;
  return Math.floor(page);
}

/**
 * Result rows for the search grid. The images and the distress tags come from
 * correlated subqueries rather than a second round trip, so one query returns
 * everything a `PropertyCard` renders, already ordered.
 */
export function buildSearchQuery(params: SearchParams): Prisma.Sql {
  const pageSize = resolvePageSize(params.pageSize);
  const offset = (resolvePage(params.page) - 1) * pageSize;

  return Prisma.sql`
    SELECT
      p."id",
      p."title",
      p."city",
      p."region",
      p."postcode",
      p."propertyType",
      p."bedrooms",
      p."askingPriceGBP",
      p."targetRoiPct",
      p."epcRating",
      p."status",
      p."publishedAt",
      ST_Y(p."location"::geometry) AS "lat",
      ST_X(p."location"::geometry) AS "lng",
      (
        SELECT pi."url" FROM "PropertyImage" pi
        WHERE pi."propertyId" = p."id"
        ORDER BY pi."sortOrder" ASC
        LIMIT 1
      ) AS "imageUrl",
      COALESCE((
        SELECT array_agg(pi."url" ORDER BY pi."sortOrder" ASC)
        FROM (
          SELECT pi2."url", pi2."sortOrder" FROM "PropertyImage" pi2
          WHERE pi2."propertyId" = p."id"
          ORDER BY pi2."sortOrder" ASC
          LIMIT ${CARD_IMAGE_LIMIT}
        ) pi
      ), ARRAY[]::text[]) AS "imageUrls",
      COALESCE((
        SELECT array_agg(pdt."tag"::text ORDER BY pdt."tag")
        FROM "PropertyDistressTag" pdt
        WHERE pdt."propertyId" = p."id"
      ), ARRAY[]::text[]) AS "distressTags"
    FROM "Property" p
    ${whereClause(params)}
    ${orderByClause(params)}
    LIMIT ${pageSize} OFFSET ${offset}
  `;
}

/** The live-count query: same predicates, no ordering and no pagination. */
export function buildSearchCountQuery(params: SearchParams): Prisma.Sql {
  return Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM "Property" p
    ${whereClause(params)}
  `;
}
