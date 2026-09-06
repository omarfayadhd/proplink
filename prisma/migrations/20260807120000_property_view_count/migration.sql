-- Task 2.6 — additive analytics counter.
-- NOT NULL with a DEFAULT so existing rows are backfilled to 0 in place.
ALTER TABLE "Property" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
