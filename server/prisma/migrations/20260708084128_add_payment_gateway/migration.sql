-- CreateEnum
CREATE TYPE "PaymentGatewayType" AS ENUM ('BANK', 'CRYPTO', 'CARD', 'EWALLET');

-- CreateTable
CREATE TABLE "PaymentGateway" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentGatewayType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "minAmount" INTEGER NOT NULL DEFAULT 0,
    "maxAmount" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGateway_pkey" PRIMARY KEY ("id")
);
