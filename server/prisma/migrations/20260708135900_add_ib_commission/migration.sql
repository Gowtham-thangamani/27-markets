-- CreateTable
CREATE TABLE "IbCommission" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'deposit',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IbCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IbCommission_partnerId_idx" ON "IbCommission"("partnerId");
