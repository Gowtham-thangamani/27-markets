-- Multi-level (2-tier) IB referral network.
--
-- PartnerProfile gains an upline pointer so a partner can be introduced by
-- another partner; IbCommission gains `level` so one deposit can credit both
-- the direct referrer (1) and their upline (2). Existing commissions are
-- level 1 by definition — the default backfills them correctly.

ALTER TABLE "PartnerProfile" ADD COLUMN "parentPartnerId" TEXT;
CREATE INDEX "PartnerProfile_parentPartnerId_idx" ON "PartnerProfile"("parentPartnerId");
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_parentPartnerId_fkey"
  FOREIGN KEY ("parentPartnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IbCommission" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "PartnerApplication" ADD COLUMN "referredByPartnerId" TEXT;
ALTER TABLE "PartnerApplication" ADD CONSTRAINT "PartnerApplication_referredByPartnerId_fkey"
  FOREIGN KEY ("referredByPartnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Level-2 (indirect) commission rate, seeded OFF at 0.
--
-- At 0 the upline walk finds no rate and skips level 2, so behaviour is exactly
-- as before this migration: only the direct referrer earns. Raise it in admin
-- settings to switch tiered payouts on — deliberately a business decision, not
-- a deploy side effect. Idempotent; safe in every environment.
INSERT INTO "AppSetting" ("id", "key", "label", "value", "group", "sortOrder", "updatedAt")
VALUES (
  'set_ib_commission_pct_l2',
  'ib_commission_pct_l2',
  'IB sub-partner commission (% of deposits, level 2)',
  '0',
  'Partners',
  1,
  now()
)
ON CONFLICT ("key") DO NOTHING;
