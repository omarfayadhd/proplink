/**
 * Typed error for the enquiry service layer. Same shape as
 * `src/services/listings/errors.ts`'s `ListingServiceError` /
 * `src/services/agents/errors.ts`'s `AgentServiceError` on purpose (AGENTS.md:
 * one error-code-union + HTTP-mapping pattern, not a bespoke shape per
 * service) — a separate class because `instanceof` checks in this domain's
 * route should only ever catch this domain's errors.
 */
export type EnquiryErrorCode =
  | "VALIDATION" // request data incomplete/malformed (defence in depth beyond Zod)
  | "NOT_FOUND" // no Property/Enquiry with that id, or it isn't publicly enquirable yet
  | "FORBIDDEN"; // the lead belongs to another agency (Task 2.6 leads management)

export class EnquiryServiceError extends Error {
  code: EnquiryErrorCode;

  constructor(message: string, code: EnquiryErrorCode) {
    super(message);
    this.name = "EnquiryServiceError";
    this.code = code;
  }
}

const HTTP_STATUS_BY_CODE: Record<EnquiryErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
};

/** Shared by the `/api/enquiries` route handlers. */
export function enquiryErrorStatus(code: EnquiryErrorCode): number {
  return HTTP_STATUS_BY_CODE[code];
}
