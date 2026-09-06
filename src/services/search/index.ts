import { PostgresSearchService } from "@/services/search/postgresSearchService";
import type { SearchService } from "@/services/search/types";

export type {
  SearchBbox,
  SearchCentre,
  SearchParams,
  SearchResult,
  SearchResultItem,
  SearchService,
  SearchSort,
} from "@/services/search/types";
export { PostgresSearchService } from "@/services/search/postgresSearchService";
export { parseSearchParams } from "@/services/search/validation";
export { buildSearchQueryString } from "@/services/search/queryString";
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/services/search/queryBuilder";

/**
 * The active implementation. Unlike Storage/Geocoding/StaticMap there is no env
 * switch and no mock: search runs on the same Postgres the app already
 * requires, so there is no external credential to be missing and nothing to
 * fall back to. The `SearchService` interface exists so a Meilisearch/Elastic
 * swap stays a one-line change here (ARCHITECTURE.md: no Elasticsearch in this
 * build).
 */
export const searchService: SearchService = new PostgresSearchService();
