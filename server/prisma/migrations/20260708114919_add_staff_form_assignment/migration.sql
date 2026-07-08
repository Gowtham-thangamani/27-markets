-- CreateTable
CREATE TABLE "StaffFormAssignment" (
    "id" TEXT NOT NULL,
    "kycFormId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffFormAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffFormAssignment_kycFormId_idx" ON "StaffFormAssignment"("kycFormId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffFormAssignment_kycFormId_staffId_key" ON "StaffFormAssignment"("kycFormId", "staffId");
