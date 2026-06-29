-- CreateEnum
CREATE TYPE "Mt5ConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'FAILED');

-- CreateTable
CREATE TABLE "Mt5Connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "mt5AccountId" TEXT,
    "status" "Mt5ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mt5Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mt5Connection_userId_key" ON "Mt5Connection"("userId");

-- AddForeignKey
ALTER TABLE "Mt5Connection" ADD CONSTRAINT "Mt5Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
