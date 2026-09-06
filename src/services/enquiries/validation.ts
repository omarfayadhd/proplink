import { z } from "zod";
import { EnquiryStatus } from "@/generated/prisma/enums";

/**
 * `POST /api/enquiries` body. `Enquiry.fromUserId` is a required (non-null)
 * column (`prisma/schema.prisma`) — anonymous enquiries are not possible
 * without weakening the schema, so the route requires a session and this
 * schema carries no name/email fields (the account already has both).
 * `contactPhone` has no dedicated `Enquiry` column; the service folds it into
 * the stored `message` when present (see `enquiryService.ts`) rather than
 * adding a migration for one optional field.
 */
export const createEnquirySchema = z.object({
  propertyId: z.string().trim().min(1, "propertyId is required"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
  contactPhone: z.string().trim().max(30).optional(),
});

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

/**
 * `PATCH /api/enquiries/[id]` body (Task 2.6 leads management). Built from the
 * Prisma enum rather than a hand-written string union so a future
 * `EnquiryStatus` value can't be accepted by the service but rejected here
 * (or vice versa).
 */
export const updateEnquiryStatusSchema = z.object({
  status: z.enum(EnquiryStatus),
});

export type UpdateEnquiryStatusInput = z.infer<typeof updateEnquiryStatusSchema>;
