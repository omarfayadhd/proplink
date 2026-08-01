import { z } from "zod";

// Same reasoning as `MAX_ASKING_PRICE_PENCE` in listings/validation.ts: a
// business-sensible ceiling that also stays inside Postgres' int4 range
// backing `CaseStudy.capexGBP`/`netMarginGBP` (max 2,147,483,647 pence).
export const MAX_CASE_STUDY_MONEY_PENCE = 2_000_000_000; // £20,000,000

const caseStudyFieldsSchema = z.object({
  title: z.string().trim().min(3).max(200),
  // Cost incurred — never negative. `netMarginGBP` (below) is signed: a case
  // study can honestly report a loss.
  capexGBP: z.number().int().min(0).max(MAX_CASE_STUDY_MONEY_PENCE),
  netMarginGBP: z
    .number()
    .int()
    .min(-MAX_CASE_STUDY_MONEY_PENCE)
    .max(MAX_CASE_STUDY_MONEY_PENCE),
  description: z.string().trim().min(10),
  imageUrl: z.string().url().nullable().optional(),
});

export const createCaseStudySchema = caseStudyFieldsSchema.extend({
  agentProfileId: z.string().trim().min(1, "agentProfileId is required"),
});

export const updateCaseStudySchema = caseStudyFieldsSchema.partial();

export type CreateCaseStudyInput = z.infer<typeof createCaseStudySchema>;
export type UpdateCaseStudyInput = z.infer<typeof updateCaseStudySchema>;

/** `Appraisal.rating` is "1..5, checked in service layer" per the schema comment. */
export const createAppraisalSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().min(10).max(2000),
});

export type CreateAppraisalInput = z.infer<typeof createAppraisalSchema>;
