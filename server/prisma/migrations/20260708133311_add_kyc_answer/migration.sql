-- CreateTable
CREATE TABLE "KycAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycAnswer_userId_idx" ON "KycAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KycAnswer_userId_fieldId_key" ON "KycAnswer"("userId", "fieldId");
