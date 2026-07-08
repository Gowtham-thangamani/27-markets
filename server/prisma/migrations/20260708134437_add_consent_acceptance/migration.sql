-- CreateTable
CREATE TABLE "ConsentAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentAcceptance_userId_idx" ON "ConsentAcceptance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentAcceptance_userId_consentId_key" ON "ConsentAcceptance"("userId", "consentId");
