-- Task 2.2 — additive column for the listing wizard's Step 3 "post-survey
-- pricing safeguard" confirmation. Nullable: existing rows are unaffected;
-- required (server-enforced) only at submitForReview.
ALTER TABLE "Property" ADD COLUMN "pricingSafeguardAckAt" TIMESTAMP(3);
