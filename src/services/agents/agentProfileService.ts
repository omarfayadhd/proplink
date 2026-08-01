import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { PropertyStatus, Role } from "@/generated/prisma/enums";
import { AgentServiceError } from "@/services/agents/errors";
import type {
  CreateCaseStudyInput,
  UpdateCaseStudyInput,
} from "@/services/agents/validation";

const PROFILE_INCLUDE = {
  caseStudies: true,
  appraisals: {
    include: { investor: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.AgentProfileInclude;

export interface AgentProfilePublic {
  id: string;
  agencyName: string;
  bio: string | null;
  complianceCode: string;
  active: boolean;
  /** Average of `Appraisal.rating` for this profile — null when there are none yet. */
  ratingAverage: number | null;
  ratingCount: number;
  /** Count of this profile's listings with `Property.status = SOLD`. */
  verifiedDealCount: number;
  caseStudies: {
    id: string;
    title: string;
    capexGBP: number;
    netMarginGBP: number;
    description: string;
    imageUrl: string | null;
  }[];
  appraisals: {
    id: string;
    rating: number;
    review: string;
    createdAt: Date;
    reviewerName: string;
  }[];
}

/**
 * Public `/agents/[id]` fetch — aggregates computed live (not read from the
 * `AgentProfile.rating`/`verifiedDealCount` columns, which the schema carries
 * as `@default(0)` placeholders never written to by any service): the brief
 * defines both numbers as derived ("average of Appraisal.rating", "count of
 * SOLD listings"), and computing them live means there is no denormalised
 * counter to keep in sync with `transitionStatus` (listings) or appraisal
 * creation (this file) — one less place for drift bugs. Revisit only if this
 * page's read volume ever needs it cached.
 */
export async function getAgentProfilePublic(
  agentProfileId: string,
): Promise<AgentProfilePublic | null> {
  const profile = await db.agentProfile.findUnique({
    where: { id: agentProfileId },
    include: PROFILE_INCLUDE,
  });
  if (!profile) return null;

  const [ratingAgg, verifiedDealCount] = await Promise.all([
    db.appraisal.aggregate({
      where: { agentProfileId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.property.count({ where: { agentProfileId, status: PropertyStatus.SOLD } }),
  ]);

  return {
    id: profile.id,
    agencyName: profile.agencyName,
    bio: profile.bio,
    complianceCode: profile.complianceCode,
    active: profile.active,
    ratingAverage: ratingAgg._avg.rating,
    ratingCount: ratingAgg._count.rating,
    verifiedDealCount,
    caseStudies: profile.caseStudies.map((c) => ({
      id: c.id,
      title: c.title,
      capexGBP: c.capexGBP,
      netMarginGBP: c.netMarginGBP,
      description: c.description,
      imageUrl: c.imageUrl,
    })),
    appraisals: profile.appraisals.map((a) => ({
      id: a.id,
      rating: a.rating,
      review: a.review,
      createdAt: a.createdAt,
      reviewerName: a.investor.name,
    })),
  };
}

/**
 * Ownership gate for case-study mutations — same "not found or not owned ->
 * FORBIDDEN" shape as `listingService.ts`'s `findOwnedAgentProfile` (doesn't
 * leak whether an id exists to a non-owner). Deliberately does NOT also
 * check `AgentProfile.active`: that gate is scoped to listing-ownership
 * paths (Task 2.2/2.3) — an agent must still be able to manage their
 * credibility hub content (case studies) even if a profile is flagged
 * inactive.
 */
async function findOwnedProfile(userId: string, agentProfileId: string) {
  const profile = await db.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!profile || profile.userId !== userId) {
    throw new AgentServiceError(
      "Agent profile not found, or not owned by this user",
      "FORBIDDEN",
    );
  }
  return profile;
}

async function findOwnedCaseStudy(userId: string, caseStudyId: string) {
  const caseStudy = await db.caseStudy.findUnique({
    where: { id: caseStudyId },
    include: { agentProfile: true },
  });
  if (!caseStudy) throw new AgentServiceError("Case study not found", "NOT_FOUND");
  if (caseStudy.agentProfile.userId !== userId) {
    throw new AgentServiceError("You do not own this case study", "FORBIDDEN");
  }
  return caseStudy;
}

/** `/agent/profile` owner's-eye view of one profile's case studies. */
export async function listCaseStudiesForOwnedProfile(params: {
  userId: string;
  agentProfileId: string;
}) {
  await findOwnedProfile(params.userId, params.agentProfileId);
  return db.caseStudy.findMany({ where: { agentProfileId: params.agentProfileId } });
}

export async function createCaseStudy(params: {
  userId: string;
  input: CreateCaseStudyInput;
}) {
  await findOwnedProfile(params.userId, params.input.agentProfileId);

  return db.caseStudy.create({
    data: {
      agentProfileId: params.input.agentProfileId,
      title: params.input.title,
      capexGBP: params.input.capexGBP,
      netMarginGBP: params.input.netMarginGBP,
      description: params.input.description,
      imageUrl: params.input.imageUrl ?? null,
    },
  });
}

export async function updateCaseStudy(params: {
  userId: string;
  caseStudyId: string;
  input: UpdateCaseStudyInput;
}) {
  await findOwnedCaseStudy(params.userId, params.caseStudyId);

  const data: Prisma.CaseStudyUpdateInput = {};
  if (params.input.title !== undefined) data.title = params.input.title;
  if (params.input.capexGBP !== undefined) data.capexGBP = params.input.capexGBP;
  if (params.input.netMarginGBP !== undefined)
    data.netMarginGBP = params.input.netMarginGBP;
  if (params.input.description !== undefined) data.description = params.input.description;
  if (params.input.imageUrl !== undefined) data.imageUrl = params.input.imageUrl;

  return db.caseStudy.update({ where: { id: params.caseStudyId }, data });
}

export async function deleteCaseStudy(params: { userId: string; caseStudyId: string }) {
  await findOwnedCaseStudy(params.userId, params.caseStudyId);
  await db.caseStudy.delete({ where: { id: params.caseStudyId } });
}

export type AppraisalEligibility =
  | { eligible: true }
  | { eligible: false; reason: "WRONG_ROLE" | "NOT_QUALIFIED" | "ALREADY_REVIEWED" };

async function hasQualifyingActivity(
  userId: string,
  agentProfileId: string,
): Promise<boolean> {
  const [enquiryCount, dealCount] = await Promise.all([
    db.enquiry.count({ where: { fromUserId: userId, property: { agentProfileId } } }),
    db.deal.count({
      where: { property: { agentProfileId }, offer: { buyerUserId: userId } },
    }),
  ]);
  return enquiryCount > 0 || dealCount > 0;
}

/**
 * Qualification rule (brief, Task 2.4): the posting user must have >=1
 * Enquiry or Deal on any listing belonging to this agent profile, must not
 * already have an appraisal for it, and must be an INVESTOR or BUYER (the
 * field is named `investorUserId` but the brief's "may review" rule is
 * "Investors/buyers only", so BUYER qualifies too). Exported separately from
 * `createAppraisal` so the public page can explain *why* a logged-in user
 * can't review, without duplicating the qualification query.
 */
export async function getAppraisalEligibility(params: {
  userId: string;
  role: Role;
  agentProfileId: string;
}): Promise<AppraisalEligibility> {
  if (params.role !== Role.INVESTOR && params.role !== Role.BUYER) {
    return { eligible: false, reason: "WRONG_ROLE" };
  }

  const existing = await db.appraisal.findUnique({
    where: {
      agentProfileId_investorUserId: {
        agentProfileId: params.agentProfileId,
        investorUserId: params.userId,
      },
    },
  });
  if (existing) return { eligible: false, reason: "ALREADY_REVIEWED" };

  const qualifies = await hasQualifyingActivity(params.userId, params.agentProfileId);
  if (!qualifies) return { eligible: false, reason: "NOT_QUALIFIED" };

  return { eligible: true };
}

/**
 * Server-enforced appraisal creation (AGENTS.md: never trust the client for
 * role/qualification). Re-validates the rating range here too, not just at
 * the route's Zod boundary — same "business rule belongs in the service"
 * reasoning as `moderationService.rejectListing`'s reason check — and
 * matches the schema comment on `Appraisal.rating` ("1..5, checked in
 * service layer").
 */
export async function createAppraisal(params: {
  userId: string;
  role: Role;
  agentProfileId: string;
  rating: number;
  review: string;
}) {
  if (!Number.isInteger(params.rating) || params.rating < 1 || params.rating > 5) {
    throw new AgentServiceError(
      "Rating must be an integer between 1 and 5",
      "VALIDATION",
    );
  }

  const profile = await db.agentProfile.findUnique({
    where: { id: params.agentProfileId },
  });
  if (!profile) throw new AgentServiceError("Agent profile not found", "NOT_FOUND");

  const eligibility = await getAppraisalEligibility(params);
  if (!eligibility.eligible) {
    if (eligibility.reason === "ALREADY_REVIEWED") {
      throw new AgentServiceError("You have already reviewed this agency", "DUPLICATE");
    }
    throw new AgentServiceError(
      eligibility.reason === "WRONG_ROLE"
        ? "Only investors and buyers can post appraisals"
        : "You need a prior enquiry or deal with this agency before you can review it",
      "NOT_QUALIFIED",
    );
  }

  return db.appraisal.create({
    data: {
      agentProfileId: params.agentProfileId,
      investorUserId: params.userId,
      rating: params.rating,
      review: params.review,
    },
  });
}
