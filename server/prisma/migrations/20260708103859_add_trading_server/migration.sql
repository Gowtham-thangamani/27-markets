-- CreateTable
CREATE TABLE "TradingServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'MT5',
    "environment" TEXT NOT NULL DEFAULT 'LIVE',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingServer_pkey" PRIMARY KEY ("id")
);
