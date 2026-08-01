-- Task 2.3 — additive columns for the admin moderation queue.
-- Nullable: existing rows are unaffected.
ALTER TABLE "Property" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Property" ADD COLUMN "rejectionReason" TEXT;
