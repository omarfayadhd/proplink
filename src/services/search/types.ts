import type { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";

export type SearchSort = "newest" | "price" | "roi" | "relevance";

export interface SearchBbox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface SearchCentre {
  lat: number;
  lng: number;
  radiusKm: number;
}

/**
 * Every field is optional: an empty `SearchParams` is the valid "browse
 * everything marketable" query the `/marketplace` landing state issues.
 */
export interface SearchParams {
  /** Free text — Postgres FTS with a pg_trgm similarity fallback. */
  q?: string;
  /** Integer pence, like every other `*GBP` value (AGENTS.md). */
  maxPriceGBP?: number;
  epcBands?: EpcRating[];
  region?: string;
  propertyType?: PropertyType;
  minBedrooms?: number;
  minRoiPct?: number;
  /** ANY match — a listing needs just one of these tags to qualify. */
  distressTags?: DistressTag[];
  /** Map-viewport search. Takes precedence over `centre` when both are set. */
  bbox?: SearchBbox;
  /** "Within N km of here" search. */
  centre?: SearchCentre;
  sort?: SearchSort;
  /** 1-based. Values below 1 are treated as the first page. */
  page?: number;
  pageSize?: number;
}

/** One result card's worth of data — deliberately not the full listing. */
export interface SearchResultItem {
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
  /** First photo by `sortOrder`, or null if the listing has none. */
  imageUrl: string | null;
  /**
   * The card carousel's photos, by `sortOrder`, capped at
   * `CARD_IMAGE_LIMIT`. `imageUrl` is retained as its first element so that
   * every existing consumer keeps working unchanged.
   */
  imageUrls: string[];
  distressTags: DistressTag[];
  lat: number | null;
  lng: number | null;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Interface-first per the sprint plan: `PostgresSearchService` is the only
 * implementation today, but the shape is what a Meilisearch/Elastic swap would
 * have to satisfy. `count` is separate so the UI's debounced live counter can
 * skip fetching rows it will not render.
 */
export interface SearchService {
  search(params: SearchParams): Promise<SearchResult>;
  count(params: SearchParams): Promise<number>;
}
