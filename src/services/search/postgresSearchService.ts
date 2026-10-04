import { db } from "@/lib/db";
import type { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import {
  buildSearchCountQuery,
  buildSearchQuery,
  resolvePage,
  resolvePageSize,
} from "@/services/search/queryBuilder";
import type {
  SearchParams,
  SearchResult,
  SearchResultItem,
  SearchService,
} from "@/services/search/types";

/** Shape returned by the raw query — mapped, not trusted, into the public type. */
interface RawSearchRow {
  id: string;
  title: string;
  city: string;
  region: string;
  postcode: string;
  propertyType: PropertyType;
  bedrooms: number;
  askingPriceGBP: number;
  targetRoiPct: number | null;
  epcRating: EpcRating | null;
  status: string;
  publishedAt: Date | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  imageUrls: string[] | null;
  distressTags: string[] | null;
}

function toItem(row: RawSearchRow): SearchResultItem {
  return {
    ...row,
    // `array_agg` returns NULL, not an empty array, when a listing has no tags —
    // the query COALESCEs it, but the mapper stays defensive since a null here
    // would crash every card that maps over the list.
    distressTags: (row.distressTags ?? []) as DistressTag[],
    imageUrls: row.imageUrls ?? [],
  };
}

/**
 * The only `SearchService` implementation (Task 3.1). All the query
 * construction lives in `queryBuilder.ts`; this class is the thin execute +
 * map layer, so swapping Postgres for Meilisearch later means writing a
 * sibling class rather than unpicking SQL from business logic.
 */
export class PostgresSearchService implements SearchService {
  async search(params: SearchParams): Promise<SearchResult> {
    const page = resolvePage(params.page);
    const pageSize = resolvePageSize(params.pageSize);

    // Rows and total in parallel: the count is needed for pagination on the
    // very same render, so serialising them would just add a round trip.
    const [rows, total] = await Promise.all([
      db.$queryRaw<RawSearchRow[]>(buildSearchQuery(params)),
      this.count(params),
    ]);

    return {
      items: rows.map(toItem),
      total,
      // Report what was actually queried, not what was asked for — the caller
      // paginates against these numbers.
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async count(params: SearchParams): Promise<number> {
    const rows = await db.$queryRaw<{ count: number }[]>(buildSearchCountQuery(params));
    return rows[0]?.count ?? 0;
  }
}
