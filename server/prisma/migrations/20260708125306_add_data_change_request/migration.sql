-- CreateTable
CREATE TABLE "DataChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "currentValue" TEXT,
    "requestedValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataChangeRequest_status_idx" ON "DataChangeRequest"("status");

-- CreateIndex
CREATE INDEX "DataChangeRequest_userId_idx" ON "DataChangeRequest"("userId");
