-- CreateTable
CREATE TABLE "AccountTypeConfig" (
    "id" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "spreadFrom" TEXT NOT NULL,
    "commission" TEXT NOT NULL,
    "leverage" TEXT NOT NULL,
    "minDeposit" INTEGER NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountTypeConfig_type_key" ON "AccountTypeConfig"("type");
