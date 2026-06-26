-- CreateTable
CREATE TABLE "WithdrawalDetail" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "swift" TEXT,
    "walletAddress" TEXT,
    "network" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalDetail_journalEntryId_key" ON "WithdrawalDetail"("journalEntryId");
