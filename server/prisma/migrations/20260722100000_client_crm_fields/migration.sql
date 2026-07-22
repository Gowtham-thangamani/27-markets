-- CRM / sales-pipeline fields on User, surfaced in the IB "Referred Clients" table.
--
-- conversionStatus tracks a signed-up client's progress to a funded trader
-- (distinct from LeadStatus, which is pre-signup). convertedAt stamps the first
-- transition to CONVERTED. campaignCode is attribution captured at registration.
-- assignedAgentId is the sales agent/account manager, set by staff.

CREATE TYPE "ConversionStatus" AS ENUM ('NO_ANSWER', 'ON_BOARDING', 'CONVERTED', 'NOT_INTERESTED');

ALTER TABLE "User" ADD COLUMN "conversionStatus" "ConversionStatus" NOT NULL DEFAULT 'NO_ANSWER';
ALTER TABLE "User" ADD COLUMN "convertedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "campaignCode" TEXT;
ALTER TABLE "User" ADD COLUMN "assignedAgentId" TEXT;

CREATE INDEX "User_assignedAgentId_idx" ON "User"("assignedAgentId");

ALTER TABLE "User" ADD CONSTRAINT "User_assignedAgentId_fkey"
  FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: clients who have already funded are, by definition, converted.
UPDATE "User" u
SET "conversionStatus" = 'CONVERTED', "convertedAt" = COALESCE(u."convertedAt", now())
WHERE EXISTS (
  SELECT 1
  FROM "LedgerAccount" la
  JOIN "Posting" p ON p."ledgerAccountId" = la.id
  JOIN "JournalEntry" je ON je.id = p."journalEntryId"
  WHERE la."userId" = u.id
    AND p.direction = 'CREDIT'
    AND je.kind = 'DEPOSIT'
    AND je.status = 'POSTED'
);
