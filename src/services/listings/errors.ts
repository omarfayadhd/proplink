/**
 * Typed error for the listing service layer. Route handlers map `code` to an
 * HTTP status (see `src/app/api/listings/**`) instead of re-deriving intent
 * from a free-text message.
 */
export type ListingErrorCode =
  | "VALIDATION" // request/domain data is incomplete or malformed
  | "NOT_FOUND" // no Property with that id
  | "FORBIDDEN" // authenticated, but does not own the resource
  | "TRANSITION_INVALID" // status machine / role rule rejected the transition
  | "LIMIT_EXCEEDED" // Subscription.listingLimit reached
  | "PROFILE_INACTIVE"; // owned, but the AgentProfile is deactivated

export class ListingServiceError extends Error {
  code: ListingErrorCode;

  constructor(message: string, code: ListingErrorCode) {
    super(message);
    this.name = "ListingServiceError";
    this.code = code;
  }
}

const HTTP_STATUS_BY_CODE: Record<ListingErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  TRANSITION_INVALID: 409,
  LIMIT_EXCEEDED: 409,
  PROFILE_INACTIVE: 403,
};

/** Shared by every /api/listings route handler so error mapping stays consistent. */
export function listingErrorStatus(code: ListingErrorCode): number {
  return HTTP_STATUS_BY_CODE[code];
}
