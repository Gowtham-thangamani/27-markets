-- AML screening results (sanctions / PEP / adverse-media).
CREATE TYPE "AmlScreeningStatus" AS ENUM ('CLEAR', 'REVIEW', 'HIT');

CREATE TABLE "AmlScreening" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AmlScreeningStatus" NOT NULL DEFAULT 'CLEAR',
    "provider" TEXT NOT NULL,
    "reference" TEXT,
    "hits" JSONB,
    "screenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmlScreening_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AmlScreening_userId_screenedAt_idx" ON "AmlScreening"("userId", "screenedAt");
CREATE INDEX "AmlScreening_status_idx" ON "AmlScreening"("status");

ALTER TABLE "AmlScreening" ADD CONSTRAINT "AmlScreening_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Automated-IDV correlation reference on the KYC profile.
ALTER TABLE "KycProfile" ADD COLUMN "providerRef" TEXT;
