-- CreateEnum
CREATE TYPE "EconomicImpact" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "EconomicEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "impact" "EconomicImpact" NOT NULL DEFAULT 'MEDIUM',
    "eventAt" TIMESTAMP(3) NOT NULL,
    "actual" TEXT,
    "forecast" TEXT,
    "previous" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomicEvent_enabled_eventAt_idx" ON "EconomicEvent"("enabled", "eventAt");

-- Seed a few sample upcoming events (relative to deploy time; admins manage the rest).
INSERT INTO "EconomicEvent" ("id","title","country","currency","impact","eventAt","forecast","previous","enabled","updatedAt") VALUES
  ('ec_nfp',   'Non-Farm Payrolls',            'US', 'USD', 'HIGH',   now() + interval '1 day'  + interval '13 hours', '180K',  '206K',  true, now()),
  ('ec_cpi',   'CPI (YoY)',                    'US', 'USD', 'HIGH',   now() + interval '2 days' + interval '13 hours', '3.1%',  '3.3%',  true, now()),
  ('ec_ecb',   'ECB Interest Rate Decision',   'EU', 'EUR', 'HIGH',   now() + interval '3 days' + interval '12 hours', '4.25%', '4.25%', true, now()),
  ('ec_boe',   'BoE Interest Rate Decision',   'GB', 'GBP', 'MEDIUM', now() + interval '4 days' + interval '11 hours', '5.00%', '5.00%', true, now()),
  ('ec_retail','Retail Sales (MoM)',           'US', 'USD', 'MEDIUM', now() + interval '5 days' + interval '13 hours', '0.3%',  '0.1%',  true, now())
ON CONFLICT ("id") DO NOTHING;
