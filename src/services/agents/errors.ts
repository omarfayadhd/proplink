/**
 * Typed error for the agent-profile service layer. Same shape as
 * `src/services/listings/errors.ts`'s `ListingServiceError` on purpose (AGENTS.md:
 * one error-code-union + HTTP-mapping pattern, not a bespoke shape per
 * service) — a separate class rather than importing `ListingServiceError`
 * because the code unions differ (qualification/duplicate-review codes have
 * no listings equivalent) and `instanceof` checks in each domain's routes
 * should only catch that domain's errors.
 */
export type AgentErrorCode =
  | "VALIDATION" // request/domain data is incomplete or malformed
  | "NOT_FOUND" // no AgentProfile/CaseStudy with that id
  | "FORBIDDEN" // authenticated, but does not own the resource
  | "NOT_QUALIFIED" // appraisal: no prior Enquiry/Deal with this agent profile, or wrong role
  | "DUPLICATE"; // appraisal: this user has already reviewed this agent profile

export class AgentServiceError extends Error {
  code: AgentErrorCode;

  constructor(message: string, code: AgentErrorCode) {
    super(message);
    this.name = "AgentServiceError";
    this.code = code;
  }
}

const HTTP_STATUS_BY_CODE: Record<AgentErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  NOT_QUALIFIED: 403,
  DUPLICATE: 409,
};

/** Shared by every /api/agents & /api/case-studies route handler. */
export function agentErrorStatus(code: AgentErrorCode): number {
  return HTTP_STATUS_BY_CODE[code];
}
