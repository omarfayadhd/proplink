-- PropLink UK init migration.
-- Extensions MUST come first: Property.location is geography(Point,4326).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'INVESTOR', 'BUYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'LIVE', 'UNDER_OFFER', 'SOLD');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'HMO', 'LAND');

-- CreateEnum
CREATE TYPE "EpcRating" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G');

-- CreateEnum
CREATE TYPE "DistressTag" AS ENUM ('SUBSIDENCE', 'DAMP', 'RENOVATION_NEEDED', 'PROBATE', 'ASBESTOS', 'ROOF_REQUIRED', 'WATER_DAMAGE', 'FIRE_DAMAGE');

-- CreateEnum
CREATE TYPE "SyndicateStatus" AS ENUM ('OPEN', 'FUNDED', 'IN_REFURB', 'LISTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('PLEDGED', 'CONFIRMED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('EXPENSE', 'CAPITAL_INJECTION');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'RESPONDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('OFFER_ACCEPTED', 'SOLICITOR_REFERRED', 'CONVEYANCING', 'EXCHANGED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'DONE');

-- CreateEnum
CREATE TYPE "PartnerCategory" AS ENUM ('INSURANCE', 'CONVEYANCING', 'STAGING', 'TRADES', 'SURVEYOR', 'SOLICITOR');

-- CreateEnum
CREATE TYPE "AdModel" AS ENUM ('CPM', 'CPC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "complianceCode" TEXT,
    "avatarUrl" TEXT,
    "gdprConsentAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "bio" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verifiedDealCount" INTEGER NOT NULL DEFAULT 0,
    "complianceCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "agentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "addressLine1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "location" geography(Point,4326),
    "propertyType" "PropertyType" NOT NULL,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "askingPriceGBP" INTEGER NOT NULL,
    "targetRoiPct" DOUBLE PRECISION,
    "epcRating" "EpcRating",
    "epcCertUrl" TEXT,
    "floorPlanUrl" TEXT,
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDistressTag" (
    "propertyId" TEXT NOT NULL,
    "tag" "DistressTag" NOT NULL,

    CONSTRAINT "PropertyDistressTag_pkey" PRIMARY KEY ("propertyId","tag")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyndicateProject" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capitalTargetGBP" INTEGER NOT NULL,
    "equityModelNotes" TEXT,
    "status" "SyndicateStatus" NOT NULL DEFAULT 'OPEN',
    "capitalProtectionPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyndicateProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyndicatePledge" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "investorUserId" TEXT NOT NULL,
    "amountGBP" INTEGER NOT NULL,
    "status" "PledgeStatus" NOT NULL DEFAULT 'PLEDGED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyndicatePledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestonePhoto" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "MilestonePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amountGBP" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedProperty" (
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "SavedProperty_pkey" PRIMARY KEY ("userId","propertyId")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paramsJson" JSONB NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastAlertAt" TIMESTAMP(3),

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "agentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "capexGBP" INTEGER NOT NULL,
    "netMarginGBP" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appraisal" (
    "id" TEXT NOT NULL,
    "agentProfileId" TEXT NOT NULL,
    "investorUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "listingLimit" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessFee" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "projectId" TEXT,
    "amountGBP" INTEGER NOT NULL,
    "vatGBP" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuccessFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "amountGBP" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'OFFER_ACCEPTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viewing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "slotEnd" TIMESTAMP(3) NOT NULL,
    "status" "ViewingStatus" NOT NULL DEFAULT 'REQUESTED',

    CONSTRAINT "Viewing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "category" "PartnerCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "logoUrl" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "clickCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSlot" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "model" "AdModel" NOT NULL,
    "rateGBP" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerApplicantId" TEXT,
    "status" TEXT NOT NULL,
    "rawWebhookJson" JSONB,
    "passportCountry" TEXT,
    "crn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparableSale" (
    "id" TEXT NOT NULL,
    "postcodeDistrict" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "priceGBP" INTEGER NOT NULL,
    "soldDate" TIMESTAMP(3) NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LAND_REGISTRY',

    CONSTRAINT "ComparableSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_purpose_idx" ON "VerificationToken"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_complianceCode_key" ON "AgentProfile"("complianceCode");

-- CreateIndex
CREATE INDEX "AgentProfile_userId_idx" ON "AgentProfile"("userId");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_agentProfileId_idx" ON "Property"("agentProfileId");

-- CreateIndex
CREATE INDEX "Property_postcode_idx" ON "Property"("postcode");

-- CreateIndex
CREATE INDEX "Property_city_idx" ON "Property"("city");

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");

-- CreateIndex
CREATE INDEX "SyndicateProject_status_idx" ON "SyndicateProject"("status");

-- CreateIndex
CREATE INDEX "SyndicatePledge_projectId_idx" ON "SyndicatePledge"("projectId");

-- CreateIndex
CREATE INDEX "SyndicatePledge_investorUserId_idx" ON "SyndicatePledge"("investorUserId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "LedgerEntry_projectId_idx" ON "LedgerEntry"("projectId");

-- CreateIndex
CREATE INDEX "Enquiry_propertyId_idx" ON "Enquiry"("propertyId");

-- CreateIndex
CREATE INDEX "Enquiry_fromUserId_idx" ON "Enquiry"("fromUserId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "CaseStudy_agentProfileId_idx" ON "CaseStudy"("agentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Appraisal_agentProfileId_investorUserId_key" ON "Appraisal"("agentProfileId", "investorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_agentUserId_key" ON "Subscription"("agentUserId");

-- CreateIndex
CREATE INDEX "Offer_propertyId_idx" ON "Offer"("propertyId");

-- CreateIndex
CREATE INDEX "Viewing_propertyId_idx" ON "Viewing"("propertyId");

-- CreateIndex
CREATE INDEX "ChatMessage_propertyId_idx" ON "ChatMessage"("propertyId");

-- CreateIndex
CREATE INDEX "ChatMessage_toUserId_readAt_idx" ON "ChatMessage"("toUserId", "readAt");

-- CreateIndex
CREATE INDEX "KycRecord_userId_idx" ON "KycRecord"("userId");

-- CreateIndex
CREATE INDEX "ComparableSale_postcodeDistrict_soldDate_idx" ON "ComparableSale"("postcodeDistrict", "soldDate");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDistressTag" ADD CONSTRAINT "PropertyDistressTag_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyndicateProject" ADD CONSTRAINT "SyndicateProject_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyndicatePledge" ADD CONSTRAINT "SyndicatePledge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SyndicateProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyndicatePledge" ADD CONSTRAINT "SyndicatePledge_investorUserId_fkey" FOREIGN KEY ("investorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SyndicateProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestonePhoto" ADD CONSTRAINT "MilestonePhoto_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SyndicateProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_investorUserId_fkey" FOREIGN KEY ("investorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_agentUserId_fkey" FOREIGN KEY ("agentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessFee" ADD CONSTRAINT "SuccessFee_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessFee" ADD CONSTRAINT "SuccessFee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SyndicateProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSlot" ADD CONSTRAINT "AdSlot_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycRecord" ADD CONSTRAINT "KycRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================
-- Geospatial + full-text search (raw SQL — Prisma Unsupported)
-- ============================================================

-- GIST index for ST_DWithin / bbox queries (Sprint 3 SearchService).
CREATE INDEX "Property_location_gist" ON "Property" USING GIST ("location");

-- GIN index + trigger keeping searchVector in sync on write.
CREATE INDEX "Property_searchVector_gin" ON "Property" USING GIN ("searchVector");

-- Trigram index for fuzzy fallback matching on title/city.
CREATE INDEX "Property_title_trgm" ON "Property" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Property_city_trgm" ON "Property" USING GIN ("city" gin_trgm_ops);

CREATE OR REPLACE FUNCTION property_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."city", '') || ' ' || coalesce(NEW."region", '') || ' ' || coalesce(NEW."postcode", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "description", "city", "region", "postcode"
  ON "Property"
  FOR EACH ROW
  EXECUTE FUNCTION property_search_vector_update();
