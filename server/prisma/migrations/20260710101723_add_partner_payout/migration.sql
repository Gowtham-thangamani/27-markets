-- CreateEnum
CREATE TYPE "PartnerPayoutStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- AlterTable
ALTER TABLE "IbCommission" ADD COLUMN     "payoutId" TEXT;

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "PartnerPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayout_reference_key" ON "PartnerPayout"("reference");

-- CreateIndex
CREATE INDEX "PartnerPayout_partnerId_idx" ON "PartnerPayout"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerPayout_status_idx" ON "PartnerPayout"("status");

-- CreateIndex
CREATE INDEX "IbCommission_payoutId_idx" ON "IbCommission"("payoutId");

-- AddForeignKey
ALTER TABLE "IbCommission" ADD CONSTRAINT "IbCommission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "PartnerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
